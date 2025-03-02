import { css } from '@emotion/css';
import { useMemo, useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { ChatMessage } from '../agent';

import { DashMessage } from './DashMessage/DashMessage';
import { getIndicators } from './utils';

interface DashMessagesState extends SceneObjectState {
  messages: DashMessage[];
}

export class DashMessages extends SceneObjectBase<DashMessagesState> {
  public static Component = DashMessagesRenderer;

  public constructor() {
    super({
      messages: [
        new DashMessage({
          sender: 'system',
          content: 'Start a conversation by sending a message!',
          timestamp: new Date(),
        }),
      ],
    });
  }

  public updateMessages(messages: ChatMessage[]) {
    this.setState({
      messages:
        messages.length > 0
          ? messages.map(
              ({ id, content, sender, timestamp }) =>
                this._getMessageByKey(id) ?? new DashMessage({ key: id, sender, timestamp, content })
            )
          : [
              new DashMessage({
                sender: 'system',
                content: 'Start a conversation by sending a message!',
                timestamp: new Date(),
              }),
            ],
    });
  }

  private _getMessageByKey(key: string): DashMessage | undefined {
    return this.state.messages.find((message) => message.state.key === key);
  }
}

function DashMessagesRenderer({ model }: SceneComponentProps<DashMessages>) {
  const styles = useStyles2(getStyles);
  const { messages } = model.useState();
  const scrollRef = useRef<HTMLDivElement>(null);
  const indicators = useMemo(() => getIndicators(model), [model]);

  // Workaround to force scroll to bottom when typing indicator appears
  indicators.useState();

  setTimeout(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, 100);

  return (
    <div className={styles.container}>
      {messages.map((message) => (
        <message.Component model={message} key={message.state.key!} />
      ))}
      <indicators.Component model={indicators} />
      <div ref={scrollRef}></div>
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
