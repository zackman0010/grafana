import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { Button, useStyles2 } from '@grafana/ui';

// Define a custom event type
export interface ActionButtonClickedEvent {
  actionId: string;
  value: string;
}

// Create a simple event emitter
class EventEmitter {
  private listeners: Record<string, Array<(data: any) => void>> = {};

  public on(event: string, callback: (data: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: (data: any) => void) {
    if (!this.listeners[event]) {
      return;
    }
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  public emit(event: string, data: any) {
    if (!this.listeners[event]) {
      return;
    }
    this.listeners[event].forEach((callback) => callback(data));
  }
}

// Create a singleton instance
export const actionEvents = new EventEmitter();

interface ActionOption {
  label: string;
  value: string;
  primary?: boolean;
}

interface ActionMessageState extends SceneObjectState {
  content: string;
  options: ActionOption[];
  actionId: string;
  disabled?: boolean;
  hideButton?: boolean;
}

export class ActionMessage extends SceneObjectBase<ActionMessageState> {
  public static Component = ActionMessageRenderer;

  public constructor(state: ActionMessageState) {
    super({
      ...state,
      disabled: false,
      hideButton: false,
    });
  }

  public handleAction(value: string) {
    if (!this.state.disabled) {
      this.setState({ disabled: true });
      // Emit an event with the action ID and value
      actionEvents.emit('action-button-clicked', {
        actionId: this.state.actionId,
        value: value,
      });
    }
  }
}

function ActionMessageRenderer({ model }: SceneComponentProps<ActionMessage>) {
  const { content, options, disabled, hideButton } = model.useState();
  const styles = useStyles2(getStyles);

  // Find the primary option or use the first one
  const primaryOption = options.find((option) => option.primary) || options[0];

  return (
    <div className={styles.container}>
      <div className={styles.message}>{content}</div>
      {!hideButton && (
        <div className={styles.actions}>
          <Button
            variant="primary"
            size="sm"
            disabled={disabled}
            onClick={() => model.handleAction(primaryOption.value)}
          >
            {disabled ? 'Continuing...' : 'Continue'}
          </Button>
        </div>
      )}
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    width: '100%',
  }),
  message: css({
    color: theme.colors.text.primary,
    '& p': {
      margin: 0,
    },
  }),
  actions: css({
    display: 'flex',
    justifyContent: 'flex-start',
    marginTop: theme.spacing(1),
  }),
});
