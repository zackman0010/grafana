import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { getDataSources } from 'app/features/datasources/api';

const listDatasourcesSchema = z.object({
  uid: z.string().optional().describe('Optional datasource UID for exact matching'),
  name: z.string().optional().describe('Optional datasource name (can be a regex pattern)'),
});

export const listDatasourcesTool = tool(
  async (input) => {
    // Parse the input using the schema
    const parsedInput = listDatasourcesSchema.parse(input);
    const { uid, name } = parsedInput;
    let filteredDatasources = await getDataSources();

    if (uid) {
      filteredDatasources = filteredDatasources.filter((ds) => ds.uid === uid);
    }

    if (name) {
      try {
        const nameRegex = new RegExp(name);
        filteredDatasources = filteredDatasources.filter((ds) => nameRegex.test(ds.name));
      } catch (error) {
        // If regex is invalid, treat it as a simple string match
        filteredDatasources = filteredDatasources.filter((ds) => ds.name.includes(name));
      }
    }

    return JSON.stringify(filteredDatasources);
  },
  {
    name: 'list_datasources',
    description: 'List all datasources. Can filter by uid (exact match) or name (regex pattern).',
    schema: listDatasourcesSchema,
  }
);
