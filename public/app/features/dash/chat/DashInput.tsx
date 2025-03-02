import { css } from '@emotion/css';
import { useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { IconButton, LoadingBar, TextArea, useStyles2 } from '@grafana/ui';

import { DashIndicators } from './DashIndicators';
import { getIndicators, getMessages } from './utils';

interface DashInputState extends SceneObjectState {
  message: string;
}

export class DashInput extends SceneObjectBase<DashInputState> {
  public static Component = DashInputRenderer;

  private _clearTypingFlagTimeout: NodeJS.Timeout | null = null;
  private _askMessage: (message: string) => Promise<void> = () => Promise.resolve();

  public indicators?: DashIndicators;
  private _inputRef: HTMLTextAreaElement | null = null;

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

  public setInputRef(ref: HTMLTextAreaElement | null) {
    this._inputRef = ref;
  }

  public focus() {
    this._inputRef?.focus();
  }

  public blur() {
    this._inputRef?.blur();
  }

  public updateAskMessage(askMessage: (message: string) => Promise<void>) {
    this._askMessage = askMessage;
  }

  public updateMessage(message: string, isUserInput: boolean) {
    if (isUserInput) {
      this.indicators?.setTyping(true);
    } else {
      this._inputRef?.focus();
    }

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

    const message = this.state.message.trim();

    if (!message) {
      return;
    }

    this.indicators?.setTyping(false);
    this.updateMessage('', false);

    this._askMessage(message);
  }
}

function DashInputRenderer({ model }: SceneComponentProps<DashInput>) {
  const styles = useStyles2(getStyles);
  const { message } = model.useState();
  const { loading } = model.indicators!.useState();
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.container} ref={containerRef}>
      {loading && <LoadingBar width={containerRef.current?.getBoundingClientRect().width ?? 0} />}

      <div className={styles.row}>
        <TextArea
          autoFocus
          ref={(ref) => model.setInputRef(ref)}
          value={message}
          readOnly={loading}
          placeholder="Type your message here"
          onChange={(evt) => model.updateMessage(evt.currentTarget.value, true)}
          onKeyDown={(evt) => {
            switch (evt.key) {
              case 'Enter':
                if (!evt.shiftKey) {
                  evt.preventDefault();
                  evt.stopPropagation();
                  model.sendMessage();
                }
                break;

              case 'ArrowUp':
                evt.preventDefault();
                evt.stopPropagation();
                getMessages(model).enterSelectMode();
                break;
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
