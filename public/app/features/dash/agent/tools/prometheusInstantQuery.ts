import { getBackendSrv } from '@grafana/runtime';
import { prometheusLabelValuesTool } from './prometheusLabelValues';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

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
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'data' in error) {
      return (error as { data: unknown }).data ?? error;
    }
    return error;
  }
};

const prometheusInstantQuerySchema = z.object({
  datasource_uid: z.string().describe('The datasource UID datasource, only support type Prometheus'),
  query: z.string().describe('(REQUIRED) The PromQL query expression to evaluate'),
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
    description: `
    Execute a Prometheus instant query to evaluate a PromQL expression at a single point in time.
    Prefer to use this tool over range queries as it is less data but can still cover a long time range.
    Always group by such as (sum by (labelname)) to reduce the number of results,
    but first verify the cardinality of the label you are grouping by count() or ${prometheusLabelValuesTool.name}.
    If is above 10 use alternative label to group by or use topk or bottomk to reduce the number of results.
    `,
    schema: prometheusInstantQuerySchema,
  }
);
