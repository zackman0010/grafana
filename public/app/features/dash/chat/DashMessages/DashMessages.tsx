import { css } from '@emotion/css';
import { AIMessageChunk, HumanMessage, MessageContent, SystemMessage } from '@langchain/core/messages';
import { Location } from 'history';
import { findLastIndex } from 'lodash';
import { useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { locationService } from '@grafana/runtime';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { makeSingleRequest } from '../../agent/singleRequest';
import { generateSystemPrompt } from '../../agent/systemPrompt';
import { getCurrentContext } from '../../agent/tools/context';
import { DashMessage } from '../DashMessage';
import { SerializedDashMessages } from '../types';
import { getChat, getChatInstance, getDash, getInput, getSettings } from '../utils';

import { Loader } from './Loader';

interface DashMessagesState extends SceneObjectState {
  anyToolsWorking: boolean;
  generatingWelcome: boolean;
  langchainMessages: Array<HumanMessage | AIMessageChunk | SystemMessage>;
  loading: boolean;
  messages: DashMessage[];
}

export class DashMessages extends SceneObjectBase<DashMessagesState> {
  public static Component = DashMessagesRenderer;

  public constructor(state: Partial<Omit<DashMessagesState, 'loading' | 'generatingWelcome' | 'anyToolsWorking'>>) {
    super({
      anyToolsWorking: false,
      generatingWelcome: false,
      langchainMessages: state.langchainMessages ?? generateSystemPrompt(),
      loading: false,
      messages: state.messages ?? [],
    });

    this._pointerDownEventListener = this._pointerDownEventListener.bind(this);
    this._keyDownEventListener = this._keyDownEventListener.bind(this);

    this.addActivationHandler(() => this._activationHandler());
  }

  private _activationHandler() {
    if (this.state.messages.length === 0) {
      this.generateWelcomeMessage();
    }

    const unsubscribeFromHistory = locationService.getHistory().listen(this._handleLocationChange);

    return () => {
      this.exitSelectMode(false);
      unsubscribeFromHistory();
    };
  }

  private prevLocation: Location = locationService.getLocation();
  private _handleLocationChange = async (location: Location) => {
    if (this.state.messages.length > 1) {
      return;
    }
    if (this.prevLocation.pathname === location.pathname) {
      return;
    }
    this.prevLocation = location;
    console.log('Location changed, generating a new welcome message.');
    this.setState({
      langchainMessages: generateSystemPrompt(),
      generatingWelcome: false,
      messages: [],
    });
    setTimeout(() => {
      this.generateWelcomeMessage(false);
    }, 0);
  };

  public async generateWelcomeMessage(initial = true) {
    if (this.state.generatingWelcome) {
      console.log('Welcome message already generated, skipping.');
      return;
    }
    try {
      this.setState({ generatingWelcome: true });
      const context = getCurrentContext();
      let contextPrompt = `The current URL is ${context.page.pathname}, and the URL search params are ${JSON.stringify(context.page.url_parameters)}. Which corresponds to the module ${context.app.name} ${context.app.description ? `(${context.app.description}).` : ''}. `;
      if (context.time_range) {
        contextPrompt += `The selected time range is ${context.time_range.text}. `;
      }
      if (context.datasource.type !== 'Unknown') {
        contextPrompt += `The current data source type is ${context.datasource.type}. `;
      }
      if (context.query.expression) {
        contextPrompt += `The current query is \`${context.query.expression}\`. `;
      }
      if (initial) {
        contextPrompt +=
          'Generate a concise overview message using as few words as possible, that introduces yourself as an "agent" (never assistant) and includes what the current page is about. Do not personify yourself. Ask them what they want to know and where they want to go. Do not use titles.';
      } else {
        contextPrompt +=
          'Generate a new overview message using as few words as possible, letting the user know that you know what this new page is about. Do not personify yourself. Ask them what they want to know and where they want to go. Do not use titles.';
      }

      const welcomeMessage = await makeSingleRequest({
        systemPrompt: contextPrompt,
        userMessage: 'Generate a welcome message',
      });
      console.log('Generated welcome message:', welcomeMessage);
      this.addSystemMessage(welcomeMessage);
    } catch (error) {
      console.error('Error generating welcome message:', error);
      this.addSystemMessage("Hello! I'm your Grafana AI agent. How can I help you today?");
    } finally {
      this.setState({ generatingWelcome: false });
      getDash(this).persist();
    }
  }

  public addLangchainMessage(message: HumanMessage | AIMessageChunk | SystemMessage) {
    this.setState({ langchainMessages: [...this.state.langchainMessages, message] });
    getDash(this).persist();
  }

  public addUserMessage(content: string): DashMessage {
    const message = new DashMessage({ content, sender: 'user' });
    this.setState({ messages: [...this.state.messages, message] });
    getDash(this).persist();
    return message;
  }

  public addArtifact(artifact: any): DashMessage {
    const message = new DashMessage({ content: artifact, sender: 'ai', type: 'artifact' });
    this.setState({ messages: [...this.state.messages, message] });
    getDash(this).persist();
    return message;
  }

  public addAiMessage(content: MessageContent): DashMessage {
    const message = new DashMessage({ content, sender: 'ai' });
    this.setState({ messages: [...this.state.messages, message] });
    getDash(this).persist();
    return message;
  }

  public addSystemMessage(content: string, muted?: boolean, isError?: boolean): DashMessage {
    const message = new DashMessage({ content, sender: 'system', muted, isError });
    this.setState({ messages: [...this.state.messages, message] });
    getDash(this).persist();
    return message;
  }

  public addToolNotification(content: string): DashMessage {
    const message = new DashMessage({ content, sender: 'tool_notification' });
    this.setState({ messages: [...this.state.messages, message] });
    getDash(this).persist();
    return message;
  }

  public enterSelectMode() {
    getInput(this).blur();
    this.exitSelectMode(false);
    const [message] = this._findUserMessage();
    this._enterMessageSelectMode(message);
  }

  public selectPreviousMessage() {
    const [, selectedIndex] = this.findSelectedMessage();

    this.exitSelectMode(false);

    if (selectedIndex <= 0) {
      getInput(this).focus();
      this.forceRender();
      return;
    }

    const [message] = this._findUserMessage(this.state.messages.slice(0, selectedIndex - 1));
    this._enterMessageSelectMode(message);
  }

  public selectNextMessage() {
    const [, selectedIndex] = this.findSelectedMessage();

    this.exitSelectMode(false);

    if (selectedIndex === -1 || selectedIndex + 1 === this.state.messages.length) {
      getInput(this).focus();
      this.forceRender();
      return;
    }

    const [message] = this._findUserMessage(this.state.messages.slice(selectedIndex + 1, this.state.messages.length));
    this._enterMessageSelectMode(message);
  }

  public exitSelectMode(withSet: boolean) {
    if (withSet) {
      getChat(this).cloneChat(getChatInstance(this));
    }

    this.state.messages.forEach((message) => message.setSelected(false));
    document.body.removeEventListener('keydown', this._keyDownEventListener);
    document.body.removeEventListener('pointerdown', this._pointerDownEventListener);
  }

  public setLoading(loading: boolean) {
    if (loading !== this.state.loading) {
      this.setState({ loading });
    }
  }

  public setToolError(toolId: string | undefined, error: string) {
    this.state.messages.forEach((message) => message.setToolError(toolId, error));
    getDash(this).persist();
  }

  public setToolWorking(toolId: string | undefined, working: boolean) {
    this.state.messages.forEach((message) => message.setToolWorking(toolId, working));

    const anyToolsWorking = this.state.messages.some((message) => message.hasWorkingTools());

    if (anyToolsWorking !== this.state.anyToolsWorking) {
      this.setState({ anyToolsWorking });
      getDash(this).persist();
    }
  }

  public areToolsHidden(): boolean {
    return !getSettings(this).state.showTools;
  }

  public toJSON(): SerializedDashMessages {
    return {
      messages: this.state.messages.map((message) => message.toJSON()),
      langchainMessages: this.state.langchainMessages.map((langchainMessage) => langchainMessage.toDict()),
    };
  }

  public findSelectedMessage(messages: DashMessage[] = this.state.messages): [DashMessage | undefined, number] {
    const index = findLastIndex(messages, (message) => message.state.selected);
    return [messages[index], index];
  }

  private _findUserMessage(messages: DashMessage[] = this.state.messages): [DashMessage | undefined, number] {
    const index = findLastIndex(messages, (message) => message.state.sender === 'user');
    return [messages[index], index];
  }

  private _enterMessageSelectMode(message?: DashMessage) {
    if (!message) {
      getInput(this).focus();
      this.forceRender();
      return;
    }

    message.setSelected(true);
    document.body.addEventListener('keydown', this._keyDownEventListener);
    document.body.addEventListener('pointerdown', this._pointerDownEventListener);
  }

  private _pointerDownEventListener(evt: PointerEvent) {
    evt.preventDefault();
    evt.stopPropagation();
    this.exitSelectMode(false);
  }

  private _keyDownEventListener(evt: KeyboardEvent) {
    switch (evt.key) {
      case 'ArrowUp': {
        const [message] = this.findSelectedMessage();

        if (message && !message.state.editing) {
          evt.preventDefault();
          evt.stopPropagation();
          this.selectPreviousMessage();
        }
        break;
      }

      case 'ArrowDown': {
        const [message] = this.findSelectedMessage();

        if (message && !message.state.editing) {
          evt.preventDefault();
          evt.stopPropagation();
          this.selectNextMessage();
        }
        break;
      }

      case 'Escape': {
        const [message] = this.findSelectedMessage();

        if (message) {
          evt.preventDefault();
          evt.stopPropagation();

          if (message.state.editing) {
            message.setEditing(false);
          } else {
            this.exitSelectMode(false);
            getInput(this).focus();
            this.forceRender();
          }
        }
        break;
      }

      case 'Enter': {
        const [message] = this.findSelectedMessage();

        if (message) {
          if (message.state.editing) {
            if (!evt.shiftKey) {
              evt.preventDefault();
              evt.stopPropagation();
              this.exitSelectMode(true);
              this.forceRender();
            }
          } else {
            evt.preventDefault();
            evt.stopPropagation();
            message.setEditing(true);
          }
        }
      }
    }
  }
}

function DashMessagesRenderer({ model }: SceneComponentProps<DashMessages>) {
  const styles = useStyles2(getStyles);
  const { anyToolsWorking, loading, generatingWelcome, messages } = model.useState();
  const scrollRef = useRef<HTMLInputElement>(null);

  setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  return (
    <div className={styles.container}>
      {messages.map((message) => (
        <message.Component model={message} key={message.state.key!} />
      ))}

      {(loading || generatingWelcome) && (!anyToolsWorking || model.areToolsHidden()) && (
        <div style={{ margin: '0 16px' }}>
          <Loader />
        </div>
      )}

      <div ref={scrollRef} />
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    label: 'dash-messages-container',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflowY: 'auto',
    backgroundColor: theme.colors.background.primary,
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
  }),
});
