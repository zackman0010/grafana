import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { getDefaultTimeRange, dateTime, TimeRange } from '@grafana/data';
import { PrometheusDatasource } from '@grafana/prometheus';
import { getDatasourceSrv } from 'app/features/plugins/datasource_srv';

import { prometheusTypeRefiner, unixTimestampRefiner } from './refiners';

interface LabelStats {
  name: string;
  cardinality: number;
  sampleValues: string[];
}

interface MetricStats {
  metric_name: string;
  label_stats: LabelStats[];
  limited?: boolean;
}

const MAX_METRICS = 50;
const MAX_SERIES_PER_METRIC = 1000;
const NAME_LABEL = '__name__';

const getPrometheusLabelStats = async (
  datasourceUid: string,
  metricPatterns: string[],
  start?: number,
  end?: number
): Promise<{
  metricStats: MetricStats[];
  limitedPatterns: string[];
  totalMetricsFound: number;
}> => {
  try {
    const datasource = await getDatasourceSrv().get({ uid: datasourceUid });
    if (!datasource) {
      throw new Error(`Datasource with uid ${datasourceUid} not found`);
    }
    const promDatasource = datasource as PrometheusDatasource;

    // Use provided timestamps if available, otherwise use default time range
    let timeRange: TimeRange;
    if (start && end) {
      // Convert timestamps to DateTimes
      timeRange = {
        from: dateTime(start),
        to: dateTime(end),
        raw: {
          from: dateTime(start),
          to: dateTime(end),
        },
      };
    } else {
      timeRange = getDefaultTimeRange(); // Default is a 5m window for label discovery
    }

    // 1. First, fetch all metric names matching the patterns
    const matchingMetricNames = await fetchMatchingMetricNames(promDatasource, metricPatterns, timeRange);

    // Track which patterns matched too many metrics
    const limitedPatterns: string[] = [];
    let totalMetricsFound = 0;

    // 2. Process each pattern and its matching metrics
    const metricsByPattern = new Map<string, string[]>();

    for (const pattern of metricPatterns) {
      // Create a regex for the pattern
      const regex = new RegExp(pattern, 'i');

      // Filter metric names matching this pattern
      const metricsForPattern = matchingMetricNames.filter(name => regex.test(name));
      totalMetricsFound += metricsForPattern.length;

      // Check if we have too many metrics for this pattern
      if (metricsForPattern.length > MAX_METRICS) {
        limitedPatterns.push(pattern);
      }

      // Store the metrics for this pattern (limited to MAX_METRICS)
      metricsByPattern.set(pattern, metricsForPattern.slice(0, MAX_METRICS));
    }

    // Get a flat list of all unique metrics to process, limited by MAX_METRICS total
    const allMetricsToProcess = Array.from(
      new Set(
        Array.from(metricsByPattern.values()).flat()
      )
    ).slice(0, MAX_METRICS);

    // 3. For each metric, fetch its labels and their statistics
    const metricStatsPromises = allMetricsToProcess.map(async (metricName) => {
      return await fetchMetricStats(promDatasource, metricName, timeRange);
    });

    const metricStats = await Promise.all(metricStatsPromises);

    return {
      metricStats,
      limitedPatterns,
      totalMetricsFound
    };
  } catch (error) {
    console.error('Error fetching Prometheus metric stats:', error);
    throw new Error(`Failed to fetch metric stats for datasource ${datasourceUid}: ${error}`);
  }
};

/**
 * Fetch all metric names matching the given patterns
 */
const fetchMatchingMetricNames = async (
  promDatasource: PrometheusDatasource,
  metricPatterns: string[],
  timeRange: TimeRange
): Promise<string[]> => {
  // Fetch all metric names
  const allMetricNames = await promDatasource.languageProvider.fetchLabelValues(NAME_LABEL, timeRange);

  // Filter metric names by patterns
  const matchedMetrics = allMetricNames.filter(metricName => {
    // Check if the metric name matches any of the patterns
    return metricPatterns.some(pattern => {
      try {
        const regex = new RegExp(pattern, 'i');
        return regex.test(metricName);
      } catch (e) {
        // If the pattern is not a valid regex, treat it as a simple string match
        return metricName.includes(pattern);
      }
    });
  });

  return matchedMetrics;
};

/**
 * Fetch detailed statistics for a specific metric name
 */
const fetchMetricStats = async (
  promDatasource: PrometheusDatasource,
  metricName: string,
  timeRange: TimeRange
): Promise<MetricStats> => {
  // Escape the metric name properly for Prometheus
  const escapedMetricName = metricName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Use an exact match for the specific metric name
  const selector = `{${NAME_LABEL}="${escapedMetricName}"}`;

  // Fetch series for this specific metric with a limit
  const seriesResult = await fetchSeriesWithLimit(promDatasource, selector, MAX_SERIES_PER_METRIC, timeRange);

  // The data is already validated in fetchSeriesWithLimit and is guaranteed to be an array
  const seriesData = seriesResult.data;

  // Get all labels for this metric (excluding __name__)
  const labelNames = new Set<string>();
  seriesData.forEach(s => {
    Object.keys(s).forEach(label => {
      if (label !== NAME_LABEL) {
        labelNames.add(label);
      }
    });
  });

  // Calculate statistics for each label
  const labelStats: LabelStats[] = Array.from(labelNames).map(labelName => {
    const values = new Set<string>();

    seriesData.forEach(s => {
      if (s[labelName]) {
        values.add(s[labelName]);
      }
    });

    const valuesArray = Array.from(values);

    return {
      name: labelName,
      cardinality: values.size,
      sampleValues: valuesArray.slice(0, 5) // Get first 5 values
    };
  });

  // Sort labels by cardinality in descending order
  labelStats.sort((a, b) => b.cardinality - a.cardinality);

  return {
    metric_name: metricName,
    label_stats: labelStats,
    limited: seriesResult.limited
  };
};

/**
 * Fetch series for a selector with a limit
 */
const fetchSeriesWithLimit = async (
  promDatasource: PrometheusDatasource,
  match: string,
  limit: number,
  timeRange: TimeRange
): Promise<{
  data: Array<Record<string, string>>;
  limited: boolean;
}> => {
  const url = '/api/v1/series';
  const range = promDatasource.getTimeRangeParams(timeRange);
  const params = {
    ...range,
    'match[]': match,
    limit: limit.toString()
  };

  try {
    const response = await promDatasource.metadataRequest(url, params);

    // Handle Prometheus API response format which can be:
    // { data: { data: Array, status: string } }
    // Check if we have the nested data structure
    let seriesData: Array<Record<string, string>> = [];

    if (response && response.data) {
      if (Array.isArray(response.data)) {
        seriesData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        seriesData = response.data.data;
      }
    }

    // Check if the result set was limited
    const limited = seriesData.length >= limit;

    return {
      data: seriesData,
      limited
    };
  } catch (error) {
    console.error(`Error fetching series for ${match}:`, error);
    return {
      data: [],
      limited: false
    };
  }
};

const prometheusMetricSearchSchema = z.object({
  datasource_uid: z
    .string()
    .describe('The datasource UID, only support Prometheus compatible datasource')
    .refine(prometheusTypeRefiner.func, prometheusTypeRefiner.message),
  metric_patterns: z
    .array(z.string())
    .min(1)
    .describe(
      'Array of regex patterns to match metric names. At least one pattern is required. Each pattern will be matched case-insensitively.'
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

export const prometheusMetricSearchTool = tool(
  async (input): Promise<string> => {
    const parsedInput = prometheusMetricSearchSchema.parse(input);
    const { datasource_uid, metric_patterns, start, end } = parsedInput;
    const { metricStats, limitedPatterns, totalMetricsFound } = await getPrometheusLabelStats(
      datasource_uid,
      metric_patterns,
      start,
      end
    );

    // Format the response as a JSON string with clear structure
    return JSON.stringify({
      metric_patterns: metric_patterns,
      total_matches_found: totalMetricsFound,
      metrics_returned: metricStats.length,
      max_metrics_per_pattern: MAX_METRICS,
      max_series_per_metric: MAX_SERIES_PER_METRIC,
      limited_patterns: limitedPatterns,
      metrics: metricStats
    });
  },
  {
    name: 'search_prometheus_metrics',
    description: `Search for Prometheus metrics by name patterns and analyze their label structure.
       This tool efficiently discovers metrics by:
       1. First finding metric names matching your patterns
       2. Then analyzing label patterns for each matching metric

       Features:
       - Requires at least one metric name pattern
       - Returns up to ${MAX_METRICS} metrics total (limited per pattern)
       - For each metric, examines up to ${MAX_SERIES_PER_METRIC} series
       - Provides label cardinality and sample values for each metric
       - Works with multiple regex patterns in a single call


       Example patterns:
       - "http_.*" - matches all HTTP-related metrics
       - "node_.*" - matches all node exporter metrics
       - "container_.*" - matches all container-related metrics

       The tool will indicate when results were limited by the maximum values.`,
    schema: prometheusMetricSearchSchema,
  }
);
