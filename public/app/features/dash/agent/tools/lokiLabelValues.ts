import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { dateTime, getDefaultTimeRange, makeTimeRange } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { LokiDatasource } from 'app/plugins/datasource/loki/datasource';

import { lokiTypeRefiner, regexRefiner, unixTimestampRefiner } from './refiners';

// Maximum number of values to return when no regex is provided
const MAX_VALUES = 100;

const getLokiLabelValues = async (
  datasourceUid: string,
  label_name: string,
  from?: number,
  to?: number
): Promise<string[]> => {
  try {
    const timeRange = from && to ? makeTimeRange(dateTime(from), dateTime(to)) : getDefaultTimeRange();
    const dataSource = await getDataSourceSrv().get(datasourceUid);
    if (!dataSource) {
      throw new Error(`No data source with uid ${datasourceUid} found`);
    }
    return (dataSource as LokiDatasource).languageProvider.fetchLabelValues(label_name, { timeRange });
  } catch (error) {
    console.error('Error fetching Loki label values:', error);
    throw new Error(`Failed to fetch label values for datasource ${datasourceUid}: ${error}`);
  }
};

const lokiLabelValuesSchema = z.object({
  datasource_uid: z
    .string()
    .describe('The datasource UID of the Loki datasource')
    .refine(lokiTypeRefiner.func, lokiTypeRefiner.message),
  label_name: z
    .string()
    .describe('The label name to query values for'),
  limit: z
    .number()
    .optional()
    .default(MAX_VALUES)
    .describe(`Optional limit on the number of values to return. Default is ${MAX_VALUES}.`),
  start: z
    .number()
    .optional()
    .describe('Optional start timestamp for the query range. Defaults to 5 minutes ago if not provided. Should be a valid unix timestamp in milliseconds.')
    .refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
  end: z
    .number()
    .optional()
    .describe('Optional end timestamp for the query range. Defaults to current time if not provided. Should be a valid unix timestamp in milliseconds.')
    .refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
  regex: z
    .string()
    .optional()
    .describe('Optional regex pattern to filter label values. Use this to find specific patterns or reduce the number of results returned.')
    .refine(regexRefiner.func, regexRefiner.message),
});

export const lokiLabelValuesTool = tool(
  async (input): Promise<string> => {
    const parsedInput = lokiLabelValuesSchema.parse(input);
    const { datasource_uid, label_name, limit, start, end, regex } = parsedInput;
    const labelValues = await getLokiLabelValues(datasource_uid, label_name, start, end);

    let filteredValues;
    if (regex) {
      try {
        const regexPattern = new RegExp(regex);
        filteredValues = labelValues.filter((value) => regexPattern.test(value));
      } catch (error) {
        // If regex is invalid, treat it as a simple string match
        filteredValues = labelValues.filter((value) => value.includes(regex));
      }
    } else {
      // If no regex provided, apply the limit to reduce data volume
      filteredValues = labelValues.slice(0, limit);
    }

    const hasMoreValues = labelValues.length > filteredValues.length;

    // Return as a formatted string with metadata
    return JSON.stringify({
      label_name,
      total_values_found: labelValues.length,
      values_returned: filteredValues.length,
      has_more: hasMoreValues,
      values: filteredValues,
    }, null, 2);
  },
  {
    name: 'list_loki_label_values',
    description: `Get values for a specific Loki label with powerful filtering options.

    Features:
    - Returns values for a specific label name
    - Supports regex filtering to find specific patterns. Some labels returns a lot of values so use regex to filter.
    - Limits results to ${MAX_VALUES} values by default (can be changed)
    - Returns total count and whether there are more values available

    Examples:
    - Get values for 'container' label: { datasource_uid: "abc123", label_name: "container" }
    - Filter 'namespace' values with regex: { datasource_uid: "abc123", label_name: "namespace", regex: "^prod-" }
    - Get more values: { datasource_uid: "abc123", label_name: "pod", limit: 500 }

    Use this tool to explore label values before constructing log stream selectors.`,
    schema: lokiLabelValuesSchema,
  }
);
