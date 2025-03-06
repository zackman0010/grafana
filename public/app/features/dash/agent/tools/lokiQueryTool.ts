import { tool } from '@langchain/core/tools';
import { lastValueFrom } from 'rxjs';
import { z } from 'zod';

import { CoreApp, DataQueryResponse, dateTime, Field, getDefaultTimeRange, makeTimeRange } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { LokiDatasource, makeRequest } from 'app/plugins/datasource/loki/datasource';
import { isQueryWithError } from 'app/plugins/datasource/loki/queryUtils';

import { lokiTypeRefiner, unixTimestampRefiner } from './refiners';

const query = async (
  datasourceUid: string,
  query_expression: string,
  from?: number,
  to?: number
): Promise<DataQueryResponse> => {
  try {
    const timeRange = from && to ? makeTimeRange(dateTime(from), dateTime(to)) : getDefaultTimeRange();
    const dataSource = await getDataSourceSrv().get(datasourceUid);
    if (!dataSource) {
      throw new Error(`No data source with uid ${datasourceUid} found`);
    }
    return lastValueFrom(
      (dataSource as LokiDatasource).query(
        makeRequest(
          {
            expr: query_expression,
            refId: 'dash',
            maxLines: 1,
          },
          timeRange,
          CoreApp.Unknown,
          'dash-logs-query'
        )
      )
    );
  } catch (error) {
    console.error('Error fetching Loki label names:', error);
    throw new Error(`Failed to fetch label names for datasource ${datasourceUid}: ${error}`);
  }
};

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
});

export const lokiQueryTool = tool(
  async (input): Promise<string> => {
    const parsedInput = lokiQuerySchema.parse(input);
    const { datasource_uid, query_expression, start, end } = parsedInput;

    if (isQueryWithError(query_expression)) {
      return 'Failure. The query is invalid LogQL. Try again.';
    }

    const response = await query(datasource_uid, query_expression, start, end);

    if (!response || !response.data.length) {
      return 'Failure, no results o error. Review the arguments and try again.';
    }

    const body = response.data[0].fields?.find((field: Field) => field.name === 'Line' || field.name === 'body');
    const labels = response.data[0].fields?.find((field: Field) => field.name === 'labels');
    const time = response.data[0].fields?.find((field: Field) => field.type === 'time');
    const values = response.data[0].fields?.find((field: Field) => field.type === 'number');
    if (body) {
      return JSON.stringify({
        labels,
        firstLogResult: body,
      });
    }
    return JSON.stringify({
      metricQueryResults: {
        time,
        values,
      },
    });
  },
  {
    name: 'execute_loki_query',
    description:
      'Only when the data source type is Loki, and you or the user need to run a logs or logs metric query. If the query is for logs, the first log will be returned. To see more, tell the user to go to Drilldown Logs or to Explore.',
    schema: lokiQuerySchema,
  }
);
