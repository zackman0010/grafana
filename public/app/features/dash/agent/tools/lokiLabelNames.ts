import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { dateTime, getDefaultTimeRange, makeTimeRange } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { LokiDatasource } from 'app/plugins/datasource/loki/datasource';

import { lokiTypeRefiner, regexRefiner, unixTimestampRefiner } from './refiners';

const getLokiLabelNames = async (datasourceUid: string, from?: number, to?: number): Promise<string[]> => {
  try {
    const timeRange = from && to ? makeTimeRange(dateTime(from), dateTime(to)) : getDefaultTimeRange();
    const dataSource = await getDataSourceSrv().get(datasourceUid);
    if (!dataSource) {
      throw new Error(`No data source with uid ${datasourceUid} found`);
    }
    return (dataSource as LokiDatasource).languageProvider.fetchLabels({ timeRange });
  } catch (error) {
    console.error('Error fetching Loki label names:', error);
    throw new Error(`Failed to fetch label names for datasource ${datasourceUid}: ${error}`);
  }
};

const lokiLabelNamesSchema = z.object({
  datasource_uid: z
    .string()
    .describe('The datasource UID of the Loki datasource')
    .refine(lokiTypeRefiner.func, lokiTypeRefiner.message),
  start: z
    .number()
    .optional()
    .describe(
      'Optional start timestamp for the query range. Defaults to 6 hours ago if not provided. Should be a valid unix timestamp in milliseconds.'
    )
    .refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
  end: z
    .number()
    .optional()
    .describe(
      'Optional end timestamp for the query range. Defaults to current time if not provided. Should be a valid unix timestamp in milliseconds.'
    )
    .refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
  regex: z
    .string()
    .optional()
    .describe(
      'Optional regex pattern to filter label names. This can be a JavaScript regular expression or a simple string pattern. For example, "app.*" will match labels like "app", "application", etc. Matching is always case-insensitive for easier discovery.'
    )
    .refine(regexRefiner.func, regexRefiner.message),
});

export const lokiLabelNamesTool = tool(
  async (input): Promise<string> => {
    const parsedInput = lokiLabelNamesSchema.parse(input);
    const { datasource_uid, start, end, regex } = parsedInput;
    const labelNames = await getLokiLabelNames(datasource_uid, start, end);

    let filteredNames = labelNames;
    if (regex) {
      try {
        // Always use case insensitive flag
        const regexPattern = new RegExp(regex, 'i');
        filteredNames = labelNames.filter((name) => regexPattern.test(name));

        // If no matches found with regex, try simple substring match as fallback
        if (filteredNames.length === 0) {
          const fallbackNames = labelNames.filter((name) => name.toLowerCase().includes(regex.toLowerCase()));

          if (fallbackNames.length > 0) {
            filteredNames = fallbackNames;
            console.log(`No matches found with regex. Using substring match instead: ${regex}`);
          }
        }
      } catch (error) {
        // If regex is invalid, treat it as a simple string match
        filteredNames = labelNames.filter((name) => name.toLowerCase().includes(regex.toLowerCase()));
        console.log(`Invalid regex. Using substring match instead: ${regex}`);
      }
    }

    // Format the response as a JSON string with additional metadata
    return JSON.stringify(
      {
        pattern: regex || '*',
        total_label_count: labelNames.length,
        filtered_label_count: filteredNames.length,
        label_names: filteredNames,
      },
      null,
      2
    );
  },
  {
    name: 'list_loki_label_names',
    description:
      'Lists all available Loki label names with powerful regex filtering capabilities. Use the regex parameter to filter labels with JavaScript regular expressions or simple string patterns. All regex matching is case-insensitive for easier discovery. The default time range is the last 5 minutes if not specified.',
    schema: lokiLabelNamesSchema,
    metadata: {
      explainer: () => {
        return `Listing Loki label names`;
      },
    },
    verboseParsingErrors: true,
  }
);
