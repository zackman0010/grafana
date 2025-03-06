import { css } from '@emotion/css';
import { AIMessageChunk, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { getAppEvents, ToolAddedEvent } from '@grafana/runtime';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { IconButton, LoadingBar, useStyles2 } from '@grafana/ui';

import { getAgent } from '../../agent/agent';
import { generateSystemPrompt } from '../../agent/systemPrompt';
import { toolsByName } from '../../agent/tools';
import { Tool } from '../DashMessage/Tool';
import { getChat, getDash, getMessages, getSettings } from '../utils';

import { Input } from './Input';
import { Logger } from './Logger';
import { Speech, SpeechState } from './Speech';
import { TextToSpeech } from './TextToSpeech';

interface DashInputState extends SceneObjectState {
  logger: Logger;
  message: string;
  speech: Speech;
  textToSpeech: TextToSpeech;
}

export class DashInput extends SceneObjectBase<DashInputState> {
  public static Component = DashInputRenderer;

  private _inputRef: HTMLTextAreaElement | null = null;

  private _abortController: AbortController | null = null;

  private _agentConfig = getAgent();
  private _currentAgent = this._agentConfig.withTools(this._agentConfig.tools);

  // Helper function to extract token information from various response formats
  private _extractTokenInfo(response: any): number | null {
    return response.response_metadata?.usage?.input_tokens ?? null;
  }

  private _removeToolAndMessage(toolId: string) {
    const messages = getMessages(this);

    // Remove the tool from messages
    messages.state.messages.forEach((message) => {
      const updatedChildren = message.state.children.filter((child) => {
        if (child instanceof Tool && child.state.content.id === toolId) {
          return false;
        }
        return true;
      });
      message.setState({ children: updatedChildren });
    });

    // Create a new message history without the interrupted tool's messages
    const langchainMessages = messages.state.langchainMessages;
    const newMessages = [];
    let skipNextAiMessage = false;

    for (let i = 0; i < langchainMessages.length; i++) {
      const msg = langchainMessages[i];

      // Skip tool use message and its result
      if (msg instanceof AIMessageChunk && msg.tool_calls?.some((tc) => tc.id === toolId)) {
        skipNextAiMessage = true;
        continue;
      }

      // Skip the next AI message if we found a tool use message
      if (skipNextAiMessage && msg instanceof AIMessageChunk) {
        skipNextAiMessage = false;
        continue;
      }

      // Skip tool result message
      if (msg instanceof ToolMessage && msg.tool_call_id === toolId) {
        continue;
      }

      newMessages.push(msg);
    }

    // Update the message history using proper state management
    messages.setState({ langchainMessages: newMessages });

    // Add a cancellation result through LangChain's proper channel
    const cancelResult = new ToolMessage({
      tool_call_id: toolId,
      content: JSON.stringify({ status: 'cancelled', message: 'Operation cancelled by user' }),
    });
    messages.addLangchainMessage(cancelResult);

    // Update loading state if no more tools are working
    const anyToolsStillWorking = messages.state.messages.some((message) => message.hasWorkingTools());
    if (!anyToolsStillWorking) {
      messages.setToolWorking(undefined, false);
    }
  }

  public constructor(state: Partial<Pick<DashInputState, 'message'> & Pick<SpeechState, 'listening'>>) {
    super({
      ...state,
      logger: new Logger(),
      message: state.message ?? '',
      speech: new Speech({ listening: state.listening ?? false }),
      textToSpeech: new TextToSpeech({ speaking: false, canSpeak: false }),
    });

    const handle = window.setInterval(() => {
      const events = getAppEvents();
      if (events) {
        events.getStream(ToolAddedEvent).subscribe(() => {
          this.recreateAgent();
        });
        window.clearInterval(handle);
      }
    }, 500);
  }

  public recreateAgent() {
    this._currentAgent = this._agentConfig.withTools(getAgent().tools);
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

  public selectText() {
    if (this._inputRef) {
      this._inputRef.select();
    }
  }

  public async cancelRequest() {
    // Find any working tools and mark them as cancelled
    const messages = getMessages(this);
    messages.state.messages.forEach((message) => {
      message.state.children.forEach((child) => {
        if (child instanceof Tool && child.state.working) {
          this._removeToolAndMessage(child.state.content.id);
        }
      });
    });

    // If we have an abort controller, abort it
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }

    // Remove the last AI message that was processing the tool
    if (messages.state.messages.length > 0) {
      const lastMessage = messages.state.messages[messages.state.messages.length - 1];
      if (lastMessage.state.sender === 'ai') {
        messages.state.messages.pop();
      }
    }

    messages.setLoading(false);
    this.state.speech.resume();
    this.state.textToSpeech.stop();
    this.updateMessage('', false);
  }

  private _updateSystemPrompt() {
    const messages = getMessages(this);
    const newSystemPrompt = generateSystemPrompt();
    if (messages.state.langchainMessages.length > 0 && messages.state.langchainMessages[0] instanceof SystemMessage) {
      messages.state.langchainMessages[0] = newSystemPrompt[0];
    }
  }

  public async interruptAndSendMessage() {
    const message = this.state.message.trim();
    if (!message) {
      return;
    }

    // Store the message before canceling the request
    const messageToSend = message;

    if (this._abortController) {
      await this.cancelRequest();
      // Wait a tick to ensure state updates are processed
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Clear the input before starting new message
    this.updateMessage('', false);

    // Normal flow for new messages
    this._abortController = new AbortController();
    const messageWithTimeTag = `${messageToSend}\n<time>${new Date().getTime()}</time>`;
    console.log('\n👤 User Message:', messageWithTimeTag);
    getMessages(this).setLoading(true);
    this.state.speech.pause();

    const userMessage = getMessages(this).addUserMessage(messageToSend);
    const isFirstMessage =
      getMessages(this).state.messages.filter((message) => message.state.sender === 'user').length === 1;
    const hasDefaultName = getChat(this).state.name.startsWith('Chat ') ?? false;

    try {
      getMessages(this).addLangchainMessage(
        new HumanMessage({ content: messageWithTimeTag, id: userMessage.state.key })
      );
      this._updateSystemPrompt();
      this.state.logger.logMessagesToLLM(getMessages(this).state.langchainMessages);

      if (isFirstMessage && hasDefaultName) {
        const titleSummary = await this._generateTitleSummary(messageToSend);
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
      this.state.speech.resume();
      this._inputRef?.focus();
    }
  }

  public async sendMessage() {
    const message = this.state.message.trim();
    if (!message) {
      return;
    }

    // Normal flow for new messages
    this._abortController = new AbortController();
    const messageWithTimeTag = `${message}\n<time>${new Date().getTime()}</time>`;
    console.log('\n👤 User Message:', messageWithTimeTag);
    getMessages(this).setLoading(true);
    this.state.speech.pause();

    const userMessage = getMessages(this).addUserMessage(message);
    const isFirstMessage =
      getMessages(this).state.messages.filter((message) => message.state.sender === 'user').length === 1;
    const hasDefaultName = getChat(this).state.name.startsWith('Chat ') ?? false;

    try {
      getMessages(this).addLangchainMessage(
        new HumanMessage({ content: messageWithTimeTag, id: userMessage.state.key })
      );
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
      this.state.speech.resume();
      this._inputRef?.focus();
    }
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
      const dash = getDash(this);
      dash.state.chats[dash.state.chatIndex].setName(title);
    } catch (error) {
      console.error('Error updating chat title:', error);
    }
  }

  private async _handleToolCalls(aiMessage: AIMessageChunk, callCount = 0, maxCalls = 20) {
    if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0 || callCount >= maxCalls) {
      // Speak the AI message if text-to-speech is enabled
      if (this.state.textToSpeech.state.canSpeak) {
        const content = typeof aiMessage.content === 'string' ? aiMessage.content : JSON.stringify(aiMessage.content);
        this.state.textToSpeech.speak(content);
      }
      return;
    }

    for (const toolCall of aiMessage.tool_calls) {
      if (this._abortController?.signal.aborted) {
        this._removeToolAndMessage(toolCall.id ?? '');
        return;
      }

      console.log('\n🛠️ Tool Call:', {
        name: toolCall.name,
        type: 'tool_notification',
      });

      const selectedTool = toolsByName[toolCall.name];

      if (selectedTool) {
        getMessages(this).setToolWorking(toolCall.id, true);

        let toolResponse: ToolMessage;
        try {
          try {
            toolResponse = await selectedTool.invoke(toolCall);
          } catch (err: unknown) {
            if (this._abortController?.signal.aborted) {
              this._removeToolAndMessage(toolCall.id ?? '');
              return;
            }
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
            this._removeToolAndMessage(toolCall.id ?? '');
            return;
          }

          console.log('\n📥 Tool Response:', {
            content: toolResponse.content,
            type: 'tool_response',
          });

          // Set the tool's output
          getMessages(this).state.messages.forEach((message) => {
            message.state.children.forEach((child) => {
              if (child instanceof Tool) {
                const tool = child as Tool;
                if (tool.state.content.id === toolCall.id) {
                  try {
                    const output = JSON.parse(toolResponse.content as string);
                    tool.setOutput(output);
                  } catch (e) {
                    // If the response isn't JSON, set it as a string
                    tool.setOutput({ result: toolResponse.content as string });
                  }
                }
              }
            });
          });

          getMessages(this).addLangchainMessage(toolResponse);
          if (toolResponse.artifact) {
            getMessages(this).addArtifact(toolResponse.artifact);
          }
          this._updateSystemPrompt();
          this.state.logger.logMessagesToLLM(getMessages(this).state.langchainMessages!);

          try {
            const nextAiMessage = await this._currentAgent.invoke(getMessages(this).state.langchainMessages!, {
              signal: this._abortController?.signal,
            });

            if (this._abortController?.signal.aborted) {
              this._removeToolAndMessage(toolCall.id ?? '');
              return;
            }

            this.state.logger.logAIMessage(nextAiMessage.content, 'tool');
            getMessages(this).addAiMessage(nextAiMessage.content);
            getMessages(this).addLangchainMessage(nextAiMessage);

            // Update token usage if available in the response
            const toolInputTokens = this._extractTokenInfo(nextAiMessage);
            if (toolInputTokens !== null) {
              const settings = getSettings(this);
              settings.updateInputTokens(toolInputTokens);
            }

            await this._handleToolCalls(nextAiMessage, callCount + 1, maxCalls);
          } catch (error) {
            throw error;
          }
        } catch (error: unknown) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('Request was cancelled during tool execution');
            getMessages(this).setToolWorking(toolCall.id, false);
            this._removeToolAndMessage(toolCall.id ?? '');
            return;
          }

          getMessages(this).setToolError(
            toolCall.id,
            error instanceof Error ? error.message : 'An error occurred while executing the tool'
          );
          getMessages(this).setToolWorking(toolCall.id, false);
          console.error(`Tool ${toolCall.name} failed:`, error);
          this._removeToolAndMessage(toolCall.id ?? '');
        }
      }
    }
  }
}

function DashInputRenderer({ model }: SceneComponentProps<DashInput>) {
  const styles = useStyles2(getStyles);
  const { message, speech, textToSpeech } = model.useState();
  const { listening } = speech.useState();
  const { speaking } = textToSpeech.useState();
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
          onInterruptAndSend={() => model.interruptAndSendMessage()}
        />

        <IconButton
          size="xl"
          name={loading ? 'times' : 'message'}
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
