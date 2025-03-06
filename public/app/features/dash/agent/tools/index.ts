import { TavilySearchResults } from '@langchain/community/tools/tavily_search';

import { getAppEvents, ToolAddedEvent } from '@grafana/runtime';

import { dashboardSearchTool } from './dashboardSearch';
import { getDrilldownLogToSummarizeTool } from './getDrilldownLogToSummarize';
import { listDatasourcesTool } from './listDatasources';
import { lokiLabelNamesTool } from './lokiLabelNames';
import { lokiLabelValuesTool } from './lokiLabelValues';
import { navigateToDashboardTool } from './navigateToDashboard';
import { navigateToDeclareIncidentTool } from './navigateToDeclareIncident';
import { navigateToDrilldownLogs } from './navigateToDrilldownLogs';
import { navigateToExploreTool } from './navigateToExplore';
import { navigateToOtherTool } from './navigateToOther';
import { prometheusInstantQueryTool } from './prometheusInstantQuery';
import { prometheusLabelNamesTool } from './prometheusLabelNames';
import { prometheusLabelValuesTool } from './prometheusLabelValues';
import { prometheusMetricSearchTool } from './prometheusMetricSearch';
import { prometheusRangeQueryTool } from './prometheusRangeQuery';
import { addDashboardPanelsTool } from './toolAddDashboardPanels';
import { createDashboardTool } from './toolCreateDashboard';
import { simulateToolError } from './toolDevSimulateToolError';
import { devSleep } from './toolDevSleep';
import { readDashboardPanelsTool } from './toolReadDashboardPanels';
import { updateCurrentDashboardPanelsTool } from './toolUpdateCurrentDashboardPanels';

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
  grafanaComSearch,
  grafanaDocsSearch,
  navigateToDashboardTool,
  navigateToOtherTool,
  navigateToDeclareIncidentTool,
  updateCurrentDashboardPanelsTool,
  addDashboardPanelsTool,
  getDrilldownLogToSummarizeTool,
  simulateToolError,
  dashboardSearchTool,
  devSleep,
];

export const toolsByName = tools.reduce(
  (acc, tool) => {
    acc[tool.name] = tool;
    return acc;
  },
  {} as Record<string, (typeof tools)[number]>
);

let handle: number | undefined;
handle = window.setInterval(() => {
  const events = getAppEvents();
  if (events) {
    events.getStream(ToolAddedEvent).subscribe((event) => {
      const toolName = event.payload.tool.name;
      if (!Object.keys(toolsByName).includes(toolName)) {
        tools.push(event.payload.tool as (typeof tools)[number]);
        toolsByName[event.payload.tool.name as keyof typeof toolsByName] = event.payload.tool as (typeof tools)[number];
      }
    });
    window.clearInterval(handle);
  }
}, 500);
