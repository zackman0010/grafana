import { ExploreUrlState } from '@grafana/data';

import { AppContext, AppIdentifiers } from './app';
import { PageContext } from './page';

export interface QueryContext {
  expression: string;
}

const unknown: QueryContext = {
  expression: '',
} as const;

export function getQueryContext({ url_parameters }: PageContext, { id }: AppContext): QueryContext {
  switch (id) {
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
          expression: panes[keys[0]].queries[0]?.expr ?? unknown.expression,
        };
      }

      return unknown;
    }

    default:
      return unknown;
  }
}
