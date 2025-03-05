import { ChatAnthropic } from '@langchain/anthropic';

import { ANTHROPIC_API_KEY } from '../agent';

/**
 * Interface for summarization request
 */
interface SummarizationRequest {
  queryType: 'instant' | 'range';
  queryString: string;
  queryResult: any;
  intent: string;
  timeRange?: {
    from: string;
    to: string;
  };
}

/**
 * System prompt template for guiding the LLM in summarizing Prometheus query results
 */
const SYSTEM_PROMPT_TEMPLATE = `
You are an expert Prometheus data analyst. Your task is to summarize the results of a Prometheus query in an extremely concise way.

QUERY TYPE: {{queryType}}
QUERY STRING: {{queryString}}
{{#if timeRange}}
TIME RANGE: From {{timeRange.from}} to {{timeRange.to}}
{{/if}}
USER INTENT: {{intent}}

Follow these guidelines:
1. Return MAXIMUM 5 observations - focus only on the most important insights
2. Each observation must be under 100 words excluding labels and series name - be extremely concise
3. Focus exclusively on insights directly relevant to the user's intent
4. Include specific numbers and percentages when relevant
5. Prioritize actionable insights over general descriptions
6. Highlight critical anomalies or threshold breaches first
7. Do not explain methodology or provide context - just the key findings
8. Include labels and series name in the observation if relevant

Your response should be extremely brief - no introductions, no explanations, just the 1-5 most important observations in bullet point format.
`;

/**
 * Function to generate a system prompt for the summarization LLM
 */
function generateSystemPrompt(request: SummarizationRequest): string {
  let prompt = SYSTEM_PROMPT_TEMPLATE;

  // Replace variables in the template
  prompt = prompt.replace('{{queryType}}', request.queryType);
  prompt = prompt.replace('{{queryString}}', request.queryString);
  prompt = prompt.replace('{{intent}}', request.intent);

  // Handle time range if provided
  if (request.timeRange) {
    const timeRangeSection = `TIME RANGE: From ${request.timeRange.from} to ${request.timeRange.to}`;
    prompt = prompt.replace('{{#if timeRange}}\nTIME RANGE: From {{timeRange.from}} to {{timeRange.to}}\n{{/if}}', timeRangeSection);
  } else {
    prompt = prompt.replace('{{#if timeRange}}\nTIME RANGE: From {{timeRange.from}} to {{timeRange.to}}\n{{/if}}', '');
  }

  return prompt;
}

/**
 * Function to prepare the Prometheus response for the LLM
 * This extracts the essential data and formats it in a way that's easier for the LLM to understand
 * The function is optimized to compact the data to reduce token usage
 */
function prepareQueryResultForLLM(result: any): string {
  // Handle different result formats
  let frames: any[] = [];
  if (result.data && Array.isArray(result.data)) {
    frames = result.data;
  } else if (result.results) {
    // Extract frames from nested results format
    Object.keys(result.results).forEach(refId => {
      if (result.results[refId].frames) {
        frames = frames.concat(result.results[refId].frames);
      }
    });
  } else if (result.frames && Array.isArray(result.frames)) {
    frames = result.frames;
  }

  if (!frames.length) {
    return "No data or invalid data structure";
  }

  // Clean frames by removing unnecessary config fields
  const cleanFrames = frames.map(frame => {
    const cleanFrame = { ...frame };

    // Remove unnecessary schema.meta
    if (cleanFrame.schema?.meta?.custom) {
      // Keep only resultType from custom if it exists
      const resultType = cleanFrame.schema.meta.custom.resultType;
      if (resultType) {
        cleanFrame.schema.meta.resultType = resultType;
      }
      delete cleanFrame.schema.meta.custom;
    }

    // Keep only executedQueryString from meta if it exists
    if (cleanFrame.schema?.meta?.executedQueryString) {
      const query = cleanFrame.schema.meta.executedQueryString;
      cleanFrame.schema.meta = { executedQueryString: query };
      if (cleanFrame.schema.meta.resultType) {
        cleanFrame.schema.meta.resultType = cleanFrame.schema.meta.resultType;
      }
    }

    // Clean fields
    if (cleanFrame.schema?.fields) {
      cleanFrame.schema.fields = cleanFrame.schema.fields.map((field: any) => {
        const cleanField: any = {
          name: field.name,
          type: field.type
        };

        // Keep only labels
        if (field.labels) {
          cleanField.labels = field.labels;
        }

        return cleanField;
      });
    } else if (cleanFrame.fields) {
      cleanFrame.fields = cleanFrame.fields.map((field: any) => {
        const cleanField: any = {
          name: field.name,
          type: field.type
        };

        // Keep only labels and values
        if (field.labels) {
          cleanField.labels = field.labels;
        }
        if (field.values) {
          cleanField.values = field.values;
        }

        return cleanField;
      });
    }

    return cleanFrame;
  });

  let formattedData = "QUERY_RESULT:";
  const seriesCount = cleanFrames.length;

  // Create a map to track common labels across series
  const commonLabels: Record<string, string> = {};
  let allSeriesLabels: Array<Record<string, string>> = [];

  // First pass: collect all labels to find common ones
  for (let i = 0; i < seriesCount; i++) {
    const frame = cleanFrames[i];

    // Extract labels from fields
    if (frame.fields && Array.isArray(frame.fields)) {
      const labelField = frame.fields.find((f: any) => f.labels);
      if (labelField && labelField.labels) {
        allSeriesLabels.push(labelField.labels);
      }
    } else if (frame.schema?.fields) {
      const labelField = frame.schema.fields.find((f: any) => f.labels);
      if (labelField && labelField.labels) {
        allSeriesLabels.push(labelField.labels);
      }
    }
  }

  // Find common labels (that have the same value across all series)
  if (allSeriesLabels.length > 1) {
    const firstLabels = allSeriesLabels[0];
    Object.keys(firstLabels).forEach(label => {
      const value = firstLabels[label];
      const isCommon = allSeriesLabels.every(labels => labels[label] === value);
      if (isCommon) {
        commonLabels[label] = value;
      }
    });
  }

  // Add common labels section if any exist
  if (Object.keys(commonLabels).length > 0) {
    formattedData += "\nCOMMON_LABELS:";
    formattedData += Object.entries(commonLabels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(",");
  }

  // Collect all time series data to analyze timestamp patterns
  interface SeriesData {
    name: string;
    metricName: string;
    labels: Record<string, string>;
    times: number[];
    values: number[];
  }

  const allSeriesData: SeriesData[] = [];

  // Extract time and value data from all series
  for (let i = 0; i < seriesCount; i++) {
    const frame = cleanFrames[i];

    // Extract name, either from frame.name, schema.meta.executedQueryString, or using the series index
    let name = frame.name || `Series${i+1}`;
    let query = "";
    if (!frame.name && frame.schema?.meta?.executedQueryString) {
      const queryMatch = frame.schema.meta.executedQueryString.match(/Expr: (.+)(?:\nStep:|$)/);
      if (queryMatch && queryMatch[1]) {
        query = queryMatch[1].trim();
        name = query;
      }
    }

    // Get metric name from the first field with labels
    let metricName = "";
    let labels: Record<string, string> = {};

    // Extract fields from either direct fields or schema.fields
    const fieldsList = frame.fields || frame.schema?.fields || [];

    // Find the field with labels (usually the value field)
    const labelField = fieldsList.find((f: any) => f.labels);
    if (labelField) {
      metricName = labelField.name || "";
      labels = {...labelField.labels};

      // Remove common labels to avoid repetition
      Object.keys(commonLabels).forEach(key => {
        delete labels[key];
      });
    }

    // Extract time and value fields
    const timeField = fieldsList.find((f: any) => f.name === 'Time');
    const valueField = fieldsList.find((f: any) =>
      f.name === 'Value' || f.name === metricName || (f.type === 'number' && f.name !== 'Time')
    );

    // Get the actual data values
    let times: number[] = [];
    let values: number[] = [];

    // Handle different data formats
    if (frame.data?.values && Array.isArray(frame.data.values)) {
      // Format: frame.data.values is an array of arrays (first is timestamps, second is values)
      const timeIndex = fieldsList.findIndex((f: any) => f.name === 'Time');
      const valueIndex = fieldsList.findIndex((f: any) =>
        f.name === 'Value' || f.name === metricName || (f.type === 'number' && f.name !== 'Time')
      );

      if (timeIndex >= 0 && valueIndex >= 0 &&
          frame.data.values[timeIndex] && frame.data.values[valueIndex]) {
        times = frame.data.values[timeIndex];
        values = frame.data.values[valueIndex];
      }
    } else if (timeField?.values && valueField?.values) {
      // Format: each field has its own values array
      times = timeField.values;
      values = valueField.values;
    }

    // Store the series data
    allSeriesData.push({
      name,
      metricName: metricName || name,
      labels,
      times,
      values
    });
  }

  // Analyze timestamp patterns across all series
  let allTimestamps = new Set<number>();

  // Collect all unique timestamps
  allSeriesData.forEach(series => {
    series.times.forEach(time => allTimestamps.add(time));
  });

  // Convert to array and sort
  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

  // Check if timestamps follow a regular interval
  let isRegularInterval = true;
  let interval = 0;

  if (sortedTimestamps.length > 1) {
    // Calculate intervals between consecutive timestamps
    const intervals = new Set<number>();
    for (let i = 1; i < sortedTimestamps.length; i++) {
      intervals.add(sortedTimestamps[i] - sortedTimestamps[i-1]);
    }

    // If there's only one unique interval, it's regular
    if (intervals.size === 1) {
      interval = intervals.values().next().value || 0;
    } else {
      isRegularInterval = false;
    }
  }

  // Add timestamp information
  if (sortedTimestamps.length > 0) {
    const startTime = sortedTimestamps[0];
    const endTime = sortedTimestamps[sortedTimestamps.length - 1];

    formattedData += `\nTIME_INFO:start=${startTime},end=${endTime},points=${sortedTimestamps.length}`;

    if (isRegularInterval && interval > 0) {
      formattedData += `,interval=${interval}`;
    }
  }

  // Process each series with the timestamp information
  for (let i = 0; i < allSeriesData.length; i++) {
    const series = allSeriesData[i];

    formattedData += `\nSERIES${i+1}:${series.metricName}`;

    // Add unique labels for this series
    if (Object.keys(series.labels).length > 0) {
      formattedData += " LABELS:";
      formattedData += Object.entries(series.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",");
    }

    // Process values based on query type
    if (series.values.length === 0) {
      formattedData += " No_values";
    } else if (series.values.length === 1 || series.times.length <= 1) {
      // Instant query - single value
      formattedData += ` VALUE:${series.values[0]}`;
      if (series.times && series.times[0]) {
        formattedData += ` TIME:${series.times[0]}`;
      }
    } else {
      // Range query - multiple values
      const min = Math.min(...series.values);
      const max = Math.max(...series.values);
      const avg = series.values.reduce((sum, v) => sum + v, 0) / series.values.length;

      formattedData += ` STATS:count=${series.values.length},min=${min.toFixed(2)},max=${max.toFixed(2)},avg=${avg.toFixed(2)}`;

      // If we have regular intervals, we can optimize the data representation
      if (isRegularInterval && interval > 0) {
        // Create a map of timestamp to value for this series
        const timeValueMap = new Map<number, number>();
        for (let j = 0; j < series.times.length; j++) {
          timeValueMap.set(series.times[j], series.values[j]);
        }

        // Check if all values are the same
        const allSameValue = series.values.every(v => v === series.values[0]);

        if (allSameValue) {
          // If all values are the same, just report the value once
          formattedData += ` ALL_VALUES:${series.values[0]}`;
        } else {
          // Otherwise, report values in order with missing points marked as null
          formattedData += " VALUES:[";

          let missingPoints = false;
          for (let j = 0; j < sortedTimestamps.length; j++) {
            if (j > 0) {
              formattedData += ",";
            }

            const timestamp = sortedTimestamps[j];
            if (timeValueMap.has(timestamp)) {
              // Using Array.from to convert the map entries to an array and find the matching entry
              // This avoids the TypeScript error with the get() method
              const entry = Array.from(timeValueMap.entries()).find(([time]) => time === timestamp);
              formattedData += entry ? entry[1] : "null";
            } else {
              formattedData += "null";
              missingPoints = true;
            }
          }

          formattedData += "]";

          if (missingPoints) {
            formattedData += " (null=missing_point)";
          }
        }
      } else {
        // If intervals are irregular, include full timestamp-value pairs
        formattedData += " POINTS:[";
        for (let j = 0; j < series.times.length; j++) {
          if (j > 0) {
            formattedData += ",";
          }
          formattedData += `[${series.times[j]},${series.values[j]}]`;
        }
        formattedData += "]";
      }
    }
  }

  return formattedData;
}

/**
 * Function to summarize Prometheus query results using an LLM
 */
export async function summarizePrometheusQueryResult(
  queryType: 'instant' | 'range',
  queryString: string,
  queryResult: any,
  intent: string,
  timeRange?: {
    from: string;
    to: string;
  }
): Promise<string> {
  try {
    // Create the summarization request
    const request: SummarizationRequest = {
      queryType,
      queryString,
      queryResult,
      intent,
      timeRange
    };

    // Generate system prompt and prepare data
    const systemPrompt = generateSystemPrompt(request);
    const formattedData = prepareQueryResultForLLM(queryResult);

    // Create LLM instance for summarization
    const summaryLLM = new ChatAnthropic({
      model: 'claude-3-haiku-latest',
      temperature: 0,
      apiKey: ANTHROPIC_API_KEY,
    });

    // Call LLM directly
    const response = await summaryLLM.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: formattedData }
    ]);

    if (response && response.content) {
      return response.content as string;
    }

    // Fallback message if LLM summarization fails
    return "Unable to generate summary. Please check the raw data for insights.";
  } catch (error: unknown) {
    console.error('Error summarizing Prometheus query result:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return `Failed to summarize query results: ${errorMessage}. Please check the raw data.`;
  }
}
