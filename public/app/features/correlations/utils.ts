import { lastValueFrom, of } from 'rxjs';

import { DataFrame, DataLinkConfigOrigin } from '@grafana/data';
import {
  config,
  CorrelationData,
  CorrelationsData,
  createMonitoringLogger,
  FetchResponse,
  getBackendSrv,
  getDataSourceSrv,
} from '@grafana/runtime';
import { ExploreItemState } from 'app/types';

import { formatValueName } from '../explore/PrometheusListView/ItemLabels';
import { parseLogsFrame } from '../logs/logsFrame';

import { CreateCorrelationParams, CreateCorrelationResponse } from './types';
import { CorrelationsResponse, getData, toEnrichedCorrelationsData } from './useCorrelations';

type DataFrameRefIdToDataSourceUid = Record<string, string>;

/**
 * Creates data links from provided CorrelationData object
 *
 * @param dataFrames list of data frames to be processed
 * @param correlations list of of possible correlations that can be applied
 * @param dataFrameRefIdToDataSourceUid a map that for provided refId references corresponding data source ui
 */
export const attachCorrelationsToDataFrames = (
  dataFrames: DataFrame[],
  correlations: CorrelationData[],
  dataFrameRefIdToDataSourceUid: DataFrameRefIdToDataSourceUid
): DataFrame[] => {
  dataFrames.forEach((dataFrame) => {
    const frameRefId = dataFrame.refId;
    if (!frameRefId) {
      return;
    }
    let dataSourceUid = dataFrameRefIdToDataSourceUid[frameRefId];

    // rawPrometheus queries append a value to refId to a separate dataframe for the table view
    if (dataSourceUid === undefined && dataFrame.meta?.preferredVisualisationType === 'rawPrometheus') {
      const formattedRefID = formatValueName(frameRefId);
      dataSourceUid = dataFrameRefIdToDataSourceUid[formattedRefID];
    }

    const sourceCorrelations = correlations.filter((correlation) => correlation.source.uid === dataSourceUid);
    decorateDataFrameWithInternalDataLinks(dataFrame, fixLokiDataplaneFields(sourceCorrelations, dataFrame));
  });

  return dataFrames;
};

const decorateDataFrameWithInternalDataLinks = (dataFrame: DataFrame, correlations: CorrelationData[]) => {
  dataFrame.fields.forEach((field) => {
    field.config.links = field.config.links?.filter((link) => link.origin !== DataLinkConfigOrigin.Correlations) || [];
    correlations.map((correlation) => {
      if (correlation.config.field === field.name) {
        if (correlation.type === 'query') {
          const targetQuery = correlation.config.target || {};
          field.config.links!.push({
            internal: {
              query: { ...targetQuery, datasource: { uid: correlation.target.uid } },
              datasourceUid: correlation.target.uid,
              datasourceName: correlation.target.name,
            },
            url: '',
            title: correlation.label || correlation.target.name,
            origin: DataLinkConfigOrigin.Correlations,
            meta: {
              transformations: correlation.config.transformations,
            },
          });
        } else if (correlation.type === 'external') {
          const externalTarget = correlation.config.target;
          field.config.links!.push({
            url: externalTarget.url,
            title: correlation.label || 'External URL',
            origin: DataLinkConfigOrigin.Correlations,
            meta: {
              transformations: correlation.config?.transformations,
              linkAttributes: correlation.linkAttributes,
            },
          });
        }
      }
    });
  });
};

/*
If a correlation was made based on the log line field prior to the loki data plane, they would use the field "Line"

Change it to use whatever the body field name is post-loki data plane
*/
const fixLokiDataplaneFields = (correlations: CorrelationData[], dataFrame: DataFrame) => {
  return correlations.map((correlation) => {
    if (
      correlation.source.meta?.id === 'loki' &&
      config.featureToggles.lokiLogsDataplane === true &&
      correlation.config.field === 'Line'
    ) {
      const logsFrame = parseLogsFrame(dataFrame);
      if (logsFrame != null && logsFrame.bodyField.name !== undefined) {
        correlation.config.field = logsFrame?.bodyField.name;
      }
    }
    return correlation;
  });
};

export const getCorrelationsBySourceUIDs = async (sourceUIDs: string[]): Promise<CorrelationsData> => {
  return lastValueFrom(
    // getBackendSrv().fetch<CorrelationsResponse>({
    //   url: `/api/datasources/correlations`,
    //   method: 'GET',
    //   showErrorAlert: false,
    //   params: {
    //     sourceUID: sourceUIDs,
    //   },
    // })
    // For the hackathon I'm hard coding the correlations like this to avoid spending time
    // on CRUD work just to be able to set the linkAttributes property which is a new property
    of({
      data: {
        status: '200',
        correlations: [
          {
            uid: 'appo11y-namespace-and-name',
            sourceUID: 'grafanacloud-traces',
            orgId: 1,
            label: 'Application observability > Service overview',
            type: 'external',
            provisioned: false,
            linkAttributes: ['service.namespace', 'service.name'],
            config: {
              field: 'traceID',
              target: {
                url: '/a/grafana-app-observability-app/services/service/${__span.tags["service.namespace"]}---${__span.tags["service.name"]}',
              },
            },
          },
          {
            uid: 'appo11y-name',
            sourceUID: 'grafanacloud-traces',
            orgId: 1,
            label: 'Application observability > Service overview',
            type: 'external',
            provisioned: false,
            linkAttributes: ['service.name'],
            config: {
              field: 'traceID',
              target: {
                url: '/a/grafana-app-observability-app/services/service/${__span.tags["service.name"]}',
              },
            },
          },
          {
            uid: 'k8s-cluster',
            sourceUID: 'grafanacloud-traces',
            orgId: 1,
            label: 'Kubernetes monitoring > Cluster view',
            type: 'external',
            provisioned: false,
            linkAttributes: ['k8s.cluster.name'],
            config: {
              field: 'traceID',
              target: {
                url: 'https://appo11ydev01.grafana-dev.net/a/grafana-k8s-app/navigation/cluster/${__span.tags["k8s.cluster.name"]}',
              },
            },
          },
          {
            uid: 'k8s-namespace',
            sourceUID: 'grafanacloud-traces',
            orgId: 1,
            label: 'Kubernetes monitoring > Namespace view',
            type: 'external',
            provisioned: false,
            linkAttributes: ['k8s.namespace.name'],
            config: {
              field: 'traceID',
              target: {
                url: 'https://appo11ydev01.grafana-dev.net/a/grafana-k8s-app/navigation/namespace/${__span.tags["k8s.cluster.name"]}/${__span.tags["k8s.namespace.name"]}',
              },
            },
          },
          {
            uid: 'k8s-node',
            sourceUID: 'grafanacloud-traces',
            orgId: 1,
            label: 'Kubernetes monitoring > Node view',
            type: 'external',
            provisioned: false,
            linkAttributes: ['k8s.node.name'],
            config: {
              field: 'traceID',
              target: {
                url: 'https://appo11ydev01.grafana-dev.net/a/grafana-k8s-app/navigation/nodes/${__span.tags["k8s.cluster.name"]}/${__span.tags["k8s.node.name"]}',
              },
            },
          },
          {
            uid: 'k8s-deployment',
            sourceUID: 'grafanacloud-traces',
            orgId: 1,
            label: 'Kubernetes monitoring > Deployment view',
            type: 'external',
            provisioned: false,
            linkAttributes: ['k8s.deployment.name'],
            config: {
              field: 'traceID',
              target: {
                url: 'https://appo11ydev01.grafana-dev.net/a/grafana-k8s-app/navigation/namespace/${__span.tags["k8s.cluster.name"]}/${__span.tags["k8s.namespace.name"]}/deployment/${__span.tags["k8s.deployment.name"]}',
              },
            },
          },
          {
            uid: 'k8s-pod',
            sourceUID: 'grafanacloud-traces',
            orgId: 1,
            label: 'Kubernetes monitoring > Pod view',
            type: 'external',
            provisioned: false,
            linkAttributes: ['k8s.pod.name'],
            config: {
              field: 'traceID',
              target: {
                url: 'https://appo11ydev01.grafana-dev.net/a/grafana-k8s-app/navigation/namespace/${__span.tags["k8s.cluster.name"]}/${__span.tags["k8s.namespace.name"]}/deployment/${__span.tags["k8s.deployment.name"]}/${__span.tags["k8s.pod.name"]}',
              },
            },
          },
          {
            uid: 'fe-o11y',
            sourceUID: 'grafanacloud-traces',
            orgId: 1,
            label: 'Frontend observability',
            type: 'external',
            provisioned: false,
            linkAttributes: ['gf.feo11y.app.id', 'gf.feo11y.app.name'],
            config: {
              field: 'traceID',
              target: {
                // url: 'https://appo11ydev01.grafana-dev.net/a/grafana-k8s-app/navigation/namespace/${__span.tags["k8s.cluster.name"]}/${__span.tags["k8s.namespace.name"]}/deployment/${__span.tags["k8s.deployment.name"]}/${__span.tags["k8s.pod.name"]}',
                url: 'https://appo11y.grafana.net/a/grafana-kowalski-app/apps/${__span.tags["gf.feo11y.app.id"]}',
              },
            },
          },
          {
            uid: 'appo11y-namespace-and-name',
            sourceUID: 'grafanacloud-appo11y-traces',
            orgId: 1,
            label: 'Application observability > Service overview',
            type: 'external',
            provisioned: false,
            linkAttributes: ['service.namespace', 'service.name'],
            config: {
              field: 'traceID',
              target: {
                url: '/a/grafana-app-observability-app/services/service/${__span.tags["service.namespace"]}---${__span.tags["service.name"]}',
              },
            },
          },
          {
            uid: 'appo11y-name',
            sourceUID: 'grafanacloud-appo11y-traces',
            orgId: 1,
            label: 'Application observability > Service overview',
            type: 'external',
            provisioned: false,
            linkAttributes: ['service.name'],
            config: {
              field: 'traceID',
              target: {
                url: '/a/grafana-app-observability-app/services/service/${__span.tags["service.name"]}',
              },
            },
          },
          {
            uid: 'k8s-cluster',
            sourceUID: 'grafanacloud-appo11y-traces',
            orgId: 1,
            label: 'Kubernetes monitoring > Cluster view',
            type: 'external',
            provisioned: false,
            linkAttributes: ['k8s.cluster.name'],
            config: {
              field: 'traceID',
              target: {
                url: 'https://appo11ydev01.grafana-dev.net/a/grafana-k8s-app/navigation/cluster/${__span.tags["k8s.cluster.name"]}',
              },
            },
          },
          {
            uid: 'k8s-namespace',
            sourceUID: 'grafanacloud-appo11y-traces',
            orgId: 1,
            label: 'Kubernetes monitoring > Namespace view',
            type: 'external',
            provisioned: false,
            linkAttributes: ['k8s.namespace.name'],
            config: {
              field: 'traceID',
              target: {
                url: 'https://appo11ydev01.grafana-dev.net/a/grafana-k8s-app/navigation/namespace/${__span.tags["k8s.cluster.name"]}/${__span.tags["k8s.namespace.name"]}',
              },
            },
          },
          {
            uid: 'k8s-node',
            sourceUID: 'grafanacloud-appo11y-traces',
            orgId: 1,
            label: 'Kubernetes monitoring > Node view',
            type: 'external',
            provisioned: false,
            linkAttributes: ['k8s.node.name'],
            config: {
              field: 'traceID',
              target: {
                url: 'https://appo11ydev01.grafana-dev.net/a/grafana-k8s-app/navigation/nodes/${__span.tags["k8s.cluster.name"]}/${__span.tags["k8s.node.name"]}',
              },
            },
          },
          {
            uid: 'k8s-deployment',
            sourceUID: 'grafanacloud-appo11y-traces',
            orgId: 1,
            label: 'Kubernetes monitoring > Deployment view',
            type: 'external',
            provisioned: false,
            linkAttributes: ['k8s.deployment.name'],
            config: {
              field: 'traceID',
              target: {
                url: 'https://appo11ydev01.grafana-dev.net/a/grafana-k8s-app/navigation/namespace/${__span.tags["k8s.cluster.name"]}/${__span.tags["k8s.namespace.name"]}/deployment/${__span.tags["k8s.deployment.name"]}',
              },
            },
          },
          {
            uid: 'k8s-pod',
            sourceUID: 'grafanacloud-appo11y-traces',
            orgId: 1,
            label: 'Kubernetes monitoring > Pod view',
            type: 'external',
            provisioned: false,
            linkAttributes: ['k8s.pod.name'],
            config: {
              field: 'traceID',
              target: {
                url: 'https://appo11ydev01.grafana-dev.net/a/grafana-k8s-app/navigation/namespace/${__span.tags["k8s.cluster.name"]}/${__span.tags["k8s.namespace.name"]}/deployment/${__span.tags["k8s.deployment.name"]}/${__span.tags["k8s.pod.name"]}',
              },
            },
          },
          {
            uid: 'fe-o11y',
            sourceUID: 'grafanacloud-appo11y-traces',
            orgId: 1,
            label: 'Frontend observability',
            type: 'external',
            provisioned: false,
            linkAttributes: ['gf.feo11y.app.id', 'gf.feo11y.app.name'],
            config: {
              field: 'traceID',
              target: {
                url: 'https://appo11y.grafana.net/a/grafana-kowalski-app/apps/${__span.tags["gf.feo11y.app.id"]}',
              },
            },
          },
        ],
        page: 1,
        limit: 100,
        totalCount: 100,
      },
    } as unknown as FetchResponse<CorrelationsResponse>)
  )
    .then(getData)
    .then(toEnrichedCorrelationsData);
};

export const createCorrelation = async (
  sourceUID: string,
  correlation: CreateCorrelationParams
): Promise<CreateCorrelationResponse> => {
  return getBackendSrv().post<CreateCorrelationResponse>(`/api/datasources/uid/${sourceUID}/correlations`, correlation);
};

const getDSInstanceForPane = async (pane: ExploreItemState) => {
  if (pane.datasourceInstance?.meta.mixed) {
    return await getDataSourceSrv().get(pane.queries[0].datasource);
  } else {
    return pane.datasourceInstance;
  }
};

export const generateDefaultLabel = async (sourcePane: ExploreItemState, targetPane: ExploreItemState) => {
  return Promise.all([getDSInstanceForPane(sourcePane), getDSInstanceForPane(targetPane)]).then((dsInstances) => {
    return dsInstances[0]?.name !== undefined && dsInstances[1]?.name !== undefined
      ? `${dsInstances[0]?.name} to ${dsInstances[1]?.name}`
      : '';
  });
};

export const correlationsLogger = createMonitoringLogger('features.correlations');
