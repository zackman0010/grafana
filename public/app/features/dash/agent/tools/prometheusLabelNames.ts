import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { dateTime, getDefaultTimeRange, makeTimeRange } from '@grafana/data';
import { PrometheusDatasource } from '@grafana/prometheus';
import { getDatasourceSrv } from 'app/features/plugins/datasource_srv';

import { prometheusMetricSearchTool } from './prometheusMetricSearch';
import { prometheusTypeRefiner, regexRefiner, unixTimestampRefiner } from './refiners';

const prometheusLabelNamesSchema = z.object({
  datasource_uid: z
    .string()
    .describe('The datasource UID, only support Prometheus compatible datasource')
    .refine(prometheusTypeRefiner.func, prometheusTypeRefiner.message),
  start: z
    .number()
    .optional()
    .describe(
      'Optional start timestamp for the query range. Defaults to 1 hour ago if not provided. Should be a valid unix timestamp in milliseconds.'
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
      `Optional regex pattern to filter label names. Avoid broad regexes, analyze labels cardinality using ${prometheusMetricSearchTool.name} first to see if the labels contains a lot of values.`
    )
    .refine(regexRefiner.func, regexRefiner.message),
});

export const prometheusLabelNamesTool = tool(
  async (input): Promise<string> => {
    const parsedInput = prometheusLabelNamesSchema.parse(input);
    const { datasource_uid, start, end, regex } = parsedInput;
    const datasource = await getDatasourceSrv().get({ uid: datasource_uid });
    if (!datasource) {
      throw new Error(`Datasource with uid ${datasource_uid} not found`);
    }
    const promDatasource = datasource as PrometheusDatasource;
    const timeRange = start && end ? makeTimeRange(dateTime(start), dateTime(end)) : getDefaultTimeRange();

    const labelNames = await promDatasource.languageProvider.fetchLabels(timeRange);

    let filteredNames = labelNames;
    if (regex) {
      try {
        const regexPattern = new RegExp(regex, 'i');
        filteredNames = labelNames.filter((name) => regexPattern.test(name));
      } catch (error) {
        // If regex is invalid, treat it as a simple string match
        filteredNames = labelNames.filter((name) => name.toLowerCase().includes(regex.toLowerCase()));
      }
    }

    // Return as JSON array
    return JSON.stringify(filteredNames);
  },
  {
    name: 'list_prometheus_label_names',
    description: `List values for a specified Prometheus label. Use label_name="__name__" to get metric names.
       Supports regex pattern (case-insensitive) to filter values.
       Since there can be a lot of values, it is recommended to use a regex pattern to filter the values.
       It's better to use regex pattern that are more specific first, and then use more general patterns in case of no match.
       Prefer to use ${prometheusMetricSearchTool.name} for label names and metric discovery first to see if the labels contains a lot of values.
       Default time range is last hour if not specified.`,
    schema: prometheusLabelNamesSchema,
    metadata: {
      explainer: () => {
        return `list Prometheus label names`;
      },
    },
    verboseParsingErrors: true,
  }
);
