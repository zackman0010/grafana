import { CoreApp, dateTime, getDefaultTimeRange, makeTimeRange } from '@grafana/data';
import { getDatasourceSrv } from 'app/features/plugins/datasource_srv';
import { lastValueFrom } from 'rxjs';
import { PrometheusDatasource } from '@grafana/prometheus';
import { prometheusLabelValuesTool } from './prometheusLabelValues';
import { prometheusTypeRefiner, unixTimestampRefiner } from './refiners';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const prometheusInstantQuerySchema = z.object({
  datasource_uid: z
    .string()
    .describe('The datasource UID datasource, only support Prometheus compatible datasource')
    .refine(prometheusTypeRefiner.func, prometheusTypeRefiner.message),
  query: z.string().describe('The PromQL query expression to evaluate'),
  time: z
    .number()
    .optional()
    .describe('Optional evaluation timestamp (Unix seconds). Defaults to current time if not provided.')
    .refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
});

export const prometheusInstantQueryTool = tool(
  async (input): Promise<string> => {
    const parsedInput = prometheusInstantQuerySchema.parse(input);
    const { datasource_uid, query, time } = parsedInput;
    const datasource = await getDatasourceSrv().get({ uid: datasource_uid });
    if (!datasource) {
      throw new Error(`Datasource with uid ${datasource_uid} not found`);
    }
    const promDatasource = datasource as PrometheusDatasource;
    const timeRange = time ? makeTimeRange(dateTime(time), dateTime(time)) : getDefaultTimeRange();
    const defaultQuery = promDatasource.getDefaultQuery(CoreApp.Explore);
    const q = { ...defaultQuery, expr: query, range: false, instant: true };
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
