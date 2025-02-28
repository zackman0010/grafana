import { tool } from '@langchain/core/tools';

import { getDataSources } from 'app/features/datasources/api';

// Define tools
export const listDatasourcesTool = tool(
  async () => {
    const datasources = await getDataSources();
    return JSON.stringify(datasources);
  },
  {
    name: 'list_datasources',
    description: 'List all datasources',
  }
);

// Add more tools here as needed
export const tools = [listDatasourcesTool];

// Create a map of tools by name for easy access
export const toolsByName = tools.reduce((acc, tool) => {
  acc[tool.name] = tool;
  return acc;
}, {} as Record<string, typeof listDatasourcesTool>); 
