import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { dateTime, getDefaultTimeRange, makeTimeRange } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { LokiDatasource } from 'app/plugins/datasource/loki/datasource';

import { lokiTypeRefiner, regexRefiner, unixTimestampRefiner } from './refiners';

const getLokiLabelNames = async (datasourceUid: string, from?: number, to?: number): Promise<string[]> => {
  try {
    const timeRange = from && to ? makeTimeRange(dateTime(from), dateTime(to)) : getDefaultTimeRange();
    const dataSource = await getDataSourceSrv().get(datasourceUid);
    if (!dataSource) {
      throw new Error(`No data source with uid ${datasourceUid} found`);
    }
    return (dataSource as LokiDatasource).languageProvider.fetchLabels({ timeRange });
  } catch (error) {
    console.error('Error fetching Loki label names:', error);
    throw new Error(`Failed to fetch label names for datasource ${datasourceUid}: ${error}`);
  }
};

const lokiLabelNamesSchema = z.object({
  datasource_uid: z
    .string()
    .describe('The datasource UID of the Loki datasource')
    .refine(lokiTypeRefiner.func, lokiTypeRefiner.message),
  start: z
    .number()
    .optional()
    .describe(
      'Optional start timestamp for the query range. Defaults to 5 minutes ago if not provided. Should be a valid unix timestamp in milliseconds.'
    )
    .refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
  end: z
    .number()
    .optional()
    .describe(
      'Optional end timestamp for the query range. Defaults to current time if not provided. Should be a valid unix timestamp in milliseconds.'
    )
    .refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
  regex: z
    .string()
    .optional()
    .describe(
      'Optional javascript regex pattern to filter label names. Use this when you want to filter the label names by a specific pattern.'
    )
    .refine(regexRefiner.func, regexRefiner.message),
});

export const lokiLabelNamesTool = tool(
  async (input): Promise<string> => {
    const parsedInput = lokiLabelNamesSchema.parse(input);
    const { datasource_uid, start, end, regex } = parsedInput;
    const labelNames = await getLokiLabelNames(datasource_uid, start, end);

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
    name: 'list_loki_label_names',
    description:
      'Only when the data source type is Loki, list all available Loki label names. Default time range is last 5 minutes if not specified.',
    schema: lokiLabelNamesSchema,
  }
);
