import { AbstractLabelOperator, PluginExtensionPoints } from '@grafana/data';
import { QueryToAppPluginContext } from '@grafana/data/src/types/pluginExtensions';

import { createAddedLinkConfig } from '../plugins/extensions/utils';

import { decomposeAbstractQuery } from './utils';

export function logsExtension() {
  return createAddedLinkConfig({
    title: 'Logs',
    description: '...',
    targets: [PluginExtensionPoints.QueryToAppPlugin],
    onClick: () => {},
    configure(context?: QueryToAppPluginContext) {
      if (!context || !context.abstractQuery) {
        return;
      }

      const { abstractQuery, datasource, from, to, defaultDatasources, query } = context;
      const { serviceName, labels } = decomposeAbstractQuery(abstractQuery);

      const filters = labels
        // logs require service-name in URL and filters
        .concat([{ name: 'service_name', operator: AbstractLabelOperator.Equal, value: serviceName.value }])
        .map((matcher) => {
          return `var-filters=${matcher.name}|=|${matcher.value}`;
        })
        .join('&');

      const dsUID = datasource.type === 'loki' ? datasource.uid : defaultDatasources.loki.uid;

      if (serviceName) {
        return {
          path: `/a/grafana-lokiexplore-app/explore/service/${serviceName.value}/logs?var-ds=${dsUID}&from=${from}&to=${to}&${filters}`,
          description: `Explore ${serviceName.value} logs`,
        };
      } else {
        return {
          path: `/a/grafana-lokiexplore-app/explore/`,
          description: `Explore all logs or provide service_name`,
        };
      }
    },
  });
}
