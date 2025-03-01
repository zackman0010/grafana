import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { getBackendSrv } from '@grafana/runtime';

const executePrometheusInstantQuery = async (
  datasourceUid: string,
  query: string,
  time?: number,
  timeout?: string
): Promise<any> => {
  try {
    const params: Record<string, any> = { query };

    if (time) {
      params.time = time;
    }

    if (timeout) {
      params.timeout = timeout;
    }

    return (await getBackendSrv().get(`/api/datasources/uid/${datasourceUid}/resources/api/v1/query`, params)).data;
  } catch (error) {
    console.error('Error executing Prometheus instant query:', error);
    throw new Error(`Failed to execute instant query for datasource ${datasourceUid}: ${error}`);
  }
};

const prometheusInstantQuerySchema = z.object({
  datasource_uid: z.string().describe('The datasource UID of the Prometheus/Cortex/Mimir datasource'),
  query: z.string().describe('The PromQL query expression to evaluate'),
  time: z
    .number()
    .optional()
    .describe('Optional evaluation timestamp (Unix seconds). Defaults to current time if not provided.'),
  timeout: z
    .string()
    .optional()
    .describe('Optional evaluation timeout (e.g., "30s"). Uses datasource default if not specified.'),
});

export const prometheusInstantQueryTool = tool(
  async (input): Promise<string> => {
    const parsedInput = prometheusInstantQuerySchema.parse(input);
    const { datasource_uid, query, time, timeout } = parsedInput;
    const result = await executePrometheusInstantQuery(datasource_uid, query, time, timeout);
    return JSON.stringify(result);
  },
  {
    name: 'prometheus_instant_query',
    description: 'Execute a Prometheus instant query to evaluate a PromQL expression at a single point in time.',
    schema: prometheusInstantQuerySchema,
  }
);
