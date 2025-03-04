import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { locationService } from '@grafana/runtime';

const listDatasourcesSchema = z.object({
  uid: z.string().describe('Datasource UID that will execute the query'),
  label_filters: z
    .array(z.string())
    .describe(
      'Array of Loki indexed labels to include in the filters with the following format: label_name|=|label_value'
    ),
  levels: z
    .array(z.enum(['critical', 'error', 'debug', 'info', 'warning']))
    .optional()
    .describe('Array of error levels to include in the filters.'),
});

export const navigateToDrilldownLogs = tool(
  async (input) => {
    const { uid, label_filters, levels = [] } = listDatasourcesSchema.parse(input);

    const varFilters = label_filters.map((filter) => `var-filters=${encodeURIComponent(filter)}`);
    const varLevels = levels.map((level) => `var-levels=${encodeURIComponent(`detected_level|=|${level}`)}`);

    locationService.push(
      `/a/grafana-lokiexplore-app/explore/service_name/grafana/logs?from=now-15m&to=now&var-ds=${uid}&${varFilters.join('&')}&${varLevels.join('&')}`
    );

    return 'success';
  },
  {
    name: 'navigate_to_drilldown_logs',
    description:
      'Use this tool when the user wants to see their logs in the Drilldown Logs app with a set of indexed labels and optional error levels.  NEVER use it without user confirmation.',
    schema: listDatasourcesSchema,
  }
);
