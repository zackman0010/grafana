import { tool } from '@langchain/core/tools';
import { lastValueFrom } from 'rxjs';
import { z } from 'zod';

import { CoreApp, dateTime, getDefaultTimeRange, makeTimeRange } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { LokiDatasource } from 'app/plugins/datasource/loki/datasource';
import { LokiQuery, LokiQueryType } from 'app/plugins/datasource/loki/types';

import { buildPanelJson } from './buildPanelJson';
import { summarizeLokiQueryResult } from './lokiQuerySummarizer';
import { lokiTypeRefiner, unixTimestampRefiner } from './refiners';

const lokiInstantQuerySchema = z.object({
  datasource_uid: z
    .string()
    .describe('The datasource UID, only supports Loki datasource')
    .refine(lokiTypeRefiner.func, lokiTypeRefiner.message),
  query: z.string().describe('The LogQL query to execute. `{app="frontend"} | limit 10` is not valid in LogQL use tool parameter limit instead.'),
  time: z
    .number()
    .optional()
    .describe(
      'Optional evaluation timestamp. Defaults to current time if not provided. Should be a valid unix timestamp in milliseconds.'
    )
    .refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
  limit: z
    .number()
    .optional()
    .default(100)
    .describe('Maximum number of log lines to return (for log queries only, default is 100)'),
  summarize: z
    .string()
    .optional()
    .describe(
      'Optional intent for summarization. If provided, returns a summary of the query results instead of the raw data. Example: "Summarize current errors" or "Analyze current request rates"'
    ),
  collapsed: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'Whether to collapse the panel by default. Defaults to true. Set it to `false` if you think that this panel will be interesting to the user, for example if you think this is the only query in the conversation.'
    ),
  title: z.string().describe('The title of the query.'),
  description: z.string().describe('The description of the query.'),
});

export const lokiInstantQueryTool = tool(
  async (input) => {
    const parsedInput = lokiInstantQuerySchema.parse(input);
    const { datasource_uid, query, time, limit, summarize, collapsed, title, description } = parsedInput;

    // Get datasource
    const datasource = await getDataSourceSrv().get({ uid: datasource_uid });
    if (!datasource) {
      throw new Error(`Datasource with uid ${datasource_uid} not found`);
    }
    const lokiDatasource = datasource as LokiDatasource;

    // Set up time range
    const timeRange = time ? makeTimeRange(dateTime(time), dateTime(time)) : getDefaultTimeRange();

    // Detect if this is likely a logs query or a metric query
    const isLikelyLogsQuery =
      !query.includes('rate(') &&
      !query.includes('sum(') &&
      !query.includes('avg(') &&
      !query.includes('max(') &&
      !query.includes('min(') &&
      !query.includes('count(') &&
      !query.includes('quantile(') &&
      !query.includes('stddev(') &&
      !query.includes('stdvar(');

    // Set up the query object
    const lokiQuery: LokiQuery = {
      expr: query,
      refId: 'A',
      queryType: isLikelyLogsQuery ? LokiQueryType.Instant : LokiQueryType.Instant,
      maxLines: limit,
    };

    // Run query
    const result = await lastValueFrom(
      lokiDatasource.query({
        requestId: '1',
        interval: '1m',
        intervalMs: 60000,
        range: timeRange,
        targets: [lokiQuery],
        scopedVars: {},
        timezone: 'browser',
        app: CoreApp.Explore,
        startTime: timeRange.from.valueOf(),
      })
    );

    let panelJson = null;
    if (result?.data?.length > 0 && result?.data[0]?.fields?.[0]?.values?.length > 0) {
      lokiQuery.datasource = { uid: datasource_uid };
      let type = 'stat';
      let transformations: any[] = [];
      if (result?.data[0]?.fields?.[0]?.values?.length > 1) {
        type = 'table';
        transformations = [
          {
            id: 'seriesToRows',
            options: {},
          },
          {
            id: 'sortBy',
            options: {
              fields: {},
              sort: [
                {
                  field: 'Value',
                  desc: true,
                },
              ],
            },
          },
          {
            id: 'extractFields',
            options: {
              delimiter: ',',
              source: 'Metric',
              replace: false,
              keepTime: false,
              format: 'kvp',
            },
          },
          {
            id: 'organize',
            options: {
              excludeByName: {
                Time: true,
                Metric: true,
              },
              indexByName: {
                Time: 0,
                Value: -1,
              },
              renameByName: {},
              includeByName: {},
            },
          },
        ];
      }
      panelJson = buildPanelJson(timeRange, type, title, description, lokiQuery, transformations, collapsed);
    }

    // If summarize parameter is provided, use the LLM-based summarizer
    if (summarize) {
      return [
        await summarizeLokiQueryResult('instant', query, result, summarize, {
          from: timeRange.from.toISOString(),
          to: timeRange.to.toISOString(),
        }),
        panelJson,
      ];
    }

    // Otherwise return the raw result
    return [JSON.stringify(result), panelJson];
  },
  {
    name: 'loki_instant_query',
    description: `
    Execute a Loki instant query to evaluate a LogQL expression at a single point in time.

    This tool provides two modes of operation:
    1. Data retrieval mode: Returns raw query results as JSON (default)
    2. Summarization mode: When 'summarize' parameter is provided, returns a human-readable summary
       with key observations and insights based on the specified intent, generated by an advanced LLM

   THIS TOOL ONLY SUPPORTS METRICS QUERIES ON LOGS IT NEVER RETURNS LOG LINES.
   You should most of the time use the summarize parameter to get a concise overview of the data. A summary is more efficient and easier to understand.

    Usage recommendations:
    - Use aggregation operators like 'sum(rate({app="myapp"} |= "error" [5m]))'
    - Set a reasonable limit for log queries to avoid overwhelming results
    - For complex results, use the summarize parameter to get a concise overview with relevant log examples
    - Prefer instant queries over range queries when you only need current values
    - | limit 100 is not valid in LogQL use limit parameter instead.


    Summarization examples:
    - "Summarize current error logs"
    - "Analyze HTTP response codes in the latest logs"
    - "Provide an overview of current request rates"
    `,
    schema: lokiInstantQuerySchema,
    metadata: {
      explainer: () => {
        return `run Loki instant query`;
      },
    },
    verboseParsingErrors: true,
    responseFormat: 'content_and_artifact',
  }
);
