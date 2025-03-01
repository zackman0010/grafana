import { contextTool } from './context';
import { listDatasourcesTool } from './listDatasources';
import { prometheusInstantQueryTool } from './prometheusInstantQuery';
import { prometheusLabelNamesTool } from './prometheusLabelNames';
import { prometheusLabelValuesTool } from './prometheusLabelValues';
import { prometheusRangeQueryTool } from './prometheusRangeQuery';

export const tools = [
  contextTool,
  listDatasourcesTool,
  prometheusLabelValuesTool,
  prometheusLabelNamesTool,
  prometheusInstantQueryTool,
  prometheusRangeQueryTool,
];

export const toolsByName = tools.reduce(
  (acc, tool) => {
    acc[tool.name] = tool;
    return acc;
  },
  {} as Record<string, (typeof tools)[number]>
);
