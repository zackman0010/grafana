import { AIMessageChunk, HumanMessage, MessageContent, SystemMessage } from '@langchain/core/messages';

import { SceneObjectBase } from '@grafana/scenes';

import { getInput, getMessages, getSettings } from '../utils';

export class Logger extends SceneObjectBase {
  public constructor() {
    super({});

    this.addActivationHandler(() => this._activationHandler());
  }

  private _activationHandler() {
    // Listen for verbosity changes
    const settings = getSettings(this);

    this._subs.add(
      settings.subscribeToState((newState, prevState) => {
        if (newState.verbosity !== prevState.verbosity) {
          getInput(this).recreateAgent();

          const verbosityInstructions = {
            concise:
              'Please adjust your response style to be more concise. Use short, clear sentences and avoid unnecessary explanations or repetition.',
            educational:
              'Please adjust your response style to be more educational. Explain concepts as if speaking to someone new to Grafana, break down technical terms, and use analogies where helpful. Include helpful reminders in brackets, for example "The following datasources (systems we can pull data from) are available".',
          };

          const instruction = verbosityInstructions[newState.verbosity as keyof typeof verbosityInstructions];

          if (instruction) {
            // Add to both the UI messages and LangChain messages
            getMessages(this).addSystemMessage(instruction);
            getMessages(this).addLangchainMessage(new SystemMessage({ content: instruction }));
            this.logAIMessage(instruction, 'final');
          }
        }
      })
    );
  }

  public logAIMessage(message: MessageContent, type: 'initial' | 'tool' | 'final' = 'initial') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'initial' ? '🤖' : type === 'tool' ? '🛠️' : '✨';
    const messageText = typeof message === 'string' ? message : JSON.stringify(message);
    console.log(`\n${prefix} AI (${timestamp}): ${messageText}`);
  }

  public logMessagesToLLM(messages: Array<HumanMessage | AIMessageChunk | SystemMessage>) {
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
}
