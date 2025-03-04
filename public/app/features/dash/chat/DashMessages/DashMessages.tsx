import { css } from '@emotion/css';
import { AIMessageChunk, HumanMessage, MessageContent, SystemMessage } from '@langchain/core/messages';
import { findLastIndex } from 'lodash';
import { useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { generateSystemPrompt } from '../../agent/systemPrompt';
import { DashMessage } from '../DashMessage';
import { SerializedDashMessages } from '../types';
import { getChat, getChatInstance, getDash, getInput } from '../utils';

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
      langchainMessages: state.langchainMessages ?? [new SystemMessage(generateSystemPrompt())],
      loading: false,
      messages: state.messages ?? [],
    });

    this._pointerDownEventListener = this._pointerDownEventListener.bind(this);
    this._keyDownEventListener = this._keyDownEventListener.bind(this);

    this.addActivationHandler(() => this._activationHandler());
  }

  private _activationHandler() {
    return () => {
      this.exitSelectMode(false);
    };
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

  public setGeneratingWelcome(generatingWelcome: boolean) {
    if (generatingWelcome !== this.state.generatingWelcome) {
      this.setState({ generatingWelcome });
    }
  }

  public setToolError(toolId: string | undefined, error: string) {}

  public setToolWorking(toolId: string | undefined, working: boolean) {
    this.state.messages.forEach((message) => message.setToolWorking(toolId, working));

    const anyToolsWorking = this.state.messages.some((message) => message.hasWorkingTools());

    if (anyToolsWorking !== this.state.anyToolsWorking) {
      this.setState({ anyToolsWorking });
      getDash(this).persist();
    }
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

      {(loading || generatingWelcome) && !anyToolsWorking && <Loader />}

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
    padding: theme.spacing(2),
    backgroundColor: theme.colors.background.primary,
    gap: theme.spacing(1),
  }),
});
