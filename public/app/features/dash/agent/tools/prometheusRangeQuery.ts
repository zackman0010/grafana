import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { getBackendSrv } from '@grafana/runtime';

const executePrometheusRangeQuery = async (
  datasourceUid: string,
  query: string,
  start: number,
  end: number,
  step: string,
  timeout?: string
): Promise<any> => {
  try {
    const params: Record<string, any> = { query, start, end, step };
    if (timeout) {
      params.timeout = timeout;
    }

    return (await getBackendSrv().get(`/api/datasources/uid/${datasourceUid}/resources/api/v1/query_range`, params))
      .data;
  } catch (error) {
    console.error('Error executing Prometheus range query:', error);
    throw new Error(`Failed to execute range query for datasource ${datasourceUid}: ${error}`);
  }
};

const prometheusRangeQuerySchema = z.object({
  datasource_uid: z.string().describe('The datasource UID of the Prometheus/Cortex/Mimir datasource'),
  query: z.string().describe('The PromQL query expression to evaluate'),
  start: z.number().describe('Start timestamp for the query range (Unix seconds)'),
  end: z.number().describe('End timestamp for the query range (Unix seconds)'),
  step: z.string().describe('Query resolution step width as a duration string (e.g., "15s", "1m", "1h")'),
  timeout: z
    .string()
    .optional()
    .describe('Optional evaluation timeout (e.g., "30s"). Uses datasource default if not specified.'),
});

export const prometheusRangeQueryTool = tool(
  async (input): Promise<string> => {
    const parsedInput = prometheusRangeQuerySchema.parse(input);
    const { datasource_uid, query, start, end, step, timeout } = parsedInput;
    const result = await executePrometheusRangeQuery(datasource_uid, query, start, end, step, timeout);
    return JSON.stringify(result);
  },
  {
    name: 'prometheus_range_query',
    description: 'Execute a Prometheus range query to evaluate a PromQL expression over a range of time.',
    schema: prometheusRangeQuerySchema,
  }
);
