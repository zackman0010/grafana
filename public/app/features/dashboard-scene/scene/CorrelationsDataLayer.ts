import { groupBy, mapValues } from 'lodash';
import { forkJoin, from, lastValueFrom, map, mergeMap, of, Unsubscribable } from 'rxjs';

import { DataSourceRef, DataTopic } from '@grafana/data';
import {
  SceneDataLayerBase,
  SceneDataLayerProvider,
  SceneDataLayerProviderState,
  SceneDataProvider,
  SceneDataProviderResult,
  SceneDataState,
  SceneDataTransformer,
  sceneGraph,
  VizPanel,
} from '@grafana/scenes';
import { notifyApp } from 'app/core/actions';
import { createErrorNotification } from 'app/core/copy/appNotification';
import { getMessageFromError } from 'app/core/utils/errors';
import { CorrelationData } from 'app/features/correlations/useCorrelations';
import { attachCorrelationsToDataFrames, getCorrelationsBySourceUIDs } from 'app/features/correlations/utils';
import { dispatch } from 'app/store/store';

import { getDashboardSceneFor, getQueryRunnerFor } from '../utils/utils';

interface CorrelationsDataLayerState extends SceneDataLayerProviderState {}

async function getCorrelationsForDashboard(panels: VizPanel[]): Promise<CorrelationData[]> {
  // todo mixed scenario
  const datasources = panels
    .map((panel) => {
      const qr = getQueryRunnerFor(panel);
      return qr?.state.datasource;
    })
    .filter((ds): ds is DataSourceRef => !!ds && ds.uid !== undefined)
    .map((ds) => ds.uid!);
  return (await getCorrelationsBySourceUIDs(datasources)).correlations;
}

export class CorrelationsDataLayer
  extends SceneDataLayerBase<CorrelationsDataLayerState>
  implements SceneDataLayerProvider
{
  private _timeRangeSub: Unsubscribable | undefined;
  public topic = DataTopic.Correlations;

  public constructor(initialState: CorrelationsDataLayerState) {
    super({
      isEnabled: true,
      ...initialState,
      isHidden: true,
    });
  }

  public onEnable(): void {
    const timeRange = sceneGraph.getTimeRange(this);

    this._timeRangeSub = timeRange.subscribeToState(() => {
      this.run();
    });
  }

  public onDisable(): void {
    this._timeRangeSub?.unsubscribe();
  }

  public runLayer() {
    console.log('run layer');
    this.run();
  }

  private async run() {
    console.log('run');
    const dashboard = getDashboardSceneFor(this);
    const panels = dashboard.state.body.getVizPanels();

    if (this.querySub) {
      this.querySub.unsubscribe();
    }

    const fetchData: () => Promise<CorrelationData[]> = async () => {
      console.log('fetch data');
      return getCorrelationsForDashboard(panels);
    };

    const correlationsExecution = from(fetchData());

    /*
      const wat2 = forkJoin(panels.map((panel) => sceneGraph.getData(panel).getResultsStream()));
        const wat = await lastValueFrom(wat2.pipe());
    */

    const wat = forkJoin(
      panels.map((panel) => {
        /*const dataProvider = sceneGraph.getData(panel);
      const wat3 = getDataProviderToSubscribeTo(dataProvider);
      return wat3.state.$data; */
        return sceneGraph.getData(panel).getResultsStream();
      })
    ).pipe(
      map((data) => {
        console.log('panel', data);
        return data;
      })
    );

    this.querySub = forkJoin([correlationsExecution, wat]).subscribe({
      next: async (stateUpdate) => {
        console.log(stateUpdate);
      },
    });

    /*this.querySub = forkJoin([correlationsExecution, ...panelsObs]).subscribe({
      next: (res) => {
        console.log('subscribe next');
        const correlations = res[0];

        if (correlations.length > 0) {
          const panels: SceneDataProviderResult[] = res.splice(1).map((a) => a as SceneDataProviderResult);
          panels.forEach((panel) => {
            if (panel.data.request?.targets !== undefined) {
              const queryRefIdToDataSourceUid = mapValues(
                groupBy(panel.data.request?.targets, 'refId'),
                '0.datasource.uid'
              );
              const dataFramesWithCorrelations = attachCorrelationsToDataFrames(
                panel.data.series,
                correlations!,
                queryRefIdToDataSourceUid
              );

              console.log(dataFramesWithCorrelations);
            }
          });
        }
      },
      error: (err) => {
        this.handleError(err);
      },
    }); */
  }

  private handleError = (err: unknown) => {
    const notification = createErrorNotification('CorrelationsDataLayer', getMessageFromError(err));
    dispatch(notifyApp(notification));
  };
}

function getDataProviderToSubscribeTo(dataProvider: SceneDataProvider): SceneDataProvider<SceneDataState> {
  if (dataProvider instanceof SceneDataTransformer && dataProvider.state.$data) {
    return dataProvider.state.$data;
  }

  return dataProvider;
}
