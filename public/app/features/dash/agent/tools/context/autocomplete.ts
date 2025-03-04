import { TriggerType } from '@webscopeio/react-textarea-autocomplete';

import { getDataSources } from 'app/features/datasources/api';

const providers = ['dashboard', 'metrics_name', 'label_name', 'datasource', 'label_value'];

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
    case 'datasource':
      return datasourceDataProvider;
    default:
      return notImplementedDataProvider;
  }
}

async function datasourceDataProvider(token: string) {
  // Removes the dashboard prefix from the trigger
  const actualToken = token.substring(10);
  const dataSources = await getDataSources();

  return dataSources
    .filter((ds) => ds.name.startsWith(actualToken) || ds.type.startsWith(actualToken))
    .map((ds) => ds.name);
}

function notImplementedDataProvider() {
  return ['not', 'yet', 'implemented'];
}
