import { css } from '@emotion/css';
import { AIMessageChunk, HumanMessage } from '@langchain/core/messages';
import ReactTextareaAutocomplete from '@webscopeio/react-textarea-autocomplete';
import { useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { IconButton, LoadingBar, useStyles2, TextArea } from '@grafana/ui';

import { agent } from '../agent/agent';
import { toolsByName } from '../agent/tools';
import { dataProvider, getProviderTriggers } from '../agent/tools/context/autocomplete';

import { Tool } from './DashMessage/Tool';
import { DashMessages } from './DashMessages';
import { getMessages } from './utils';

import '@webscopeio/react-textarea-autocomplete/style.css';

interface DashInputState extends SceneObjectState {
  message: string;
  isListening: boolean;
}

// Add type definitions for Speech Recognition API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export class DashInput extends SceneObjectBase<DashInputState> {
  public static Component = DashInputRenderer;

  public messages?: DashMessages;
  private _inputRef: HTMLTextAreaElement | null = null;
  private _recognition: SpeechRecognition | null = null;

  public constructor(state: Partial<Pick<DashInputState, 'message' | 'isListening'>>) {
    super({
      ...state,
      message: state.message ?? '',
      isListening: state.isListening ?? false,
    });

    this.addActivationHandler(() => this._activationHandler());
  }

  private _activationHandler() {
    this.messages = getMessages(this);
    this._initializeSpeechRecognition();
  }

  private _initializeSpeechRecognition() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this._recognition = new SpeechRecognition();
      this._recognition.continuous = true;
      this._recognition.interimResults = false;
      this._recognition.lang = 'en-US';

      this._recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Get the last result from the results array
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript;

        // Update message and send it
        this.updateMessage(transcript, true);
        this.sendMessage();
      };

      this._recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        this.setState({ isListening: false });
      };
    }
  }

  public toggleSpeechRecognition() {
    if (!this._recognition) {
      return;
    }

    if (this.state.isListening) {
      this._recognition.stop();
      this.setState({ isListening: false });
    } else {
      this.setState({ isListening: true });
      this._recognition.start();
    }
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

    console.log('User message:', message);
    this.messages?.setLoading(true);

    // Pause listening while processing
    if (this.state.isListening && this._recognition) {
      this._recognition.stop();
    }

    // Store the message before we clear it
    const messageToSend = message;
    const userMessage = this.messages?.addUserMessage(messageToSend);

    try {
      this.messages?.addLangchainMessage(new HumanMessage({ content: messageToSend, id: userMessage?.state.key! }));
      const aiMessage = await agent.invoke(this.messages?.state.langchainMessages!);
      console.log('AI response:', aiMessage.content);
      this.messages?.addAiMessage(aiMessage.content);
      this.messages?.addLangchainMessage(aiMessage);
      await this._handleToolCalls(aiMessage);
    } catch (error) {
      console.error('Error processing message:', error);
      this.messages?.addSystemMessage('Sorry, there was an error processing your request. Please try again.');
    } finally {
      this.messages?.setLoading(false);
      // Clear the message only after we've successfully processed it
      this.updateMessage('', false);
      // Resume listening if we were listening before
      if (this.state.isListening && this._recognition) {
        this._recognition.start();
      }
    }
  }

  private async _handleToolCalls(aiMessage: AIMessageChunk, callCount = 0, maxCalls = 20) {
    if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0 || callCount >= maxCalls) {
      return;
    }

    for (const toolCall of aiMessage.tool_calls) {
      console.log('Tool call:', {
        name: toolCall.name,
        type: 'tool_notification',
      });
      const selectedTool = toolsByName[toolCall.name];
      if (selectedTool) {
        // Find the tool in the messages and set it to working
        const toolMessage = this.messages?.state.messages.find((message) => {
          return message.state.children.some((child) => {
            if (child instanceof Tool) {
              return (child.state as any).content.id === toolCall.id;
            }
            return false;
          });
        });
        if (toolMessage) {
          const tool = toolMessage.state.children.find((child) => child instanceof Tool) as Tool;
          if (tool) {
            tool.setWorking(true);
          }
        }

        try {
          const toolResponse = await selectedTool.invoke(toolCall);
          console.log('Tool response:', {
            content: toolResponse.content,
            type: 'tool_response',
          });
          this.messages?.addLangchainMessage(toolResponse);
          const nextAiMessage = await agent.invoke(this.messages?.state.langchainMessages!);
          console.log('Next AI response after tool:', nextAiMessage.content);
          this.messages?.addAiMessage(nextAiMessage.content);
          this.messages?.addLangchainMessage(nextAiMessage);
          await this._handleToolCalls(nextAiMessage, callCount + 1, maxCalls);
        } finally {
          // Set the tool back to not working
          if (toolMessage) {
            const tool = toolMessage.state.children.find((child) => child instanceof Tool) as Tool;
            if (tool) {
              tool.setWorking(false);
            }
          }
        }
      }
    }
  }

  public componentWillUnmount() {
    if (this._recognition) {
      this._recognition.stop();
    }
  }
}

function DashInputRenderer({ model }: SceneComponentProps<DashInput>) {
  const styles = useStyles2(getStyles);
  const { message, isListening } = model.useState();
  const { loading } = model.messages!.useState();
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if any tool is currently working
  const isToolWorking = model.messages?.state.messages.some((message) => {
    return message.state.children.some((child) => {
      if (child instanceof Tool) {
        return (child.state as any).working;
      }
      return false;
    });
  });

  return (
    <div className={styles.container} ref={containerRef}>
      {loading && !isToolWorking && <LoadingBar width={containerRef.current?.getBoundingClientRect().width ?? 0} />}
      <div className={styles.row}>
        <IconButton
          size="xl"
          name="record-audio"
          aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          disabled={loading}
          onClick={() => model.toggleSpeechRecognition()}
          className={isListening ? styles.listening : undefined}
        />

        <ReactTextareaAutocomplete<string>
          containerClassName={styles.textArea}
          autoFocus={true}
          loadingComponent={() => <span>Connecting to the mothership</span>}
          trigger={{
            ...getProviderTriggers(Item),
            '@': {
              dataProvider,
              component: Item,
              output: (item, trigger = '') => ({ text: trigger + item.toString(), caretPosition: 'end' }),
              afterWhitespace: false,
            },
          }}
          minChar={0}
          textAreaComponent={TextArea}
          innerRef={(ref) => model.setInputRef(ref)}
          value={message}
          readOnly={loading}
          placeholder="Ask me anything about your data."
          onChange={(evt: any) => model.updateMessage(evt.target.value, true)}
          onKeyDown={(evt: any) => {
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
  recordButton: css({
    width: '40px',
    height: '40px',
    padding: 0,
    borderRadius: '50%',
    backgroundColor: theme.colors.error.main,
    '& svg': {
      display: 'none',
    },
  }),
  listening: css({
    position: 'relative',
    color: theme.colors.warning.main,
    '& svg': {
      opacity: 0.4,
    },
    '&:hover svg': {
      opacity: 0.4,
    },
    '&::before, &::after': {
      content: '""',
      position: 'absolute',
      top: '50%',
      left: '50%',
      borderRadius: '50%',
      opacity: 0.2,
    },
    '&::before': {
      width: '28px',
      height: '28px',
      marginTop: '-14px',
      marginLeft: '-14px',
      backgroundColor: theme.colors.warning.main,
    },
    '&::after': {
      width: '42px',
      height: '42px',
      marginTop: '-21px',
      marginLeft: '-21px',
      background: `radial-gradient(circle, ${theme.colors.warning.main} 0%, transparent 70%)`,
      animation: 'pulse 2s ease-in-out infinite',
    },
    '&:hover::before, &:hover::after': {
      opacity: 0.2,
    },
    '@keyframes pulse': {
      '0%': {
        opacity: 0.2,
        transform: 'scale(1)',
      },
      '50%': {
        opacity: 0.4,
        transform: 'scale(1.1)',
      },
      '100%': {
        opacity: 0.2,
        transform: 'scale(1)',
      },
    },
  }),
});
