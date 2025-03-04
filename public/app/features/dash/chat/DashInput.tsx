import { css } from '@emotion/css';
import { AIMessageChunk, HumanMessage, MessageContent, SystemMessage } from '@langchain/core/messages';
import ReactTextareaAutocomplete from '@webscopeio/react-textarea-autocomplete';
import { useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { IconButton, LoadingBar, useStyles2, TextArea, Tooltip } from '@grafana/ui';

import { agent } from '../agent/agent';
import { toolsByName } from '../agent/tools';
import { dataProvider, getProviderTriggers } from '../agent/tools/context/autocomplete';

import { Tool } from './DashMessage/Tool';
import { DashMessages } from './DashMessages';
import { getDash, getMessages } from './utils';

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
  private _abortController: AbortController | null = null;
  private _currentAgent = agent;

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
    this._setupVerbosityListener();
  }

  private _setupVerbosityListener() {
    // Listen for verbosity changes
    const settings = getDash(this).state.settings;
    settings.subscribeToState((newState: { verbosity: string }) => {
      if (newState.verbosity !== settings.state.verbosity) {
        // Recreate the agent with new verbosity setting
        this._currentAgent = agent;

        // Send a system message to update the model's response style
        const verbosityInstructions = {
          concise:
            'Please adjust your response style to be more concise. Use short, clear sentences and avoid unnecessary explanations or repetition.',
          educational:
            'Please adjust your response style to be more educational. Explain concepts as if speaking to someone new to Grafana, break down technical terms, and use analogies where helpful. Include helpful reminders in brackets, for example "The following datasources (systems we can pull data from) are available".',
        };

        const instruction = verbosityInstructions[newState.verbosity as keyof typeof verbosityInstructions];
        if (instruction) {
          // Add to both the UI messages and LangChain messages
          this.messages?.addSystemMessage(instruction);
          this.messages?.addLangchainMessage(new SystemMessage({ content: instruction }));
          this._logAIMessage(instruction, 'final');
        }
      }
    });
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

  public cancelRequest() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
      this.messages?.setLoading(false);
      // Clear the message
      this.updateMessage('', false);
      // Resume listening if we were listening before
      if (this.state.isListening && this._recognition) {
        this._recognition.start();
      }
      // Add the cancellation message
      this.messages?.addSystemMessage('Canceled by user', true);
    }
  }

  private _logAIMessage(message: MessageContent, type: 'initial' | 'tool' | 'final' = 'initial') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'initial' ? '🤖' : type === 'tool' ? '🛠️' : '✨';
    const messageText = typeof message === 'string' ? message : JSON.stringify(message);
    console.log(`\n${prefix} AI (${timestamp}): ${messageText}`);
  }

  private _logMessagesToLLM(messages: Array<HumanMessage | AIMessageChunk | SystemMessage>) {
    const timestamp = new Date().toLocaleTimeString();
    const counts = {
      system: messages.filter((m) => m instanceof SystemMessage).length,
      user: messages.filter((m) => m instanceof HumanMessage).length,
      ai: messages.filter((m) => m instanceof AIMessageChunk).length,
    };
    console.log(
      `\n📤 Sending to LLM (${timestamp}): ${counts.system} system, ${counts.user} user, ${counts.ai} AI messages`
    );
    messages.forEach((msg, i) => {
      const prefix = msg instanceof HumanMessage ? '👤' : msg instanceof SystemMessage ? '⚙️' : '🤖';
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      console.log(`${prefix} [${i + 1}]: ${content}`);
    });
  }

  public async sendMessage() {
    const message = this.state.message.trim();

    if (!message) {
      return;
    }

    // Cancel any existing request
    if (this._abortController) {
      this._abortController.abort();
    }
    this._abortController = new AbortController();

    console.log('\n👤 User Message:', message);
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
      // Log messages being sent to LLM
      this._logMessagesToLLM(this.messages?.state.langchainMessages!);

      const aiMessage = await this._currentAgent.invoke(this.messages?.state.langchainMessages!, {
        signal: this._abortController.signal,
      });
      this._logAIMessage(aiMessage.content);
      this.messages?.addAiMessage(aiMessage.content);
      this.messages?.addLangchainMessage(aiMessage);
      await this._handleToolCalls(aiMessage);
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('AbortError')) {
        // Don't log as error since this is an expected cancellation
        return;
      }
      // Only log and show error message for unexpected errors
      console.error('\n❌ Error:', error.message || 'Unknown error occurred');
      this.messages?.addSystemMessage(error.message || 'Unknown error occurred', false, true);
    } finally {
      this.messages?.setLoading(false);
      this._abortController = null;
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
      // Check if request was cancelled before starting tool
      if (this._abortController?.signal.aborted) {
        return;
      }

      console.log('\n🛠️ Tool Call:', {
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
          // Check if request was cancelled after tool finished
          if (this._abortController?.signal.aborted) {
            return;
          }

          console.log('\n📥 Tool Response:', {
            content: toolResponse.content,
            type: 'tool_response',
          });
          this.messages?.addLangchainMessage(toolResponse);

          // Log messages being sent to LLM after tool response
          this._logMessagesToLLM(this.messages?.state.langchainMessages!);

          const nextAiMessage = await this._currentAgent.invoke(this.messages?.state.langchainMessages!, {
            signal: this._abortController?.signal,
          });
          // Check if request was cancelled after AI response
          if (this._abortController?.signal.aborted) {
            return;
          }

          this._logAIMessage(nextAiMessage.content, 'tool');
          this.messages?.addAiMessage(nextAiMessage.content);
          this.messages?.addLangchainMessage(nextAiMessage);
          await this._handleToolCalls(nextAiMessage, callCount + 1, maxCalls);
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.log('Request was cancelled during tool execution');
            return;
          }
          throw error;
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

  // Set placeholder text based on listening state
  const placeholderText = isListening ? 'Speak aloud your questions' : 'Ask me anything about your data.';

  return (
    <div className={styles.container} ref={containerRef}>
      {loading && !isToolWorking && <LoadingBar width={containerRef.current?.getBoundingClientRect().width ?? 0} />}
      <div className={styles.row}>
        <Tooltip content={isListening ? 'Stop listening' : 'Use dictation'}>
          <IconButton
            size="xl"
            name="record-audio"
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            disabled={loading}
            onClick={() => model.toggleSpeechRecognition()}
            className={isListening ? styles.listening : undefined}
          />
        </Tooltip>

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
          readOnly={loading || isListening}
          placeholder={placeholderText}
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

              case 'Escape':
                if (loading) {
                  evt.preventDefault();
                  evt.stopPropagation();
                  model.cancelRequest();
                  // Prevent the event from bubbling up to parent components
                  evt.nativeEvent.stopImmediatePropagation();
                }
                break;
            }
          }}
          itemClassName={styles.autoCompleteListItem}
          listClassName={styles.autoCompleteList}
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
