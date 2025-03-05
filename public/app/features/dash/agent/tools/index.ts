import { TavilySearchResults } from '@langchain/community/tools/tavily_search';

import { dashboardSearchTool } from './dashboardSearch';
import { getCurrentTimeTool } from './getCurrentTime';
import { getDrilldownLogToSummarizeTool } from './getDrilldownLogToSummarize';
import { listDatasourcesTool } from './listDatasources';
import { lokiLabelNamesTool } from './lokiLabelNames';
import { lokiLabelValuesTool } from './lokiLabelValues';
import { navigateToDashboardTool } from './navigateToDashboard';
import { navigateToDrilldownLogs } from './navigateToDrilldownLogs';
import { navigateToExploreTool } from './navigateToExplore';
import { navigateToOtherTool } from './navigateToOther';
import { prometheusInstantQueryTool } from './prometheusInstantQuery';
import { prometheusLabelNamesTool } from './prometheusLabelNames';
import { prometheusLabelValuesTool } from './prometheusLabelValues';
import { prometheusMetricSearchTool } from './prometheusMetricSearch';
import { prometheusRangeQueryTool } from './prometheusRangeQuery';
import { createDashboardTool } from './tool_create_dashboard';
import { readDashboardPanelsTool } from './tool_read_dashboard_panels';
import { simulateToolError } from './tool_simulate_tool_error';
import { updateDashboardPanelsTool } from './tool_update_dashboard_panels';

const grafanaComSearch = new TavilySearchResults({
  apiKey: process.env.TAVILY_API_KEY,
  maxResults: 1,
  includeDomains: ['grafana.com'],
  includeRawContent: true,
  includeAnswer: true,
});
grafanaComSearch.name = 'grafana_com_search';
grafanaComSearch.description =
  'Search for general information, such as blog posts on grafana.com. Only use this tool if `grafana_com_docs_search` tool was not helpful.';

const grafanaDocsSearch = new TavilySearchResults({
  apiKey: process.env.TAVILY_API_KEY,
  maxResults: 1,
  includeDomains: ['grafana.com/docs/'],
  includeRawContent: true,
  includeAnswer: true,
});
grafanaDocsSearch.name = 'grafana_com_docs_search';
grafanaDocsSearch.description =
  'Search for documentation of Grafana, Grafana Cloud, and all the various Grafana applications. Use this tool over `grafana_com_search`.';

export const tools = [
  listDatasourcesTool,
  prometheusLabelValuesTool,
  prometheusLabelNamesTool,
  prometheusMetricSearchTool,
  prometheusInstantQueryTool,
  prometheusRangeQueryTool,
  createDashboardTool,
  readDashboardPanelsTool,
  lokiLabelNamesTool,
  lokiLabelValuesTool,
  navigateToExploreTool,
  navigateToDrilldownLogs,
  getCurrentTimeTool,
  grafanaComSearch,
  grafanaDocsSearch,
  navigateToDashboardTool,
  navigateToOtherTool,
  updateDashboardPanelsTool,
  getDrilldownLogToSummarizeTool,
  simulateToolError,
  dashboardSearchTool,
];

export const toolsByName = tools.reduce(
  (acc, tool) => {
    acc[tool.name] = tool;
    return acc;
  },
  {} as Record<string, (typeof tools)[number]>
);
