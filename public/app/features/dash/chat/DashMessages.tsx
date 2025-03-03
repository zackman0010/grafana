import { css } from '@emotion/css';
import { AIMessageChunk, HumanMessage, MessageContent, SystemMessage } from '@langchain/core/messages';
import { findLastIndex } from 'lodash';
import { useMemo, useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { generateSystemPrompt } from '../agent/systemPrompt';

import { DashMessage } from './DashMessage/DashMessage';
import { getIndicators, getInput } from './utils';

interface DashMessagesState extends SceneObjectState {
  langchainMessages: Array<HumanMessage | AIMessageChunk | SystemMessage>;
  messages: DashMessage[];
}

export class DashMessages extends SceneObjectBase<DashMessagesState> {
  public static Component = DashMessagesRenderer;

  public constructor() {
    super({
      langchainMessages: [new SystemMessage(generateSystemPrompt())],
      messages: [
        new DashMessage({
          sender: 'system',
          content: 'Start a conversation by sending a message!',
          timestamp: new Date(),
        }),
      ],
    });

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

  public addUserMessage(message: string) {
    const timestamp = new Date();
    this.setState({
      messages: [
        ...this.state.messages,
        new DashMessage({
          content: message,
          sender: 'user',
          timestamp,
        }),
      ],
    });
  }

  public addAiMessage(message: MessageContent) {
    const timestamp = new Date();
    this.setState({
      messages: [
        ...this.state.messages,
        new DashMessage({
          content: message,
          sender: 'ai',
          timestamp,
        }),
      ],
    });
  }

  public addSystemMessage(message: string) {
    const timestamp = new Date();
    this.setState({
      messages: [
        ...this.state.messages,
        new DashMessage({
          content: message,
          sender: 'system',
          timestamp,
        }),
      ],
    });
  }

  public enterSelectMode() {
    getInput(this).blur();
    this.exitSelectMode(false);

    const [message] = this._findUserMessage(this.state.messages);
    this._enterMessageSelectMode(message);
  }

  public selectPreviousMessage() {
    const [, selectedIndex] = this._findSelectedMessage(this.state.messages);

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
    const [, selectedIndex] = this._findSelectedMessage(this.state.messages);

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
      const [message] = this._findSelectedMessage(this.state.messages);
      getInput(this).updateMessage(String(message?.state.content ?? ''), false);
    }

    this.state.messages.forEach((message) => message.setSelected(false));
    document.body.removeEventListener('keydown', this._keyDownEventListener);
  }

  private _findSelectedMessage(messages: DashMessage[]): [DashMessage | undefined, number] {
    const index = findLastIndex(messages, (message) => message.state.selected);
    return [messages[index], index];
  }

  private _findUserMessage(messages: DashMessage[]): [DashMessage | undefined, number] {
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
  const { messages } = model.useState();
  const scrollRef = useRef<HTMLInputElement>(null);
  const indicators = useMemo(() => getIndicators(model), [model]);

  // Workaround to force scroll to bottom when typing indicator appears
  indicators.useState();

  setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  return (
    <div className={styles.container}>
      {messages.map((message) => (
        <message.Component model={message} key={message.state.key!} />
      ))}
      <indicators.Component model={indicators} />
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
