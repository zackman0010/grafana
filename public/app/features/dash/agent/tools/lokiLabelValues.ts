import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { dateTime, getDefaultTimeRange, makeTimeRange } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { LokiDatasource } from 'app/plugins/datasource/loki/datasource';

import { lokiTypeRefiner, regexRefiner, unixTimestampRefiner } from './refiners';

const getLokiLabelValues = async (
  datasourceUid: string,
  label_name: string,
  from?: number,
  to?: number
): Promise<string[]> => {
  try {
    const timeRange = from && to ? makeTimeRange(dateTime(from), dateTime(to)) : getDefaultTimeRange();
    const dataSource = await getDataSourceSrv().get(datasourceUid);
    if (!dataSource) {
      throw new Error(`No data source with uid ${datasourceUid} found`);
    }
    return (dataSource as LokiDatasource).languageProvider.fetchLabelValues(label_name, { timeRange });
  } catch (error) {
    console.error('Error fetching Loki label names:', error);
    throw new Error(`Failed to fetch label names for datasource ${datasourceUid}: ${error}`);
  }
};

const lokiLabelValuesSchema = z.object({
  datasource_uid: z
    .string()
    .describe('The datasource UID of the Loki datasource')
    .refine(lokiTypeRefiner.func, lokiTypeRefiner.message),
  label_name: z.string().describe('The label name to query values for'),
  start: z
    .number()
    .optional()
    .describe(
      'Optional start timestamp for the query range. Defaults to 6 hours ago if not provided. Should be a valid unix timestamp in milliseconds.'
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
    .describe('Optional javascript regex pattern to filter label names')
    .refine(regexRefiner.func, regexRefiner.message),
});

export const lokiLabelValuesTool = tool(
  async (input): Promise<string> => {
    const parsedInput = lokiLabelValuesSchema.parse(input);
    const { datasource_uid, label_name, start, end, regex } = parsedInput;
    const labelValues = await getLokiLabelValues(datasource_uid, label_name, start, end);

    let filteredNames = labelValues;
    if (regex) {
      try {
        const regexPattern = new RegExp(regex);
        filteredNames = labelValues.filter((name) => regexPattern.test(name));
      } catch (error) {
        // If regex is invalid, treat it as a simple string match
        filteredNames = labelValues.filter((name) => name.includes(regex));
      }
    }

    return filteredNames.join(',');
  },
  {
    name: 'list_loki_label_values',
    description:
      'Only when the data source type is Loki, list all values for the given label_name. Default time range is last 5 minutes if not specified.',
    schema: lokiLabelValuesSchema,
    metadata: {
      explainer: () => {
        return `Listing Loki label values`;
      },
    },
  }
);
