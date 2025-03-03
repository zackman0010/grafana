import { css } from '@emotion/css';
import { AIMessageChunk, HumanMessage } from '@langchain/core/messages';
import ReactTextareaAutocomplete from '@webscopeio/react-textarea-autocomplete';
import { useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { IconButton, LoadingBar, useStyles2, TextArea } from '@grafana/ui';

import { agent } from '../agent/agent';
import { toolsByName } from '../agent/tools';
import { dataProvider } from '../agent/tools/context/autocomplete';

import { DashMessages } from './DashMessages';
import { getMessages } from './utils';

import '@webscopeio/react-textarea-autocomplete/style.css';

interface DashInputState extends SceneObjectState {
  message: string;
}

export class DashInput extends SceneObjectBase<DashInputState> {
  public static Component = DashInputRenderer;

  public messages?: DashMessages;
  private _inputRef: HTMLTextAreaElement | null = null;

  public constructor(state: Partial<Pick<DashInputState, 'message'>>) {
    super({ ...state, message: state.message ?? '' });

    this.addActivationHandler(() => this._activationHandler());
  }

  private _activationHandler() {
    this.messages = getMessages(this);
  }

  public setInputRef(ref: HTMLTextAreaElement | null) {
    this._inputRef = ref;
  }

  public focus() {
    this._inputRef?.focus();
  }

  public blur() {
    this._inputRef?.blur();
  }

  public updateMessage(message: string, isUserInput: boolean) {
    if (!isUserInput) {
      this._inputRef?.focus();
    }

    this.setState({ message });
  }

  public async sendMessage() {
    const message = this.state.message.trim();

    if (!message) {
      return;
    }

    this.messages?.setLoading(true);
    this.updateMessage('', false);
    const userMessage = this.messages?.addUserMessage(message);

    //todo(cyriltovena): We should add a system message to ask LLM to check if we need to find a metrics name.
    // If yes, we should fork the conversation to a new thread to first find the metrics name and potentially labels selectors.
    // This will allow us to reduce the main conversation size, and drop any tool results that are not relevant anymore.
    // This is basically what we call starting a new langchain !

    // In this discovery metrics conversation, we should teach LLM to use selector to find metrics
    //  aka count by (__name__)({pod=pod-123}) which returns less broad results than label/__name__/values api calls.
    // May be a good workflow
    // 1. find label names that are revelant.
    // 2. find relevant values for these labels.
    // 3. verify if the metrics is a popular one, if yes, see if it exits and get labels names. match[]=<series_selector>
    // 4. try to find metrics names that are relevant for these values via instant query count by (__name__)({namespace="loki-dev-005"}) using regex.
    // 5. try to find metrics name using label/__name__/values

    try {
      this.messages?.addLangchainMessage(new HumanMessage({ content: message, id: userMessage?.state.key! }));
      const aiMessage = await agent.invoke(this.messages?.state.langchainMessages!);
      this.messages?.addAiMessage(aiMessage.content);
      this.messages?.addLangchainMessage(aiMessage);
      await this._handleToolCalls(aiMessage);
    } catch (error) {
      this.messages?.addSystemMessage('Sorry, there was an error processing your request. Please try again.');
    } finally {
      this.messages?.setLoading(false);
    }
  }

  private async _handleToolCalls(aiMessage: AIMessageChunk, callCount = 0, maxCalls = 20) {
    if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0 || callCount >= maxCalls) {
      return;
    }

    for (const toolCall of aiMessage.tool_calls) {
      const selectedTool = toolsByName[toolCall.name];
      if (selectedTool) {
        const toolMessage = await selectedTool.invoke(toolCall);
        this.messages?.addLangchainMessage(toolMessage);
        const nextAiMessage = await agent.invoke(this.messages?.state.langchainMessages!);
        this.messages?.addAiMessage(nextAiMessage.content);
        this.messages?.addLangchainMessage(nextAiMessage);
        await this._handleToolCalls(nextAiMessage, callCount + 1, maxCalls);
      }
    }
  }
}

function DashInputRenderer({ model }: SceneComponentProps<DashInput>) {
  const styles = useStyles2(getStyles);
  const { message } = model.useState();
  const { loading } = model.messages!.useState();
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.container} ref={containerRef}>
      {loading && <LoadingBar width={containerRef.current?.getBoundingClientRect().width ?? 0} />}

      <div className={styles.row}>
        <ReactTextareaAutocomplete
          containerClassName={styles.textArea}
          autoFocus
          loadingComponent={() => <span>Connecting to the mothership</span>}
          trigger={{
            '@': {
              dataProvider,
              // @ts-expect-error
              component: Item,
              output: (item, trigger = '') => { return trigger + item; }
            },
          }}
          minChar={0}
          textAreaComponent={TextArea}
          innerRef={(ref) => model.setInputRef(ref)}
          value={message}
          readOnly={loading}
          placeholder="Type your message here"
          onChange={(evt) => model.updateMessage(evt.target.value, true)}
          onKeyDown={(evt) => {
            switch (evt.key) {
              case 'Enter':
                if (!evt.shiftKey) {
                  evt.preventDefault();
                  evt.stopPropagation();
                  model.sendMessage();
                }
                break;

              case 'ArrowUp':
                evt.preventDefault();
                evt.stopPropagation();
                getMessages(model).enterSelectMode();
                break;
            }
          }}
          itemClassName={styles.autoCompleteListItem}
          listClassName={styles.autoCompleteList}
        />

        <IconButton
          size="xl"
          name="play"
          aria-label="Send message"
          disabled={loading}
          onClick={() => model.sendMessage()}
        />
      </div>
    </div>
  );
}
const Item = ({ entity }: { entity: string }) => <div>{entity}</div>;

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'flex',
    flexDirection: 'column',
    background: theme.colors.background.elevated,
    borderTop: `1px solid ${theme.colors.border.medium}`,
  }),
  row: css({
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(2),
    padding: theme.spacing(2),
  }),
  textArea: css({
    flexGrow: 1,
    fontSize: theme.typography.fontSize,
  }),
  autoCompleteList: css({
    border: `1px solid ${theme.colors.border.medium}`,
    background: theme.colors.background.secondary,
    '& .rta__entity': {
      background: theme.colors.background.secondary,
      color: theme.colors.text.primary,
    },
    '& .rta__entity--selected': {
      background: theme.colors.background.canvas,
    },
  }),
  autoCompleteListItem: css({
    border: `1px solid ${theme.colors.border.medium}`,
    background: theme.colors.background.secondary,
    '&:not(:last-child)': {
      border: `1px solid ${theme.colors.border.medium}`,
      background: theme.colors.background.secondary,
    },
  }),
});
