import { css } from '@emotion/css';

import { getDefaultTimeRange, GrafanaTheme2 } from '@grafana/data';
import { config } from '@grafana/runtime';
import {
  SceneComponentProps,
  SceneDataTransformer,
  SceneObjectBase,
  SceneObjectState,
  SceneQueryRunner,
  SceneTimeRange,
  VizPanel,
} from '@grafana/scenes';
import { Button, Icon, Modal, Tooltip, useStyles2 } from '@grafana/ui';

import { PanelConfiguration } from '../types';

interface PanelState extends SceneObjectState {
  panel: PanelConfiguration;
  timeRange: {
    from: string;
    to: string;
  };
  vizPanel: VizPanel;
  collapsed: boolean;
  expanded: boolean;
}

export class Panel extends SceneObjectBase<PanelState> {
  public static Component = PanelRenderer;

  public constructor(state: Omit<PanelState, 'vizPanel'>) {
    const targets = state.panel.targets ?? [];

    const vizPanel = new VizPanel({
      title: '',
      seriesLimit: 25,
      pluginId: state.panel.type ?? 'timeseries',
      options: state.panel.options ?? {},
      fieldConfig: state.panel.fieldConfig,
      pluginVersion: state.panel.pluginVersion ?? config.buildInfo.version,
      displayMode: 'transparent',
      $timeRange: new SceneTimeRange(state.timeRange ?? getDefaultTimeRange()),
      $data:
        targets.length === 0
          ? undefined
          : new SceneDataTransformer({
              $data: new SceneQueryRunner({
                datasource: state.panel.datasource ?? targets[0].datasource ?? undefined,
                queries: targets,
                maxDataPointsFromWidth: true,
              }),
              transformations: state.panel.transformations ?? [],
            }),
      $behaviors: [],
    });

    super({ ...state, vizPanel, collapsed: false, expanded: false });
  }

  public toggleCollapsed() {
    this.setState({ collapsed: !this.state.collapsed });
  }

  public setExpanded(expanded: boolean) {
    this.setState({ expanded });
  }
}

function PanelRenderer({ model }: SceneComponentProps<Panel>) {
  const { vizPanel, collapsed, expanded, panel } = model.useState();
  const styles = useStyles2(getStyles);

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header} role="button" onClick={() => model.toggleCollapsed()}>
          <div className={styles.headerLeft}>
            <Icon name="chart-line" className={styles.titleIcon} />
            <p className={styles.title}>{panel.title}</p>
            {panel.description && (
              <Tooltip content={panel.description}>
                <Icon name="info-circle" className={styles.infoIcon} />
              </Tooltip>
            )}
          </div>
          <Icon name={collapsed ? 'angle-down' : 'angle-up'} size="sm" />
        </div>
        {!collapsed && (
          <div className={styles.panelWrapper}>
            <vizPanel.Component model={vizPanel} />
            <Button
              className={styles.expandButton}
              icon="eye"
              variant="secondary"
              onClick={() => model.setExpanded(!expanded)}
              aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
            />
          </div>
        )}
      </div>
      {expanded && (
        <Modal
          title={vizPanel.state.title || 'Panel'}
          isOpen={expanded}
          onDismiss={() => model.setExpanded(false)}
          className={styles.modal}
          contentClassName={styles.modalContent}
        >
          <div className={styles.expandedPanel}>
            <vizPanel.Component model={vizPanel} />
          </div>
        </Modal>
      )}
    </>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    label: 'dash-message-panel-container',
  }),
  header: css({
    label: 'dash-message-panel-header',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  }),
  headerLeft: css({
    label: 'dash-message-panel-header-left',
    fontFamily: theme.typography.fontFamilyMonospace,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    flex: 1,
  }),
  titleIcon: css({
    label: 'dash-message-panel-title-icon',
    color: theme.colors.text.secondary,
  }),
  title: css({
    label: 'dash-message-panel-title',
    opacity: 0.9,
  }),
  infoIcon: css({
    label: 'dash-message-panel-info',
    color: theme.colors.text.secondary,
    cursor: 'help',
    alignItems: 'center',
    opacity: 0.8,
  }),
  panelWrapper: css({
    label: 'dash-message-panel-wrapper',
    position: 'relative',
    height: '300px',
  }),
  expandButton: css({
    label: 'dash-message-panel-expand-button',
    position: 'absolute',
    top: theme.spacing(1),
    right: theme.spacing(1),
    zIndex: 1,
  }),
  modal: css({
    label: 'dash-message-panel-modal',
    minWidth: '400px',
    width: '80vw',
  }),
  modalContent: css({
    label: 'dash-message-panel-modal-content',
    padding: 0,
  }),
  expandedPanel: css({
    label: 'dash-message-panel-modal-expanded-panel',
    height: '80vh',
    width: '100%',
    padding: theme.spacing(2),
  }),
});
