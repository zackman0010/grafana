import { dashboardPanelsTool } from './dashboardPanels';
import { listDatasourcesTool } from './listDatasources';
import { lokiLabelNamesTool } from './lokiLabelNames';
import { lokiLabelValuesTool } from './lokiLabelValues';
import { navigateToDrilldownLogs } from './navigateToDrilldownLogs';
import { navigateToExploreTool } from './navigateToExplore';
import { prometheusInstantQueryTool } from './prometheusInstantQuery';
import { prometheusLabelNamesTool } from './prometheusLabelNames';
import { prometheusLabelValuesTool } from './prometheusLabelValues';
import { prometheusRangeQueryTool } from './prometheusRangeQuery';

export const tools = [
  listDatasourcesTool,
  prometheusLabelValuesTool,
  prometheusLabelNamesTool,
  prometheusInstantQueryTool,
  prometheusRangeQueryTool,
  dashboardPanelsTool,
  lokiLabelNamesTool,
  lokiLabelValuesTool,
  navigateToExploreTool,
  navigateToDrilldownLogs,
];

export const toolsByName = tools.reduce(
  (acc, tool) => {
    acc[tool.name] = tool;
    return acc;
  },
  {} as Record<string, (typeof tools)[number]>
);
