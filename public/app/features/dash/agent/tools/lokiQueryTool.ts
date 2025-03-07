import { tool } from '@langchain/core/tools';
import { lastValueFrom } from 'rxjs';
import { z } from 'zod';

import { CoreApp, dateTime, Field, makeTimeRange } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { LokiDatasource, makeRequest } from 'app/plugins/datasource/loki/datasource';
import { isQueryWithError } from 'app/plugins/datasource/loki/queryUtils';

import { buildPanelJson } from './buildPanelJson';
import { lokiTypeRefiner, unixTimestampRefiner } from './refiners';

const lokiQuerySchema = z.object({
  datasource_uid: z
    .string()
    .describe('The datasource UID of the Loki datasource')
    .refine(lokiTypeRefiner.func, lokiTypeRefiner.message),
  query_expression: z.string().describe('The query to execute'),
  start: z
    .number()
    .optional()
    .describe(
      'Optional start timestamp for the query range. Defaults to 6 hours ago. Should be a valid unix timestamp in milliseconds.'
    )
    .refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
  end: z
    .number()
    .optional()
    .describe(
      'Optional end timestamp for the query range. Defaults to current time if not provided. Should be a valid unix timestamp in milliseconds.'
    )
    .refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
  collapsed: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'Whether to collapse the panel by default. Defaults to true. Set it to `false` if you think that this panel will be interesting to the user, for example if you think this is the only query in the conversation.'
    ),
  title: z.string().describe('The title of the query.'),
  description: z.string().describe('The description of the query.'),
  limit: z
    .number()
    .optional()
    .default(100)
    .describe('Maximum number of log lines to return (for log queries only, default is 100)'),
});

export const lokiQueryTool = tool(
  async (input) => {
    const parsedInput = lokiQuerySchema.parse(input);
    const { datasource_uid, query_expression, start, end, collapsed, title, description, limit } = parsedInput;

    if (isQueryWithError(query_expression)) {
      return 'Failure. The query is invalid LogQL. Try again.';
    }

    const timeRange = makeTimeRange(dateTime(start), dateTime(end));
    const dataSource = await getDataSourceSrv().get(datasource_uid);
    if (!dataSource) {
      throw new Error(`No data source with uid ${datasource_uid} found`);
    }
    const query = makeRequest(
      {
        expr: query_expression,
        refId: 'dash',
        maxLines: limit,
      },
      timeRange,
      CoreApp.Unknown,
      'dash-logs-query'
    );
    const response = await lastValueFrom((dataSource as LokiDatasource).query(query));

    let panelJson = null;
    if (!response.errors && response.data.length > 0) {
      const target = query.targets[0];
      target.datasource = { uid: datasource_uid };
      panelJson = buildPanelJson(timeRange, 'logs', title, description, target, [], collapsed);
    }
    if (!response || !response.data.length) {
      return ['Failure, no results o error. Review the arguments and try again.', null];
    }

    const body = response.data[0].fields?.find((field: Field) => field.name === 'Line' || field.name === 'body');
    const labels = response.data[0].fields?.find((field: Field) => field.name === 'labels');
    const time = response.data[0].fields?.find((field: Field) => field.type === 'time');
    const values = response.data[0].fields?.find((field: Field) => field.type === 'number');
    if (body) {
      return [
        JSON.stringify({
          labels: labels.values,
          firstLogResult: body.values[0],
        }),
        panelJson,
      ];
    }
    return [
      JSON.stringify({
        metricQueryResults: {
          time,
          values,
        },
      }),
      panelJson,
    ];
  },
  {
    name: 'execute_loki_query',
    description:
      'Only when the data source type is Loki, and you or the user need to run a logs or logs metric query. If the query is for logs, the first log will be returned. To see more, tell the user to go to Drilldown Logs or to Explore.',
    schema: lokiQuerySchema,
    metadata: {
      explainer: () => {
        return `run Loki query`;
      },
    },
    verboseParsingErrors: true,
  }
);
