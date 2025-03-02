import { css } from '@emotion/css';
import { useEffect, useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { IconButton, LoadingBar, TextArea, useStyles2 } from '@grafana/ui';

import { DashIndicators } from './DashIndicators';
import { getIndicators } from './utils';

interface DashInputState extends SceneObjectState {
  message: string;
}

export class DashInput extends SceneObjectBase<DashInputState> {
  public static Component = DashInputRenderer;

  private _clearTypingFlagTimeout: NodeJS.Timeout | null = null;
  private _askMessage: (message: string) => Promise<void> = () => Promise.resolve();

  public indicators?: DashIndicators;

  public constructor() {
    super({ message: '' });

    this.addActivationHandler(() => this._activationHandler());
  }

  private _activationHandler() {
    this.indicators = getIndicators(this);

    return () => {
      if (this._clearTypingFlagTimeout) {
        clearTimeout(this._clearTypingFlagTimeout);
      }

      this._clearTypingFlagTimeout = null;
      this.indicators?.setTyping(false);
    };
  }

  public updateAskMessage(askMessage: (message: string) => Promise<void>) {
    this._askMessage = askMessage;
  }

  public getMessage(): string {
    return this.state.message;
  }

  public updateMessage(message: string) {
    this.indicators?.setTyping(true);

    if (this._clearTypingFlagTimeout) {
      clearTimeout(this._clearTypingFlagTimeout);
    }

    this._clearTypingFlagTimeout = setTimeout(() => {
      this.indicators?.setTyping(false);
      this._clearTypingFlagTimeout = null;
    }, 1000);

    this.setState({ message });
  }

  public sendMessage() {
    if (this._clearTypingFlagTimeout) {
      clearTimeout(this._clearTypingFlagTimeout);
      this._clearTypingFlagTimeout = null;
    }

    const message = this.getMessage().trim();

    if (!message) {
      return;
    }

    this.indicators?.setTyping(false);
    this.setState({ message: '' });

    this._askMessage(message);
  }
}

function DashInputRenderer({ model }: SceneComponentProps<DashInput>) {
  const styles = useStyles2(getStyles);
  const { message } = model.useState();
  const { loading } = model.indicators!.useState();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => inputRef.current?.focus(), [message]);

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
              model.sendMessage();
            }
          }}
        />

        <IconButton
          size="xl"
          name="play"
          aria-label="Send message"
          disabled={loading}
          onClick={() => model.sendMessage()}
        />
      </div>
    </div>
  );
}

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
});
