import { css, keyframes } from '@emotion/css';
import { useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { Icon, useStyles2, Modal } from '@grafana/ui';

import { getSettings } from '../utils';

interface ToolState extends SceneObjectState {
  content: {
    type: string;
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
  error: string | undefined;
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

  public constructor(state: Omit<ToolState, 'opened' | 'working' | 'error'>) {
    super({
      opened: false,
      working: false,
      error: undefined,
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
    this.setState({ error });
  }
}

function JsonValue({ value, label }: { value: unknown; label: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const styles = useStyles2(getJsonValueStyles);
  const stringified = JSON.stringify(value, null, 2);

  return (
    <>
      <div className={styles.container} onClick={() => setIsModalOpen(true)}>
        <pre className={styles.preview}>{stringified}</pre>
      </div>

      <Modal isOpen={isModalOpen} title={label} onDismiss={() => setIsModalOpen(false)} closeOnBackdropClick>
        <pre className={styles.fullValue}>{stringified}</pre>
      </Modal>
    </>
  );
}

function ToolRenderer({ model }: SceneComponentProps<Tool>) {
  const { content, opened, working, error } = model.useState();
  const hasInput = Object.keys(content.input).length > 0;
  const styles = useStyles2(getStyles, !!error, working, hasInput);

  const renderValue = (key: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      return <JsonValue value={value} label={key} />;
    }
    return String(value);
  };

  return (
    <div className={styles.container}>
      <div
        className={styles.header}
        role={hasInput ? 'button' : undefined}
        onClick={
          hasInput
            ? (evt) => {
                evt.stopPropagation();
                model.toggleOpened();
              }
            : undefined
        }
      >
        <Icon name={working ? 'sync' : error ? 'times' : 'check'} className={styles.icon} />

        <span className={styles.name}>{content.name}</span>

        {hasInput && <Icon name={opened ? 'angle-up' : 'angle-down'} size="sm" />}
      </div>

      {opened && hasInput && (
        <div className={styles.details}>
          {Object.entries(content.input).map(([key, value]) => (
            <div key={key} className={styles.detailsRow}>
              <span className={styles.detailsKey}>{key}:</span>
              <span className={styles.detailsValue}>{renderValue(key, value)}</span>
            </div>
          ))}

          {error && <div className={styles.detailsError}>{error}</div>}
        </div>
      )}
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
      : {}),
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
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.shape.borderRadius(1),
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: `${theme.spacing(1)} ${theme.spacing(2)}`,
    alignItems: 'baseline',
  }),
  detailsRow: css({
    label: 'dash-message-tool-details-row',
    display: 'contents',
    fontSize: '0.85em',
    fontFamily: theme.typography.fontFamilyMonospace,
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
});

const getJsonValueStyles = (theme: GrafanaTheme2) => ({
  container: css({
    label: 'json-value-container',
    cursor: 'pointer',
    maxHeight: '100px',
    overflow: 'hidden',
    position: 'relative',
    '&:hover': {
      '&::after': {
        content: '"Click to expand"',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: theme.colors.background.primary,
        fontSize: '0.8em',
        color: theme.colors.text.secondary,
        textAlign: 'center',
        padding: theme.spacing(0.5),
      },
    },
  }),
  preview: css({
    label: 'json-value-preview',
    margin: 0,
    fontSize: '0.85em',
    fontFamily: theme.typography.fontFamilyMonospace,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }),
  fullValue: css({
    label: 'json-value-full',
    margin: 0,
    fontSize: '0.9em',
    fontFamily: theme.typography.fontFamilyMonospace,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '70vh',
    overflow: 'auto',
    padding: theme.spacing(2),
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.shape.radius.default,
  }),
});
