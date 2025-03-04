import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { locationService } from '@grafana/runtime';

const listDatasourcesSchema = z.object({
  uid: z.string().describe('Datasource UID that will execute the query'),
  type: z.enum(['loki', 'prometheus']).describe('Type of the data source.'),
  query: z.string().describe('Query to be executed'),
});

export const navigateToExploreTool = tool(
  async (input) => {
    // Parse the input using the schema
    const { uid, query, type } = listDatasourcesSchema.parse(input);

    const panes = {
      dash: {
        datasource: uid,
        queries: [
          {
            refId: 'A',
            expr: query,
            datasource: {
              type: type,
              uid: uid,
            },
          },
        ],
        range: {
          from: 'now-1h',
          to: 'now',
        },
      },
    };

    locationService.push(`explore?schemaVersion=1&panes=${JSON.stringify(panes)}`);

    return 'success';
  },
  {
    name: 'navigate_to_explore',
    description:
      'Use this tool when the user wants to execute a query in Grafana Explore. NEVER use it without user confirmation',
    schema: listDatasourcesSchema,
  }
);
