import { TriggerType } from '@webscopeio/react-textarea-autocomplete';

import { backendSrv } from 'app/core/services/backend_srv';
import { getDataSources } from 'app/features/datasources/api';
import { DashboardSearchItem } from 'app/features/search/types';

const providers = [
  'metrics',
  'datasources',
  'dashboards',
  'labels',
  'alerts',
  'slos',
  'scopes',
  'investigations',
  'irm',
  'people',
];
//const providers = ['dashboard', 'datasource'];

export function dataProvider(token: string) {
  return providers.filter((provider) => provider.startsWith(token));
}

export function getProviderTriggers(component: React.FunctionComponent<{ entity: string }>) {
  const triggers: TriggerType<string> = {};

  for (const trigger of providers) {
    const provider = getDataProviderForTrigger(trigger);
    if (provider) {
      triggers[`@${trigger}`] = {
        dataProvider: provider,
        component,
        output: (item, trigger = '') => {
          return `${trigger}:\`${item}\``;
        },
        afterWhitespace: false,
      };
    }
  }

  return triggers;
}

function getDataProviderForTrigger(trigger: string) {
  switch (trigger) {
    case 'Datasources':
      return datasourceDataProvider;
    case 'Dashboards':
      return dashboardDataProvider;
    default:
      return notImplementedDataProvider;
  }
}

async function datasourceDataProvider(token: string) {
  // Removes the datasource prefix from the trigger
  const actualToken = token.substring(10);
  const dataSources = await getDataSources();

  return dataSources
    .filter((ds) => ds.name.startsWith(actualToken) || ds.type.startsWith(actualToken))
    .map((ds) => ds.name);
}

let dashboards: DashboardSearchItem[];
async function dashboardDataProvider(token: string) {
  // Removes the dashboard prefix from the trigger
  const actualToken = token.substring(9);

  if (!dashboards) {
    await getDashboards();
  }
  return dashboards
    .filter(
      (dashboard) => dashboard.title.startsWith(actualToken) || dashboard.title.toLowerCase().startsWith(actualToken)
    )
    .slice(0, 10)
    .map((dashboard) => dashboard.title);
}

export async function getDashboards(): Promise<DashboardSearchItem[]> {
  if (!dashboards) {
    dashboards = await backendSrv.search({});
  }
  return dashboards;
}

function notImplementedDataProvider() {
  return ['coming', 'soon', "don't forget to vote"];
}
