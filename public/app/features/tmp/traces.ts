import { PluginExtensionPoints } from '@grafana/data';
import { QueryToAppPluginContext } from '@grafana/data/src/types/pluginExtensions';
import { locationService } from '@grafana/runtime';

import { createAddedLinkConfig } from '../plugins/extensions/utils';

import { decomposeAbstractQuery } from './utils';

export function tracesExtension() {
  return createAddedLinkConfig({
    title: 'Traces',
    description: 'Test',
    targets: [PluginExtensionPoints.QueryToAppPlugin],
    onClick: () => {},
    configure(context?: QueryToAppPluginContext) {
      if (!context || !context.abstractQuery) {
        return;
      }

      const { abstractQuery, datasource, from, to, query, defaultDatasources } = context;
      const { serviceName, labels } = decomposeAbstractQuery(abstractQuery);

      const filters = labels
        .map((matcher) => {
          return `var-filters=${matcher.name}|=|${matcher.value}`;
        })
        .join('&');

      // profiles will figure out the default data source by itself
      const dsUID = datasource.type === 'tempo' ? datasource.uid : defaultDatasources.tempo.uid;

      if (serviceName) {
        return {
          path: `/a/grafana-exploretraces-app/explore?primarySignal=all_spans&var-ds=${dsUID}&var-metric=rate&actionView=breakdown&${filters}`,
          description: `Explore ${serviceName.value} traces`,
        };
      } else if (query.queryType === 'traceql') {
        return {
          path: `/a/grafana-exploretraces-app/explore?primarySignal=all_spans&var-ds=${dsUID}&var-metric=rate&actionView=breakdown&traceId=${query.query}`,
          description: 'Explore this trace',
        };
      }

      return undefined;
    },
  });
}
