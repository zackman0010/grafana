import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { locationService } from '@grafana/runtime';
import { getDatasourceSrv } from 'app/features/plugins/datasource_srv';

import { lokiOrPrometheusTypeRefiner } from './refiners';


const navigateToExploreSchema = z.object({
  datasource_uid: z.string().describe('Datasource UID that will execute the query').refine(lokiOrPrometheusTypeRefiner.func, lokiOrPrometheusTypeRefiner.message),
  query: z.string().describe('Query to be executed'),
  navigate: z.boolean().describe('Whether to navigate to the Explore page. Only ever set this to true if the user has confirmed to navigate to Explore.'),
});

export const navigateToExploreTool = tool(
  async (input) => {
    const { datasource_uid, query, navigate } = navigateToExploreSchema.parse(input);
    const type = getDatasourceSrv().getAll().find((ds) => ds.uid === datasource_uid)?.type;

    const panes = {
      dash: {
        datasource: datasource_uid,
        queries: [
          {
            refId: 'A',
            expr: query,
            datasource: {
              type: type,
              uid: datasource_uid,
            },
          },
        ],
        range: {
          from: 'now-1h',
          to: 'now',
        },
      },
    };

    const url = `/explore?schemaVersion=1&panes=${JSON.stringify(panes)}`;
    if (navigate) {
      locationService.push(url);
    }

    return url;
  },
  {
    name: 'navigate_to_explore',
    description:
      'Use this tool when the user wants to execute a query in Grafana Explore. NEVER use it without asking the user for confirmation.',
    schema: navigateToExploreSchema,
  }
);
