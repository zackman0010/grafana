import { css } from '@emotion/css';
import { useLayoutEffect, useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { DashMessage } from './DashMessage';

interface DashMessagesState extends SceneObjectState {
  messages: DashMessage[];
}

export class DashMessages extends SceneObjectBase<DashMessagesState> {
  public static Component = DashMessagesRenderer;

  public constructor() {
    super({ messages: [] });
  }

  public getMessageByKey(key: string): DashMessage | undefined {
    return this.state.messages.find((message) => message.state.key === key);
  }

  public updateMessages(messages: DashMessage[]) {
    this.setState({ messages });
  }
}

function DashMessagesRenderer({ model }: SceneComponentProps<DashMessages>) {
  const styles = useStyles2(getStyles);
  const { messages } = model.useState();
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [messages]);

  return (
    <div className={styles.container}>
      {!messages.length ? (
        <div className={styles.empty}>Start a conversation by sending a message!</div>
      ) : (
        messages.map((message) => <message.Component model={message} key={message.state.key!} />)
      )}
      <div ref={scrollRef}></div>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    flex: 1,
    overflowY: 'auto',
    padding: theme.spacing(2),
    backgroundColor: theme.colors.background.primary,
  }),
  empty: css({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    textAlign: 'center',
    padding: theme.spacing(2),
  }),
});
