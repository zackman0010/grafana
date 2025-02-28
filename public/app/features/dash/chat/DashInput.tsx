import { css } from '@emotion/css';
import { useEffect, useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, sceneGraph, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { IconButton, LoadingBar, TextArea, useStyles2 } from '@grafana/ui';

import { DashChat } from './DashChat';

interface DashInputState extends SceneObjectState {
  message: string;
}

export class DashInput extends SceneObjectBase<DashInputState> {
  public static Component = DashInputRenderer;

  public constructor() {
    super({ message: '' });
  }

  public getMessage(): string {
    return this.state.message;
  }

  public updateMessage(message: string) {
    this.setState({ message });
  }

  public getChat(): DashChat {
    return sceneGraph.getAncestor(this, DashChat);
  }
}

function DashInputRenderer({ model }: SceneComponentProps<DashInput>) {
  const styles = useStyles2(getStyles);
  const { message } = model.useState();
  const chat = model.getChat();
  const { loading } = chat.useState();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [message]);

  return (
    <div className={styles.container} ref={containerRef}>
      {loading && <LoadingBar width={containerRef.current?.getBoundingClientRect().width ?? 0} />}

      <div className={styles.row}>
        <TextArea
          autoFocus
          ref={inputRef}
          value={message}
          readOnly={loading}
          placeholder="Type your message here"
          onChange={(evt) => model.updateMessage(evt.currentTarget.value)}
          onKeyDown={(evt) => {
            if (evt.key === 'Enter' && !evt.shiftKey) {
              evt.preventDefault();
              evt.stopPropagation();
              chat.sendMessage();
            }
          }}
        />

        <IconButton
          size="xl"
          name="play"
          aria-label="Send message"
          disabled={loading}
          onClick={() => chat.sendMessage()}
        />
      </div>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'flex',
    flexDirection: 'column',
    background: '#212124',
    borderTop: '1px solid #2c3235',
  }),
  row: css({
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(2),
    padding: theme.spacing(2),
  }),
});
