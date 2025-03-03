import { css } from '@emotion/css';
import { AIMessageChunk, HumanMessage, MessageContent, SystemMessage } from '@langchain/core/messages';
import { findLastIndex } from 'lodash';
import { useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { generateSystemPrompt } from '../agent/systemPrompt';

import { DashMessage } from './DashMessage/DashMessage';
import { Loader } from './DashMessage/Loader';
import { getChat, getChatContainer, getInput } from './utils';

interface DashMessagesState extends SceneObjectState {
  langchainMessages: Array<HumanMessage | AIMessageChunk | SystemMessage>;
  messages: DashMessage[];
  loading: boolean;
}

export class DashMessages extends SceneObjectBase<DashMessagesState> {
  public static Component = DashMessagesRenderer;

  public constructor(state: Partial<Omit<DashMessagesState, 'loading'>>) {
    super({
      langchainMessages: state.langchainMessages ?? [new SystemMessage(generateSystemPrompt())],
      messages: state.messages ?? [
        new DashMessage({ sender: 'system', content: 'Start a conversation by sending a message!' }),
      ],
      loading: false,
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
  }

  public addUserMessage(content: string): DashMessage {
    const message = new DashMessage({ content, sender: 'user' });
    this.setState({ messages: [...this.state.messages, message] });
    return message;
  }

  public addAiMessage(content: MessageContent): DashMessage {
    const message = new DashMessage({ content, sender: 'ai' });
    this.setState({ messages: [...this.state.messages, message] });
    return message;
  }

  public addSystemMessage(content: string): DashMessage {
    const message = new DashMessage({ content, sender: 'ai' });
    this.setState({ messages: [...this.state.messages, message] });
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
      getChatContainer(this).cloneChat(getChat(this));
    }

    this.state.messages.forEach((message) => message.setSelected(false));
    document.body.removeEventListener('keydown', this._keyDownEventListener);
    document.body.removeEventListener('pointerdown', this._pointerDownEventListener);
  }

  public findSelectedMessage(messages: DashMessage[] = this.state.messages): [DashMessage | undefined, number] {
    const index = findLastIndex(messages, (message) => message.state.selected);
    return [messages[index], index];
  }

  public setLoading(loading: boolean) {
    if (loading !== this.state.loading) {
      this.setState({ loading });
    }
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
      case 'ArrowUp':
        evt.preventDefault();
        evt.stopPropagation();
        this.selectPreviousMessage();
        break;

      case 'ArrowDown':
        evt.preventDefault();
        evt.stopPropagation();
        this.selectNextMessage();
        break;

      case 'Escape':
        evt.preventDefault();
        evt.stopPropagation();
        this.exitSelectMode(false);
        getInput(this).focus();
        this.forceRender();
        break;

      case 'Enter':
        evt.preventDefault();
        evt.stopPropagation();
        this.exitSelectMode(true);
        getInput(this).focus();
        this.forceRender();
        break;
    }
  }
}

function DashMessagesRenderer({ model }: SceneComponentProps<DashMessages>) {
  const styles = useStyles2(getStyles);
  const { loading, messages } = model.useState();
  const scrollRef = useRef<HTMLInputElement>(null);

  setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  return (
    <div className={styles.container}>
      {messages.map((message) => (
        <message.Component model={message} key={message.state.key!} />
      ))}
      {loading && <Loader />}
      <div ref={scrollRef} />
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflowY: 'auto',
    padding: theme.spacing(2),
    backgroundColor: theme.colors.background.primary,
  }),
});
