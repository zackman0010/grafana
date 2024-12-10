// Libraries
import { pick } from 'lodash';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom-v5-compat';
import { usePrevious } from 'react-use';

import { PageLayoutType } from '@grafana/data';
import { sidecarServiceSingleton_EXPERIMENTAL } from '@grafana/runtime';
import { UrlSyncContextProvider } from '@grafana/scenes';
import { Alert, Box } from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';
import PageLoader from 'app/core/components/PageLoader/PageLoader';
import { GrafanaRouteComponentProps } from 'app/core/navigation/types';
import { DashboardPageRouteParams, DashboardPageRouteSearchParams } from 'app/features/dashboard/containers/types';
import { DashboardRoutes } from 'app/types';

import { DashboardPrompt } from '../saving/DashboardPrompt';

import { getDashboardScenePageStateManager } from './DashboardScenePageStateManager';
import { DashboardScene } from '../scene/DashboardScene';

export interface Props
  extends Omit<GrafanaRouteComponentProps<DashboardPageRouteParams, DashboardPageRouteSearchParams>, 'match'> {}

export function DashboardScenePage({ route, queryParams, location }: Props) {
  const params = useParams();
  const { type, slug, uid } = params;
  const prevMatch = usePrevious({ params });
  const stateManager = getDashboardScenePageStateManager();
  const { dashboard, isLoading, loadError } = stateManager.useState();
  // After scene migration is complete and we get rid of old dashboard we should refactor dashboardWatcher so this route reload is not need
  const routeReloadCounter = (location.state as any)?.routeReloadCounter;

  function getPanel(key: string) {
    const state = dashboard!.state;
    return state.body.state.grid.state.children
      .map((c) => c.state.body)
      .find((panel) => {
        return panel.state.key === key;
      });
  }

  const tools = [
    {
      call: (args: { panelKey: string; query: string }) => {
        const panel = getPanel(args.panelKey);
        const queries = panel!.state.$data.state.$data.state.queries;

        panel!.state.$data.state.$data.setState({
          queries: [
            {
              ...queries[0],
              expr: args.query,
            },
          ],
        });
        panel!.state.$data.state.$data.runQueries();
      },
      definition: {
        type: 'function',
        function: {
          name: 'modify_query',
          description: 'Modifies query in the panel defined by the panelId parameter',
          parameters: {
            type: 'object',
            properties: {
              panelKey: {
                type: 'string',
                description: 'Key of the dashboard panel which query should be modified',
              },
              query: {
                type: 'string',
                description: 'The new query to be set in the panel',
              },
            },
            required: ['panelKey', 'query'],
            additionalProperties: false,
          },
        },
      },
    },
    {
      call: (args: {
        panelKey: string;
        config: { color?: string; thresholds?: { steps: Array<{ color: string; value: number }> } };
      }) => {
        const panel = getPanel(args.panelKey);

        const newDefaults = {};
        if (args.config.color) {
          newDefaults.color = {
            mode: 'fixed',
            fixedColor: args.config.color,
          };
        }

        if (args.config.thresholds) {
          newDefaults.thresholds = {
            mode: 'absolute',
            steps: [{ color: 'green', value: -Infinity }, ...args.config.thresholds.steps],
          };

          newDefaults.custom = {
            ...panel.state.fieldConfig.defaults.custom,
            thresholdsStyle: {
              mode: 'area',
            },
          };
        }

        panel.setState({
          fieldConfig: {
            ...panel.state.fieldConfig,
            defaults: {
              ...panel.state.fieldConfig.defaults,
              ...newDefaults,
            },
          },
        });
        panel!.state.$data.state.$data.runQueries();
      },
      definition: {
        type: 'function',
        function: {
          name: 'modify_panel_config',
          description: 'Modifies panel configuration which includes changing color and thresholds.',
          parameters: {
            type: 'object',
            properties: {
              panelKey: {
                type: 'string',
                description: 'Key of the dashboard panel which query should be modified',
              },
              config: {
                type: 'object',
                properties: {
                  color: {
                    description: 'Color of the graph line in the panel',
                    type: 'string',
                  },
                  thresholds: {
                    description: 'Definition of the thresholds applied to the panel',
                    type: 'object',
                    required: ['steps'],
                    properties: {
                      steps: {
                        description: 'Array of threshold steps',
                        type: 'array',
                        items: {
                          description: 'Definition of single threshold step',
                          required: ['color', 'value'],
                          type: 'object',
                          properties: {
                            color: {
                              type: 'string',
                              description: 'Color of the threshold line',
                            },
                            value: {
                              type: 'number',
                              description: 'Value of the threshold',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            required: ['panelKey', 'config'],
            additionalProperties: false,
          },
        },
      },
    },
  ];

  useEffect(() => {
    sidecarServiceSingleton_EXPERIMENTAL.registerContextGetter(() => {
      let obj;
      try {
        obj = toSimpleObject(dashboard);
      } catch (error) {
        console.error('Failed to serialize dashboard state', error);
        throw error;
      }
      return {
        context: {
          dashboard: JSON.stringify(obj),
        },
        tools: tools,
      };
    });

    return () => sidecarServiceSingleton_EXPERIMENTAL.unregisterContextGetter();
  }, [dashboard, tools]);

  useEffect(() => {
    if (route.routeName === DashboardRoutes.Normal && type === 'snapshot') {
      stateManager.loadSnapshot(slug!);
    } else {
      stateManager.loadDashboard({
        uid: uid ?? '',
        route: route.routeName as DashboardRoutes,
        urlFolderUid: queryParams.folderUid,
      });
    }

    return () => {
      stateManager.clearState();
    };
  }, [stateManager, uid, route.routeName, queryParams.folderUid, routeReloadCounter, slug, type]);

  if (!dashboard) {
    return (
      <Page navId="dashboards/browse" layout={PageLayoutType.Canvas} data-testid={'dashboard-scene-page'}>
        <Box paddingY={4} display="flex" direction="column" alignItems="center">
          {isLoading && <PageLoader />}
          {loadError && (
            <Alert title="Dashboard failed to load" severity="error" data-testid="dashboard-not-found">
              {loadError}
            </Alert>
          )}
        </Box>
      </Page>
    );
  }

  // Do not render anything when transitioning from one dashboard to another
  // A bit tricky for transition to or from Home dashboard that does not have a uid in the url (but could have it in the dashboard model)
  // if prevMatch is undefined we are going from normal route to home route or vice versa
  if (type !== 'snapshot' && (!prevMatch || uid !== prevMatch?.params.uid)) {
    console.log('skipping rendering');
    return null;
  }

  return (
    <UrlSyncContextProvider scene={dashboard} updateUrlOnInit={true} createBrowserHistorySteps={true}>
      <dashboard.Component model={dashboard} key={dashboard.state.key} />
      <DashboardPrompt dashboard={dashboard} />
    </UrlSyncContextProvider>
  );
}

function toSimpleObject(dashboardScene?: DashboardScene): Record<string, unknown> {
  if (!dashboardScene) {
    return { err: 'No dashboard scene' };
  }
  const state = dashboardScene.state;
  return {
    ...pick(state, ['title', 'description', 'tags', 'meta']),
    timeRange: {
      ...pick(state.$timeRange?.state, ['from', 'to', 'timeZone']),
    },
    panels: state.body.state.grid.state.children.map((c) => {
      const panel = c.state.body;

      return {
        ...pick(panel.state, ['key', 'title', 'pluginVersion']),
        queries: panel.state.$data.state.$data.state.queries.map((q) => {
          return {
            ...pick(q, ['datasource', 'expr', 'instant']),
          };
        }),
      };
    }),
  };
}

// function toSimpleObject2(something: any, depth = 0): Record<string, unknown> {
//   const obj: Record<string, unknown> = {};
//   if (depth > 5) {
//     return { err: 'Max depth reached' };
//   }
//
//   for (const key of Object.keys(something)) {
//     const value = something[key];
//
//     console.log('processing', key);
//
//     if (!value) {
//       continue;
//     }
//
//     if (typeof value === 'string' || typeof value === 'number') {
//       obj[key] = value;
//       continue;
//     }
//
//     if (value.state) {
//       obj[key] = toSimpleObject(value.state, depth + 1);
//       continue;
//     }
//
//     if (Array.isArray(value)) {
//       obj[key] = value.map((val) => toSimpleObject(val, depth + 1));
//       continue;
//     }
//
//     if (typeof value === 'object') {
//       obj[key] = toSimpleObject(value, depth + 1);
//       continue;
//     }
//   }
//
//   return obj;
// }

export default DashboardScenePage;

// "{"title":"grot","description":"","tags":[],"meta":{"type":"db","canSave":true,"canEdit":true,"canAdmin":true,"canStar":true,"canDelete":true,"slug":"grot","url":"/d/de5uwbhpvkiyod/grot","expires":"0001-01-01T00:00:00Z","created":"2024-12-04T13:59:33+01:00","updated":"2024-12-04T13:59:33+01:00","updatedBy":"admin","createdBy":"admin","version":1,"hasAcl":false,"isFolder":false,"folderId":0,"folderUid":"","folderTitle":"General","folderUrl":"","provisioned":false,"provisionedExternalId":"","annotationsPermissions":{"dashboard":{"canAdd":true,"canEdit":true,"canDelete":true},"organization":{"canAdd":true,"canEdit":true,"canDelete":true}},"canShare":true,"showSettings":true,"canMakeEditable":false,"hasUnsavedFolderChange":false},"timeRange":{"from":"now-6h","to":"now","timeZone":"browser"},"panels":[{"title":"Panel Title","pluginVersion":"11.4.0-pre","queries":[{"datasource":{"type":"prometheus","uid":"cc1afed6-6493-4f84-9a45-4b607943e6ae"},"expr":"prometheus_http_requests_total","instant":false}]}]}"
