import { css } from '@emotion/css';
import { Icon, IconButton } from '@grafana/ui';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';

import { getMessage, getSettings } from '../utils';

import { Bubble } from './Bubble';

export interface ToolState extends SceneObjectState {
  content: {
    type: string;
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
  opened: boolean;
}

export class Tool extends SceneObjectBase<ToolState> {
  public static Component = ToolRenderer;

  public constructor(state: Omit<ToolState, 'opened'>) {
    super({
      opened: false,
      ...state,
    });
  }

  public toggleOpened() {
    this.setState({ opened: !this.state.opened });
  }
}

function ToolRenderer({ model }: SceneComponentProps<Tool>) {
  const { content, opened } = model.useState();
  const { codeOverflow, showTools } = getSettings(model).useState();
  const { selected, sender } = getMessage(model).useState();

  if (!showTools) {
    return null;
  }

  const hasInput = Object.keys(content.input).length > 0;

  return (
    <Bubble codeOverflow={codeOverflow} selected={selected} sender={sender}>
      <div className={styles.container}>
        <div className={styles.header}>
          <Icon name="wrench" className={styles.icon} />
          <span className={styles.name}>{content.name}</span>
          {hasInput && (
            <IconButton
              name={opened ? 'angle-up' : 'angle-down'}
              onClick={() => model.toggleOpened()}
              className={styles.toggleButton}
              aria-label={opened ? 'Collapse details' : 'Expand details'}
            />
          )}
        </div>
        {opened && hasInput && (
          <div className={styles.details}>
            {Object.entries(content.input).map(([key, value]) => (
              <div key={key} className={styles.detailRow}>
                <span className={styles.detailKey}>{key}:</span>
                <span className={styles.detailValue}>{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Bubble>
  );
}

const styles = {
  container: css({
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    opacity: 0.85,
  }),
  header: css({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--grafana-color-text-secondary)',
    fontSize: '0.9em',
  }),
  icon: css({
    fontSize: '14px',
    color: 'var(--grafana-color-text-secondary)',
    opacity: 0.8,
  }),
  name: css({
    flex: 1,
    fontWeight: 400,
    opacity: 0.9,
  }),
  toggleButton: css({
    padding: '4px',
    margin: '-4px',
    opacity: 0.7,
    '&:hover': {
      opacity: 1,
    },
  }),
  details: css({
    marginTop: '4px',
    paddingTop: '8px',
    borderTop: '1px solid var(--grafana-color-border-weak)',
    opacity: 0.8,
  }),
  detailRow: css({
    display: 'flex',
    gap: '8px',
    marginBottom: '4px',
    fontSize: '0.85em',
  }),
  detailKey: css({
    color: 'var(--grafana-color-text-secondary)',
    fontWeight: 400,
    opacity: 0.8,
  }),
  detailValue: css({
    color: 'var(--grafana-color-text-secondary)',
    opacity: 0.9,
  }),
};
