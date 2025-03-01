import { css } from '@emotion/css';
import { useEffect } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { ChatMessage, useDashAgent } from '../agent';

import { DashInput } from './DashInput';
import { DashMessage } from './DashMessage/DashMessage';
import { DashMessages } from './DashMessages';

export interface DashChatState extends SceneObjectState {
  messages: DashMessages;
  input: DashInput;
  loading: boolean;
}

export class DashChat extends SceneObjectBase<DashChatState> {
  public static Component = DashChatRenderer;

  public get renderBeforeActivation(): boolean {
    return true;
  }

  private _askMessage: (message: string) => Promise<void> = () => Promise.resolve();

  public constructor() {
    super({ messages: new DashMessages(), input: new DashInput(), loading: false });
  }

  public async sendMessage() {
    const message = this.state.input.getMessage().trim();

    if (!message) {
      return;
    }

    this.state.input.updateMessage('');
    await this._askMessage(message);
  }

  public setAskMessage(askMessage: (message: string) => Promise<void>) {
    this._askMessage = askMessage;
  }

  public updateMessages(messages: ChatMessage[]) {
    this.state.messages.updateMessages(
      messages.map(
        ({ id, content, sender, timestamp }) =>
          this.state.messages.getMessageByKey(id) ?? new DashMessage({ key: id, sender, timestamp, content })
      )
    );
  }

  public setLoading(loading: boolean) {
    this.setState({ loading });
  }
}

function DashChatRenderer({ model }: SceneComponentProps<DashChat>) {
  const styles = useStyles2(getStyles);
  const { messages, input } = model.useState();
  const [agentMessages, agentLoading, agentAskMessage] = useDashAgent();

  useEffect(() => model.setAskMessage(agentAskMessage), [agentAskMessage, model]);
  useEffect(() => model.updateMessages(agentMessages), [agentMessages, model]);
  useEffect(() => model.setLoading(agentLoading), [agentLoading, model]);

  return (
    <div className={styles.container}>
      <messages.Component model={messages} />
      <input.Component model={input} />
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    height: '100%',
    width: '100%',
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.shape.radius.default,
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: `1px solid ${theme.colors.border.weak}`,
    position: 'relative',
  }),
});
