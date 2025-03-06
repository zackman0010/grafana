import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { getDefaultTimeRange, dateTime, TimeRange } from '@grafana/data';
import { getDataSourceSrv } from '@grafana/runtime';
import { LokiDatasource } from 'app/plugins/datasource/loki/datasource';

import { lokiTypeRefiner, regexRefiner, unixTimestampRefiner } from './refiners';

interface LabelStats {
  name: string;
  cardinality: number;
  sampleValues: string[];
}

interface LogStreamStats {
  label_stats: LabelStats[];
  label_names: string[];
  limited: boolean;
}

const MAX_STREAMS = 1000;
const MAX_LABEL_VALUES = 5;

/**
 * Fetches Loki log stream information with label statistics
 */
const getLokiLogStreamStats = async (
  datasourceUid: string,
  streamSelectors: string[] = [],
  start?: number,
  end?: number
): Promise<LogStreamStats> => {
  try {
    // Get the datasource
    const datasource = await getDataSourceSrv().get(datasourceUid);
    if (!datasource) {
      throw new Error(`Datasource with uid ${datasourceUid} not found`);
    }
    const lokiDatasource = datasource as LokiDatasource;

    // Set up time range
    let timeRange: TimeRange;
    if (start && end) {
      timeRange = {
        from: dateTime(start),
        to: dateTime(end),
        raw: {
          from: dateTime(start),
          to: dateTime(end),
        },
      };
    } else {
      timeRange = getDefaultTimeRange(); // Default is a 5m window
    }

    // Use stream selectors to filter logs
    // Create a stream selector
    let streamSelector = '';
    if (streamSelectors.length > 0) {
      streamSelector = streamSelectors.join('');
    } else {
      streamSelector = '{}'; // Empty selector to match all streams
    }

    // Initialize tracking for all labels
    const labelStatsMap = new Map<string, LabelStats>();
    let limited = false;
    const allLabelNames = new Set<string>();

    // Process series data to collect label statistics
    try {
      // Use the language provider's fetchSeries method which is more reliable
      const seriesData = await lokiDatasource.languageProvider.fetchSeries(streamSelector, { timeRange });

      // Check if the result was limited
      limited = seriesData.length >= MAX_STREAMS;

      // Process each series to extract label information
      for (const labelSet of seriesData.slice(0, MAX_STREAMS)) {
        // Process each label in this series
        for (const [labelName, labelValue] of Object.entries(labelSet)) {
          // Add to the set of all label names
          allLabelNames.add(labelName);

          // Update or create stats for this label
          if (labelStatsMap.has(labelName)) {
            const stats = labelStatsMap.get(labelName)!;
            stats.cardinality++;
            if (!stats.sampleValues.includes(labelValue) && stats.sampleValues.length < MAX_LABEL_VALUES) {
              stats.sampleValues.push(labelValue);
            }
          } else {
            labelStatsMap.set(labelName, {
              name: labelName,
              cardinality: 1,
              sampleValues: [labelValue].slice(0, MAX_LABEL_VALUES)
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching series labels:', error);
    }

    // Convert the map to an array and sort by cardinality
    const labelStats = Array.from(labelStatsMap.values());
    labelStats.sort((a, b) => b.cardinality - a.cardinality);

    // Get all label names from the series data
    const labelNames = Array.from(allLabelNames);

    // Return the statistics
    return {
      label_stats: labelStats,
      label_names: labelNames,
      limited: limited
    };
  } catch (error) {
    console.error('Error fetching Loki log stream stats:', error);
    throw new Error(`Failed to fetch log stream stats for datasource ${datasourceUid}: ${error}`);
  }
};

const lokiLogStreamSearchSchema = z.object({
  datasource_uid: z
    .string()
    .describe('The datasource UID, only supports Loki datasource')
    .refine(lokiTypeRefiner.func, lokiTypeRefiner.message),
  stream_selectors: z
    .array(z.string())
    .optional()
    .describe(
      'Optional array of Loki stream selectors like {app="foo"} to filter log streams. If not provided, all streams will be queried.'
    ),
  start: z
    .number()
    .optional()
    .describe('Optional start timestamp in milliseconds since epoch.')
    .refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
  end: z
    .number()
    .optional()
    .describe('Optional end timestamp in milliseconds since epoch.')
    .refine(unixTimestampRefiner.func, unixTimestampRefiner.message),
});

export const lokiLogStreamSearchTool = tool(
  async (input): Promise<string> => {
    const parsedInput = lokiLogStreamSearchSchema.parse(input);
    const {
      datasource_uid,
      stream_selectors = [],
      start,
      end,
    } = parsedInput;

    const logStreamStats = await getLokiLogStreamStats(
      datasource_uid,
      stream_selectors,
      start,
      end
    );

    // No regex filtering on label names as per user's request

    // Prepare statistics about the result
    const usedStreams = logStreamStats.limited ? MAX_STREAMS : 'all';
    const nonEmptyLabels = logStreamStats.label_stats.filter(stat => stat.cardinality > 0);
    const maxCardinalitySeen = Math.max(...logStreamStats.label_stats.map(stat => stat.cardinality), 0);

    // Format the response as a JSON string with clear structure
    return JSON.stringify({
      stream_selectors: stream_selectors.length > 0 ? stream_selectors : ['{}'],
      max_streams: MAX_STREAMS,
      max_label_values: MAX_LABEL_VALUES,
      stats: {
        processed_streams: usedStreams,
        limited: logStreamStats.limited,
        total_label_count: logStreamStats.label_names.length,
        non_empty_labels: nonEmptyLabels.length,
        max_cardinality: maxCardinalitySeen,
      },
      label_names: logStreamStats.label_names,
      label_stats: logStreamStats.label_stats
    }, null, 2);
  },
  {
    name: 'search_loki_log_streams',
    description: `Search for Loki log streams and analyze their label structure.
       This tool helps you understand log data organization by:
       1. Processing up to ${MAX_STREAMS} log streams and extracting all their labels
       2. For each label name, collecting statistics (cardinality and sample values)

       Never use this tool with a broad matchers like {}

       Features:
       - Limits processing to ${MAX_STREAMS} streams for performance
       - Returns all label names observed in the streams (without limitation)
       - For each label, provides:
           * Cardinality (how many times it was seen across streams)
           * Up to ${MAX_LABEL_VALUES} sample values
       - Indicates if results were limited due to hitting the stream limit

       Workflow:
       1. Use stream selectors (e.g. {app="foo"}) to filter the logs to analyze

       Log streams in Loki are identified by their label sets, e.g. {app="foo",env="prod"}
       Understanding label structure is crucial before querying logs.`,
    schema: lokiLogStreamSearchSchema,
  }
);
