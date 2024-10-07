import { PluginExtensionPoints } from '@grafana/data';
import { QueryToAppPluginContext } from '@grafana/data/src/types/pluginExtensions';

import { createAddedLinkConfig } from '../plugins/extensions/utils';

import { decomposeAbstractQuery } from './utils';

export function profilesExtension() {
  return createAddedLinkConfig({
    title: 'Profiles',
    description: '...',
    targets: [PluginExtensionPoints.QueryToAppPlugin],
    onClick: () => {},
    configure(context?: QueryToAppPluginContext) {
      if (!context || !context.abstractQuery) {
        return;
      }

      const { abstractQuery, datasource, from, to, query } = context;
      const { serviceName, labels } = decomposeAbstractQuery(abstractQuery);

      const filters = labels
        .map((matcher) => {
          return `var-filters=${matcher.name}|=|${matcher.value}`;
        })
        .join('&');

      // profiles will figure out the default data source by itself
      const dsUID = datasource.type === 'grafana-pyroscope-datasource' ? datasource.uid : '';
      const profileTypeId = query?.profileTypeId || 'process_cpu:cpu:nanoseconds:cpu:nanoseconds';

      if (serviceName) {
        return {
          path: `/a/grafana-pyroscope-app/profiles-explorer?explorationType=labels&var-profileMetricId=${profileTypeId}&var-dataSource=${dsUID}&from=${from}&to=${to}&var-serviceName=${serviceName.value}&${filters}`,
          description: `Explore ${serviceName.value} service profiles`,
        };
      } else if (datasource.type === 'grafana-pyroscope-datasource' && query?.profileTypeId) {
        return {
          path: `/a/grafana-pyroscope-app/profiles-explorer?explorationType=all&var-profileMetricId=${profileTypeId}&var-dataSource=${dsUID}&from=${from}&to=${to}&var-serviceName=${serviceName?.value}&${filters}`,
          description: `Explore ${query?.profileTypeId} profiles`,
        };
      }

      return undefined;
    },
  });
}
