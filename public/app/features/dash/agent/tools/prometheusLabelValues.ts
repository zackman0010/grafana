import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { getBackendSrv } from '@grafana/runtime';

import { getDefaultTimeRange } from '../utils';

const getPrometheusLabelValues = async (
  datasourceUid: string,
  labelName: string,
  start?: number,
  end?: number
): Promise<string[]> => {
  try {
    const timeRange = !start || !end ? getDefaultTimeRange() : { start, end };
    return (
      (
        await getBackendSrv().get(`/api/datasources/uid/${datasourceUid}/resources/api/v1/label/${labelName}/values`, {
          start: timeRange.start,
          end: timeRange.end,
        })
      ).data ?? []
    );
  } catch (error) {
    console.error(`Error fetching Prometheus label values for ${labelName}:`, error);
    throw new Error(`Failed to fetch label values for datasource ${datasourceUid}: ${error}`);
  }
};

const prometheusLabelValuesSchema = z.object({
  datasource_uid: z.string().describe('The datasource UID datasource, only support type Prometheus'),
  label_name: z
    .string()
    .min(1)
    .describe('(REQUIRED) The label name to query values for. Use "__name__" for metric names.'),
  start: z
    .number()
    .optional()
    .describe('Optional start timestamp for the query range. Defaults to 1 hour ago if not provided.'),
  end: z
    .number()
    .optional()
    .describe('Optional end timestamp for the query range. Defaults to current time if not provided.'),
  regex: z.string().optional().describe('Optional javascript regex pattern to filter label values'),
});

export const prometheusLabelValuesTool = tool(
  async (input): Promise<string> => {
    const parsedInput = prometheusLabelValuesSchema.parse(input);
    const { datasource_uid, label_name, start, end, regex } = parsedInput;
    const labelValues = await getPrometheusLabelValues(datasource_uid, label_name || '__name__', start, end);

    let filteredValues = labelValues;
    if (regex) {
      try {
        const regexPattern = new RegExp(regex, 'i');
        filteredValues = labelValues.filter((value) => regexPattern.test(value));
      } catch (error) {
        // If regex is invalid, treat it as a simple string match
        filteredValues = labelValues.filter((value) => value.toLowerCase().includes(regex.toLowerCase()));
      }
    }

    return JSON.stringify(filteredValues);
  },
  {
    name: 'list_prometheus_label_values',
    description: `List values for a specified Prometheus label. Use label_name="__name__" to get metric names.
       Supports regex pattern (case-insensitive) to filter values.
       Since there can be a lot of values, it is recommended to use a regex pattern to filter the values.
       It's better to use regex pattern that are more specific first, and then use more general patterns in case of no match.
       Default time range is last hour if not specified.`,
    schema: prometheusLabelValuesSchema,
  }
);
