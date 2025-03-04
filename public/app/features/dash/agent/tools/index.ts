import { dashboardPanelsTool } from './dashboardPanels';
import { getCurrentTimeTool } from './getCurrentTime';
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
  getCurrentTimeTool,
  navigateToDashboardTool,
  navigateToOtherTool,
];

export const toolsByName = tools.reduce(
  (acc, tool) => {
    acc[tool.name] = tool;
    return acc;
  },
  {} as Record<string, (typeof tools)[number]>
);
