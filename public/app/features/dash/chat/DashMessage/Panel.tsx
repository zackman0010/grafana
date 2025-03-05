import { css } from '@emotion/css';

import { TimeRange } from '@grafana/data';
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
import { useStyles2 } from '@grafana/ui';

import { PanelConfiguration } from '../types';

interface PanelState extends SceneObjectState {
  panel: PanelConfiguration;
  timeRange: TimeRange;
  vizPanel: VizPanel;
}

export class Panel extends SceneObjectBase<PanelState> {
  public static Component = PanelRenderer;

  public constructor(state: Omit<PanelState, 'vizPanel'>) {
    const targets = state.panel.targets ?? [];

    const vizPanel = new VizPanel({
      title: state.panel.title ?? '',
      description: state.panel.description ?? '',
      pluginId: state.panel.type ?? 'timeseries',
      options: state.panel.options ?? {},
      fieldConfig: state.panel.fieldConfig,
      pluginVersion: state.panel.pluginVersion ?? config.buildInfo.version,
      displayMode: 'transparent',
      $timeRange: new SceneTimeRange({
        from: state.timeRange.from.toISOString(),
        to: state.timeRange.to.toISOString(),
      }),
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

    super({ ...state, vizPanel });
  }
}

function PanelRenderer({ model }: SceneComponentProps<Panel>) {
  const { vizPanel } = model.useState();
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      <vizPanel.Component model={vizPanel} />
    </div>
  );
}

const getStyles = () => ({
  container: css({
    label: 'dash-message-panel-container',
    height: '300px',
  }),
});
