import { ExploreUrlState } from '@grafana/data';

import { AppContext, AppIdentifiers } from './app';
import { PageContext } from './page';

export interface DataSourceContext {
  type: string;
}

const unknown: DataSourceContext = {
  type: 'Unknown',
} as const;

export function getDataSourceContext({ url_parameters }: PageContext, { id }: AppContext): DataSourceContext {
  switch (id) {
    case AppIdentifiers.DrilldownLogs:
      return {
        type: 'loki',
      };

    case AppIdentifiers.Explore: {
      if (!url_parameters.panes) {
        return unknown;
      }

      let panes: ExploreUrlState | undefined = undefined;

      try {
        panes = JSON.parse(url_parameters.panes.toString());
      } catch (e) {
        console.error(e);
      }

      if (!panes) {
        return unknown;
      }

      const keys = Object.keys(panes);
      // @ts-expect-error
      if (keys[0] in panes && panes[keys[0]].queries) {
        return {
          // @ts-expect-error
          type: panes[keys[0]].queries[0]?.datasource?.type ?? unknown.type,
        };
      }

      return unknown;
    }

    default:
      return unknown;
  }
}
