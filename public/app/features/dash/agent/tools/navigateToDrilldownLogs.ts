import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { locationService } from '@grafana/runtime';

import { lokiTypeRefiner } from './refiners';

const navigateToDrilldownLogsSchema = z.object({
  datasource_uid: z
    .string()
    .describe('Datasource UID that will execute the query')
    .refine(lokiTypeRefiner.func, lokiTypeRefiner.message),
  label_filters: z
    .array(z.string())
    .describe(
      'Array of Loki indexed labels to include in the filters with the following format: label_name|=|label_value'
    ),
  levels: z
    .array(z.string())
    .optional()
    .describe(
      'Array of error levels to include in the filters. Use only valid error levels like error, err, warning, warn, critical, info, debug.'
    ),
  navigate: z
    .boolean()
    .describe(
      'Whether to navigate to the Drilldown Logs page. Only ever set this to true if the user has confirmed to navigate to Drilldown Logs.'
    ),
});

export const navigateToDrilldownLogs = tool(
  async (input) => {
    const { datasource_uid, label_filters, levels = [], navigate } = navigateToDrilldownLogsSchema.parse(input);

    const varFilters = label_filters.map((filter) => `var-filters=${encodeURIComponent(filter)}`);
    const varLevels = levels.map((level) => `var-levels=${encodeURIComponent(`detected_level|=|${level}`)}`);

    const url = `/a/grafana-lokiexplore-app/explore/service_name/grafana/logs?from=now-15m&to=now&var-ds=${datasource_uid}&${varFilters.join('&')}&${varLevels.join('&')}`;
    if (navigate) {
      locationService.push(url);
    }

    return url;
  },
  {
    name: 'navigate_to_drilldown_logs',
    description:
      'Use this tool when the user wants to see their logs in the Drilldown Logs app with a set of indexed labels and optional error levels.  NEVER use it without asking the user for confirmation.',
    schema: navigateToDrilldownLogsSchema,
  }
);
