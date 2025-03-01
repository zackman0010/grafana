import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { getBackendSrv } from '@grafana/runtime';

import { getDefaultTimeRange } from '../utils';

const getPrometheusLabelNames = async (datasourceUid: string, start?: number, end?: number): Promise<string[]> => {
  try {
    const timeRange = !start || !end ? getDefaultTimeRange() : { start, end };
    return (
      (
        await getBackendSrv().get(`/api/datasources/uid/${datasourceUid}/resources/api/v1/labels`, {
          start: timeRange.start,
          end: timeRange.end,
        })
      ).data?.result ?? []
    );
  } catch (error) {
    console.error('Error fetching Prometheus label names:', error);
    throw new Error(`Failed to fetch label names for datasource ${datasourceUid}: ${error}`);
  }
};

const prometheusLabelNamesSchema = z.object({
  datasource_uid: z.string().describe('The datasource UID of the Prometheus/Cortex/Mimir datasource'),
  start: z
    .number()
    .optional()
    .describe('Optional start timestamp for the query range. Defaults to 1 hour ago if not provided.'),
  end: z
    .number()
    .optional()
    .describe('Optional end timestamp for the query range. Defaults to current time if not provided.'),
  regex: z.string().optional().describe('Optional regex pattern to filter label names'),
});

export const prometheusLabelNamesTool = tool(
  async (input): Promise<string> => {
    const parsedInput = prometheusLabelNamesSchema.parse(input);
    const { datasource_uid, start, end, regex } = parsedInput;
    const labelNames = await getPrometheusLabelNames(datasource_uid, start, end);

    let filteredNames = labelNames;
    if (regex) {
      try {
        const regexPattern = new RegExp(regex);
        filteredNames = labelNames.filter((name) => regexPattern.test(name));
      } catch (error) {
        // If regex is invalid, treat it as a simple string match
        filteredNames = labelNames.filter((name) => name.includes(regex));
      }
    }

    return filteredNames.join(',');
  },
  {
    name: 'list_prometheus_label_names',
    description:
      'List all available Prometheus label names for a given datasource. Default time range is last hour if not specified.',
    schema: prometheusLabelNamesSchema,
  }
);
