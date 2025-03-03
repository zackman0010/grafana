import { css, cx } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { Icon, IconButton, useStyles2 } from '@grafana/ui';

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
  working: boolean;
}

export class Tool extends SceneObjectBase<ToolState> {
  public static Component = ToolRenderer;

  public constructor(state: Omit<ToolState, 'opened' | 'working'>) {
    super({
      opened: false,
      working: false,
      ...state,
    });
  }

  public toggleOpened() {
    this.setState({ opened: !this.state.opened });
  }

  public setWorking(working: boolean) {
    this.setState({ working });
  }
}

function ToolRenderer({ model }: SceneComponentProps<Tool>) {
  const styles = useStyles2(getStyles);
  const { content, opened, working } = model.useState();
  const { codeOverflow, showTools } = getSettings(model).useState();
  const { selected, sender } = getMessage(model).useState();

  if (!showTools) {
    return null;
  }

  const hasInput = Object.keys(content.input).length > 0;

  return (
    <Bubble codeOverflow={codeOverflow} selected={selected} sender={sender}>
      <div className={styles.container}>
        <div className={cx(styles.header, { expanded: opened })}>
          <Icon name={working ? 'sync' : 'wrench'} className={working ? styles.spinner : ''} />
          <span className={styles.name}>{content.name}</span>
          {hasInput && (
            <IconButton
              name={opened ? 'angle-up' : 'angle-down'}
              size="sm"
              aria-label={opened ? 'Collapse details' : 'Expand details'}
              onClick={(e) => {
                e.stopPropagation();
                model.toggleOpened();
              }}
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

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    label: 'dash-tool-container',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    borderRadius: theme.shape.borderRadius(1),
  }),
  header: css({
    label: 'dash-tool-header',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    cursor: 'pointer',
  }),
  title: css({
    label: 'dash-tool-title',
    fontSize: theme.typography.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilyMonospace,
  }),
  description: css({
    label: 'dash-tool-description',
    fontSize: theme.typography.fontSize,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing(4),
  }),
  details: css({
    label: 'dash-tool-details',
    fontSize: theme.typography.fontSize,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing(4),
    padding: theme.spacing(1),
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.shape.borderRadius(1),
  }),
  spinner: css({
    label: 'dash-tool-spinner',
    [theme.transitions.handleMotion('no-preference', 'reduce')]: {
      animation: 'spin 1s linear infinite',
    },
    '@keyframes spin': {
      '0%': {
        transform: 'rotate(0deg)',
      },
      '100%': {
        transform: 'rotate(360deg)',
      },
    },
  }),
  icon: css({
    fontSize: '14px',
    color: 'var(--grafana-color-text-secondary)',
    opacity: 0.8,
    '&.fa-sync': {
      animation: 'spin 1s linear infinite',
    },
  }),
  name: css({
    flex: 1,
    fontWeight: 400,
    opacity: 0.9,
    fontFamily: 'var(--grafana-font-family-monospace)',
  }),
  toggleButton: css({
    padding: '4px',
    margin: '-4px',
    opacity: 0.7,
    '&:hover': {
      opacity: 1,
    },
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
});
