import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { getDatasourceSrv } from 'app/features/plugins/datasource_srv';

const listDatasourcesSchema = z.object({
  uid: z.string().optional().describe('Optional datasource UID for exact matching'),
  name: z.string().optional().describe('Optional datasource name (can be a regex pattern)'),
});

export const listDatasourcesTool = tool(
  async (input) => {
    // Parse the input using the schema
    const parsedInput = listDatasourcesSchema.parse(input);
    const { uid, name } = parsedInput;
    
    // Get all datasources using getDatasourceSrv
    let filteredDatasources = getDatasourceSrv().getList();

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

    // Reduce the datasources to only include relevant properties
    const simplifiedDatasources = filteredDatasources.map((ds) => ({
      uid: ds.uid,
      name: ds.name,
      type: ds.type,
    }));

    return JSON.stringify(simplifiedDatasources);
  },
  {
    name: 'list_datasources',
    description:
      'When there is no current data source, use this tool to get all the available data sources. Can filter by uid (exact match) or name (regex pattern).',
    schema: listDatasourcesSchema,
  }
);
