import { css } from '@emotion/css';
import { AIMessageChunk, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { IconButton, LoadingBar, useStyles2 } from '@grafana/ui';

import { getAgent } from '../../agent/agent';
import { toolsByName } from '../../agent/tools';
import { getChat, getDash, getMessages } from '../utils';

import { Input } from './Input';
import { Logger } from './Logger';
import { Speech, SpeechState } from './Speech';

interface DashInputState extends SceneObjectState {
  logger: Logger;
  message: string;
  speech: Speech;
}

export class DashInput extends SceneObjectBase<DashInputState> {
  public static Component = DashInputRenderer;

  private _inputRef: HTMLTextAreaElement | null = null;

  private _abortController: AbortController | null = null;

  private _agentConfig = getAgent();
  private _currentAgent = this._agentConfig.withTools(this._agentConfig.tools);

  public constructor(state: Partial<Pick<DashInputState, 'message'> & Pick<SpeechState, 'listening'>>) {
    super({
      ...state,
      logger: new Logger(),
      message: state.message ?? '',
      speech: new Speech({ listening: state.listening ?? false }),
    });
  }

  public recreateAgent() {
    this._currentAgent = this._agentConfig.withTools(this._agentConfig.tools);
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

  public cancelRequest() {
    this._abortController?.abort();
    this._abortController = null;
    getMessages(this).setLoading(false);
    this.updateMessage('', false);
    this.state.speech.resume();
    getMessages(this).addSystemMessage('Canceled by user', true);
  }

  private async _generateTitleSummary(userMessage: string): Promise<string> {
    try {
      // Create a system message with instructions for generating a title
      const systemMessage = new SystemMessage({
        content:
          "Generate a concise title (maximum 20 characters) that summarizes the user's message. The title should be descriptive but brief. Return only the title text with no additional formatting or explanation.",
      });

      // Create a human message with the user's input
      const humanMessage = new HumanMessage({
        content: userMessage,
      });

      // Make a separate LLM call with just these two messages
      const titleGenerator = this._agentConfig.llm.bind({});
      const titleResponse = await titleGenerator.invoke([systemMessage, humanMessage]);

      // Extract and clean the title
      let title = titleResponse.content.toString().trim();

      // Ensure the title isn't too long
      if (title.length > 20) {
        title = title.substring(0, 17) + '...';
      }

      console.log('Generated title:', title);
      return title;
    } catch (error) {
      console.error('Error generating title:', error);
      // Return a fallback title if generation fails
      return 'Chat ' + new Date().toLocaleTimeString();
    }
  }

  private _updateChatTitle(title: string) {
    try {
      // Get the Dash instance
      const dash = getDash(this);
      if (!dash) {
        console.error('Could not find Dash instance');
        return;
      }

      // Get the current chat container
      const currentChatIndex = dash.state.chatIndex;
      const chatContainer = dash.state.chats[currentChatIndex];

      if (chatContainer) {
        // Update the chat container's name using the setName method
        chatContainer.setName(title);
      }
    } catch (error) {
      console.error('Error updating chat title:', error);
    }
  }

  public async sendMessage() {
    const message = this.state.message.trim();

    if (!message) {
      return;
    }

    this._abortController?.abort();
    this._abortController = new AbortController();

    console.log('\n👤 User Message:', message);
    getMessages(this).setLoading(true);
    this.state.speech.pause();

    const userMessage = getMessages(this).addUserMessage(message);
    const isFirstMessage = getMessages(this).state.messages.length === 1;
    const hasDefaultName = getChat(this).state.name.startsWith('Chat ') ?? false;

    try {
      getMessages(this).addLangchainMessage(new HumanMessage({ content: message, id: userMessage.state.key }));
      this.state.logger.logMessagesToLLM(getMessages(this).state.langchainMessages);

      if (isFirstMessage && hasDefaultName) {
        const titleSummary = await this._generateTitleSummary(message);
        this._updateChatTitle(titleSummary);
      }

      const aiMessage = await this._currentAgent.invoke(getMessages(this).state.langchainMessages, {
        signal: this._abortController.signal,
      });
      this.state.logger.logAIMessage(aiMessage.content);
      getMessages(this).addAiMessage(aiMessage.content);
      getMessages(this).addLangchainMessage(aiMessage);
      await this._handleToolCalls(aiMessage);
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
        return;
      }

      console.error('\n❌ Error:', error.message || 'Unknown error occurred');
      getMessages(this).addSystemMessage(error.message || 'Unknown error occurred', false, true);
    } finally {
      getMessages(this).setLoading(false);
      this._abortController = null;
      this.updateMessage('', false);
      this.state.speech.resume();
    }
  }

  private async _handleToolCalls(aiMessage: AIMessageChunk, callCount = 0, maxCalls = 20) {
    if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0 || callCount >= maxCalls) {
      return;
    }

    for (const toolCall of aiMessage.tool_calls) {
      if (this._abortController?.signal.aborted) {
        return;
      }

      console.log('\n🛠️ Tool Call:', {
        name: toolCall.name,
        type: 'tool_notification',
      });

      const selectedTool = toolsByName[toolCall.name];

      if (selectedTool) {
        getMessages(this).setToolWorking(toolCall.id, true);

        let toolResponse;
        try {
          try {
            toolResponse = await selectedTool.invoke(toolCall);
          } catch (err: unknown) {
            console.error(`Tool ${toolCall.name} failed:`, err);
            const message = err instanceof Error ? err.message : String(err);
            toolResponse = new ToolMessage({
              tool_call_id: toolCall.id ?? '1',
              content: `An error occurred while executing the tool: ${message}`,
            });
            getMessages(this).setToolError(toolCall.id, message);
          }

          getMessages(this).setToolWorking(toolCall.id, false);

          if (this._abortController?.signal.aborted) {
            return;
          }

          console.log('\n📥 Tool Response:', {
            content: toolResponse.content,
            type: 'tool_response',
          });
          getMessages(this).addLangchainMessage(toolResponse);
          this.state.logger.logMessagesToLLM(getMessages(this).state.langchainMessages!);

          try {
            const nextAiMessage = await this._currentAgent.invoke(getMessages(this).state.langchainMessages!, {
              signal: this._abortController?.signal,
            });

            if (this._abortController?.signal.aborted) {
              return;
            }

            this.state.logger.logAIMessage(nextAiMessage.content, 'tool');
            getMessages(this).addAiMessage(nextAiMessage.content);
            getMessages(this).addLangchainMessage(nextAiMessage);
            await this._handleToolCalls(nextAiMessage, callCount + 1, maxCalls);
          } catch (error) {
            throw error;
          }
        } catch (error: unknown) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('Request was cancelled during tool execution');
            getMessages(this).setToolWorking(toolCall.id, false);
            return;
          }

          getMessages(this).setToolError(
            toolCall.id,
            error instanceof Error ? error.message : 'An error occurred while executing the tool'
          );
          getMessages(this).setToolWorking(toolCall.id, false);
          getMessages(this).addSystemMessage(
            error instanceof Error ? error.message : 'An error occurred while executing the tool',
            false,
            true
          );
          console.error(`Tool ${toolCall.name} failed:`, error);
        }
      }
    }
  }
}

function DashInputRenderer({ model }: SceneComponentProps<DashInput>) {
  const styles = useStyles2(getStyles);
  const { message, speech } = model.useState();
  const { listening } = speech.useState();
  const { loading, anyToolsWorking } = getMessages(model).useState();
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.container} ref={containerRef}>
      {loading && !anyToolsWorking && <LoadingBar width={containerRef.current?.getBoundingClientRect().width ?? 0} />}
      <div className={styles.row}>
        <speech.Component model={speech} />

        <Input
          listening={listening}
          loading={loading}
          message={message}
          ref={(ref) => model.setInputRef(ref)}
          onCancelRequest={() => model.cancelRequest()}
          onEnterSelectMode={() => getMessages(model).enterSelectMode()}
          onSendMessage={() => model.sendMessage()}
          onUpdateMessage={(message) => model.updateMessage(message, true)}
        />

        <IconButton
          size="xl"
          name={loading ? 'times' : 'play'}
          aria-label={loading ? 'Cancel request' : 'Send message'}
          onClick={() => (loading ? model.cancelRequest() : model.sendMessage())}
        />
      </div>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    label: 'dash-input-container',
    display: 'flex',
    flexDirection: 'column',
    background: theme.colors.background.elevated,
    borderTop: `1px solid ${theme.colors.border.medium}`,
  }),
  row: css({
    label: 'dash-input-row',
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(2),
    padding: theme.spacing(2),
  }),
});
