import { css, keyframes } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { Icon, useStyles2 } from '@grafana/ui';

import { getSettings } from '../utils';

import { JSONPreview } from './JSONPreview';

interface ToolState extends SceneObjectState {
  content: {
    type: string;
    id: string;
    name: string;
    input: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
  };
  opened: boolean;
  working: boolean;
}

export class Tool extends SceneObjectBase<ToolState> {
  public static Component = ({ model }: SceneComponentProps<Tool>) => {
    const { showTools } = getSettings(model).useState();

    if (!showTools) {
      return null;
    }

    return <ToolRenderer model={model} />;
  };

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

  public setError(error: string | undefined) {
    this.setState({
      content: {
        ...this.state.content,
        error,
      },
    });
  }

  public setOutput(output: Record<string, unknown> | undefined) {
    this.setState({
      content: {
        ...this.state.content,
        output,
      },
    });
  }
}

function ToolRenderer({ model }: SceneComponentProps<Tool>) {
  const { content, opened, working } = model.useState();
  const hasInput = Object.keys(content.input).length > 0;
  const hasOutput = Boolean(content.output && Object.keys(content.output).length > 0);
  const styles = useStyles2(getStyles, !!content.error, working, hasInput || hasOutput);

  const renderValue = (key: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      return <JSONPreview value={value} label={key} />;
    }
    return String(value);
  };

  return (
    <div className={styles.container}>
      <div
        className={styles.header}
        role={hasInput || hasOutput ? 'button' : undefined}
        onClick={
          hasInput || hasOutput
            ? (evt) => {
                evt.stopPropagation();
                model.toggleOpened();
              }
            : undefined
        }
      >
        <Icon name={working ? 'sync' : content.error ? 'times' : 'check'} className={styles.icon} />

        <span className={styles.name}>{content.name}</span>

        {(hasInput || hasOutput) && <Icon name={opened ? 'angle-up' : 'angle-down'} size="sm" />}
      </div>

      {opened && (hasInput || hasOutput) && (
        <div className={styles.details}>
          {hasInput && (
            <>
              {Object.entries(content.input).map(([key, value]) => (
                <div key={key} className={styles.detailsRow}>
                  <span className={styles.detailsKey}>{key}:</span>
                  <span className={styles.detailsValue}>{renderValue(key, value)}</span>
                </div>
              ))}
            </>
          )}

          {hasOutput && (
            <>
              <div className={styles.sectionHeader}>Output</div>
              {Object.entries(content.output!).map(([key, value]) => (
                <div key={key} className={styles.detailsRow}>
                  <span className={styles.detailsKey}>{key}:</span>
                  <span className={styles.detailsValue}>{renderValue(key, value)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
      {content.error && <div className={styles.error}>{content.error}</div>}
    </div>
  );
}

const spin = keyframes({
  '0%': {
    transform: 'rotate(0deg)',
  },
  '100%': {
    transform: 'rotate(360deg)',
  },
});

const getStyles = (theme: GrafanaTheme2, withError: boolean, working: boolean, hasInput: boolean) => ({
  container: css({
    label: 'dash-message-tool-container',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    borderRadius: theme.shape.radius.default,
  }),
  header: css({
    label: 'dash-message-tool-header',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    cursor: hasInput ? 'pointer' : 'default',
  }),
  title: css({
    label: 'dash-message-tool-title',
    fontSize: theme.typography.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamilyMonospace,
  }),
  description: css({
    label: 'dash-message-tool-description',
    fontSize: theme.typography.fontSize,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing(4),
  }),
  icon: css({
    label: 'dash-message-tool-icon',
    ...(withError ? { color: theme.colors.warning.main } : {}),
    ...(working
      ? {
          [theme.transitions.handleMotion('no-preference', 'reduce')]: {
            animation: `${spin} 1s linear infinite`,
          },
        }
      : { color: theme.colors.text.secondary }),
  }),
  name: css({
    label: 'dash-message-tool-name',
    flex: 1,
    fontWeight: 400,
    opacity: 0.9,
    fontFamily: theme.typography.fontFamilyMonospace,
  }),
  details: css({
    label: 'dash-tool-details',
    fontSize: theme.typography.fontSize,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing(2),
    padding: theme.spacing(1),
    paddingTop: 0,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.shape.radius.default,
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: `${theme.spacing(1)} ${theme.spacing(2)}`,
    alignItems: 'baseline',
    maxWidth: '100%',
    wordBreak: 'break-word',
  }),
  detailsRow: css({
    label: 'dash-message-tool-details-row',
    display: 'contents',
    fontSize: '0.85em',
    fontFamily: theme.typography.fontFamilyMonospace,
    '& > *': {
      overflow: 'hidden',
      maxWidth: '100%',
    },
  }),
  detailsKey: css({
    label: 'dash-message-tool-details-key',
    color: theme.colors.text.secondary,
    fontWeight: 500,
    opacity: 0.8,
    whiteSpace: 'nowrap',
  }),
  detailsValue: css({
    label: 'dash-message-tool-details-value',
    color: theme.colors.text.primary,
    opacity: 0.9,
  }),
  detailsError: css({
    label: 'dash-message-tool-details-error',
    marginTop: theme.spacing(1),
    color: theme.colors.error.main,
    fontSize: '0.85em',
  }),
  error: css({
    label: 'dash-message-tool-error',
    marginTop: theme.spacing(1),
    color: theme.colors.warning.text,
    fontSize: '0.85em',
    padding: theme.spacing(1),
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.shape.radius.default,
    borderLeft: `3px solid ${theme.colors.warning.border}`,
  }),
  sectionHeader: css({
    label: 'dash-message-tool-section-header',
    gridColumn: '1 / -1',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
    fontWeight: 500,
    color: theme.colors.text.secondary,
    fontSize: '0.9em',
  }),
});
