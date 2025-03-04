import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { dateTime, makeTimeRange } from '@grafana/data';
import { PrometheusDatasource } from '@grafana/prometheus';
import { getDatasourceSrv } from 'app/features/plugins/datasource_srv';

import { getDefaultTimeRange } from '../utils';

import { prometheusTypeRefiner, regexRefiner, unixTimestampRefiner } from './refiners';


const prometheusLabelNamesSchema = z.object({
  datasource_uid: z.string().describe('The datasource UID of the Prometheus/Cortex/Mimir datasource').refine(prometheusTypeRefiner.func, prometheusTypeRefiner.message),
  start: z
    .number()
    .optional()
    .describe('Optional start timestamp for the query range. Defaults to 1 hour ago if not provided.').refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
  end: z
    .number()
    .optional()
    .describe('Optional end timestamp for the query range. Defaults to current time if not provided.').refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
  regex: z.string().optional().describe('Optional regex pattern to filter label names').refine(regexRefiner.func, regexRefiner.message),
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
    name: 'list_prometheus_label_names',
    description:
      'List all available Prometheus label names for a given datasource. Default time range is last hour if not specified.',
    schema: prometheusLabelNamesSchema,
  }
);
