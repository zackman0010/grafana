import { tool } from '@langchain/core/tools';

import { getDataSources } from 'app/features/datasources/api';

import { getCurrentContext } from './context';

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

export const pageContextTool = tool(
  async () => {
    const context = await getCurrentContext();
    return JSON.stringify(context);
  },
  {
    name: 'get_context',
    description: 'Data about the module where the user is at and the current state of the application',
  }
);

// Add more tools here as needed
export const tools = [pageContextTool, listDatasourcesTool];

// Create a map of tools by name for easy access
export const toolsByName = tools.reduce((acc, tool) => {
  acc[tool.name] = tool;
  return acc;
}, {} as Record<string, typeof listDatasourcesTool>); 
