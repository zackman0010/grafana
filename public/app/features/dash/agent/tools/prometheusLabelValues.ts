import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { dateTime, getDefaultTimeRange, makeTimeRange } from '@grafana/data';
import { PrometheusDatasource } from '@grafana/prometheus';
import { getDatasourceSrv } from 'app/features/plugins/datasource_srv';

import { prometheusMetricSearchTool } from './prometheusMetricSearch';
import { prometheusTypeRefiner, regexRefiner, unixTimestampRefiner } from './refiners';

const prometheusLabelValuesSchema = z.object({
  datasource_uid: z
    .string()
    .describe('The datasource UID, only support Prometheus compatible datasource')
    .refine(prometheusTypeRefiner.func, prometheusTypeRefiner.message),
  label_name: z.string().describe('The label name to query values for. Use "__name__" for metric names.'),
  start: z
    .number()
    .optional()
    .describe('Optional start timestamp for the query range. Defaults to 1 hour ago if not provided. Should be a valid unix timestamp in milliseconds.')
    .refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
  end: z
    .number()
    .optional()
    .describe('Optional end timestamp for the query range. Defaults to current time if not provided. Should be a valid unix timestamp in milliseconds.')
    .refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
  regex: z
    .string()
    .optional()
    .describe(`Optional regex pattern to filter label values. Avoid broad regexes, analyze labels cardinality using ${prometheusMetricSearchTool.name} first to see if the labels contains a lot of values.`)
    .refine(regexRefiner.func, regexRefiner.message),
});

export const prometheusLabelValuesTool = tool(
  async (input): Promise<string> => {
    const parsedInput = prometheusLabelValuesSchema.parse(input);
    const { datasource_uid, label_name, start, end, regex } = parsedInput;
    const datasource = await getDatasourceSrv().get({ uid: datasource_uid });
    if (!datasource) {
      throw new Error(`Datasource with uid ${datasource_uid} not found`);
    }
    const promDatasource = datasource as PrometheusDatasource;
    const timeRange = start && end ? makeTimeRange(dateTime(start), dateTime(end)) : getDefaultTimeRange();

    const labelValues = await promDatasource.languageProvider.fetchLabelValues(label_name, timeRange);
    let filteredValues = labelValues;
    if (regex) {
      try {
        const regexPattern = new RegExp(regex, 'i');
        filteredValues = labelValues.filter((value) => regexPattern.test(value));
      } catch (error) {
        // If regex is invalid, treat it as a simple string match
        filteredValues = labelValues.filter((value) => value.toLowerCase().includes(regex.toLowerCase()));
      }
    }

    return JSON.stringify(filteredValues);
  },
  {
    name: 'list_prometheus_label_values',
    description: `List values for a specified Prometheus label. Use label_name="__name__" to get metric names.
       Supports regex pattern (case-insensitive) to filter values.
       Since there can be a lot of values, it is recommended to use a regex pattern to filter the values.
       It's better to use regex pattern that are more specific first, and then use more general patterns in case of no match.
       Default time range is last hour if not specified.`,
    schema: prometheusLabelValuesSchema,
  }
);
