import { CoreApp, dateTime, makeTimeRange } from '@grafana/data';
import { getDatasourceSrv } from 'app/features/plugins/datasource_srv';
import { lastValueFrom } from 'rxjs';
import { PrometheusDatasource } from '@grafana/prometheus';
import { prometheusInstantQueryTool } from './prometheusInstantQuery';
import { prometheusTypeRefiner, unixTimestampRefiner } from './refiners';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const prometheusRangeQuerySchema = z.object({
  datasource_uid: z
    .string()
    .describe('The datasource UID datasource, only support type Prometheus')
    .refine(prometheusTypeRefiner.func, prometheusTypeRefiner.message),
  query: z.string().describe('(REQUIRED) The PromQL query expression to evaluate'),
  start: z
    .number()
    .describe('Start timestamp for the query range (Unix seconds)')
    .refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
  end: z
    .number()
    .describe('End timestamp for the query range (Unix seconds)')
    .refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
  step: z.string().describe('Query resolution step width as a duration string (e.g., "15s", "1m", "1h")'),
  timeout: z
    .string()
    .optional()
    .describe('Optional evaluation timeout (e.g., "30s"). Uses datasource default if not specified.'),
});

export const prometheusRangeQueryTool = tool(
  async (input): Promise<string> => {
    const parsedInput = prometheusRangeQuerySchema.parse(input);
    const { datasource_uid, query, start, end } = parsedInput;
    const datasource = await getDatasourceSrv().get({ uid: datasource_uid });
    if (!datasource) {
      throw new Error(`Datasource with uid ${datasource_uid} not found`);
    }
    const promDatasource = datasource as PrometheusDatasource;
    const timeRange = makeTimeRange(dateTime(start), dateTime(end));
    const defaultQuery = promDatasource.getDefaultQuery(CoreApp.Explore);
    const q = { ...defaultQuery, expr: query, range: true, instant: false };
    const result = await lastValueFrom(
      promDatasource.query({
        requestId: '1',
        interval: '1m',
        intervalMs: 60000,
        range: timeRange,
        targets: [q],
        scopedVars: {},
        timezone: 'browser',
        app: CoreApp.Explore,
        startTime: timeRange.from.valueOf(),
      })
    );
    return JSON.stringify(result);
  },
  {
    name: 'prometheus_range_query',
    description: `
    Execute a Prometheus range query to evaluate a PromQL expression over a range of time.
    Avoid using this tool if you can use ${prometheusInstantQueryTool.name} instead.
    `,
    schema: prometheusRangeQuerySchema,
  }
);
