import { PluginExtensionPoints } from '@grafana/data';
import { QueryToAppPluginContext } from '@grafana/data/src/types/pluginExtensions';
import { locationService } from '@grafana/runtime';

import { createAddedLinkConfig } from '../plugins/extensions/utils';

import { decomposeAbstractQuery } from './utils';

export function metricsExtension() {
  return createAddedLinkConfig({
    title: 'Metrics',
    description: '...',
    targets: [PluginExtensionPoints.QueryToAppPlugin],
    onClick: () => {},
    configure(context?: QueryToAppPluginContext) {
      if (!context || !context.abstractQuery) {
        return;
      }

      const { abstractQuery, datasource, from, to, defaultDatasources, query } = context;

      // just use labels, as service name is not in use
      const filters = abstractQuery.labelMatchers
        .map((matcher) => {
          return `var-filters=${matcher.name}|=|${matcher.value}`;
        })
        .join('&');

      const displayFilters = abstractQuery.labelMatchers.map((m) => m.name).join(', ');

      const dsUID = datasource.type === 'prometheus' ? datasource.uid : defaultDatasources.prometheus.uid;

      if (abstractQuery.labelMatchers.length) {
        return {
          path: `/explore/metrics/trail?&var-ds=${dsUID}&from=${from}&to=${to}&${filters}`,
          description: `Explore metrics for ${displayFilters} labels`,
        };
      }

      return undefined;
    },
  });
}
