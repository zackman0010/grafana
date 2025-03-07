import { getAgent } from '../agent';

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
 * Simple interface for data frame structure
 */
interface DataFrame {
  fields?: Array<{ name: string; values?: any; labels?: any }>;
  name?: string;
  length?: number;
}

/**
 * System prompt template for guiding the LLM in summarizing Loki query results
 */
const SYSTEM_PROMPT_TEMPLATE = `
You are an expert log analysis and metrics specialist. Your task is to summarize the results of a Loki query in a concise and insightful way.

QUERY TYPE: {{queryType}}
QUERY STRING: {{queryString}}
{{#if timeRange}}
TIME RANGE: From {{timeRange.from}} to {{timeRange.to}}
{{/if}}
USER INTENT: {{intent}}

Follow these guidelines:
1. First determine if the result contains logs or metrics data
2. For logs:
   - Provide 3-5 representative log examples that best illustrate the pattern/issue
   - Analyze log patterns, frequencies, and noteworthy trends
   - Extract key information related to the user's intent
   - Highlight anomalies, errors, or unusual patterns
   - Provide concise, actionable insights
   - If nothing is found, just say "No data found"

3. For metrics:
   - Focus on 3-5 key observations about the data patterns
   - Include specific numbers, min/max values, and interesting trends
   - Identify anomalies, spikes, or unusual behavior
   - Relate findings directly to the user's intent
   - If nothing is found, just say "No data found"

Be extremely concise, focus solely on insights directly related to the user's intent.
Format your response in clear sections with bullet points for observations.
Include relevant log examples when dealing with log data.
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
 * Function to prepare the Loki query result for the LLM
 * This extracts essential data and formats it in a way that's easier for the LLM to understand
 */
function prepareQueryResultForLLM(result: any): string {
  if (!result || !result.data || !Array.isArray(result.data) || result.data.length === 0) {
    return "No data or invalid data structure";
  }

  const frames = result.data;
  let formattedData = "QUERY_RESULT:";

  // Determine result type (logs or metrics)
  const isLogResult = frames.some((frame: DataFrame) =>
    frame.fields && frame.fields.some((field: any) => field.name === 'line')
  );

  const isMetricResult = frames.some((frame: DataFrame) =>
    frame.fields && frame.fields.some((field: any) => field.name === 'Value')
  );

  if (isLogResult) {
    formattedData += "\nRESULT_TYPE: logs";
    formattedData += `\nLOG_COUNT: ${frames[0].length || 0}`;

    // Extract and format log entries (up to 20 for the LLM to analyze)
    const maxLogEntries = Math.min(frames[0].length || 0, 20);
    if (maxLogEntries > 0) {
      formattedData += "\nLOG_ENTRIES:";

      for (let i = 0; i < maxLogEntries; i++) {
        const timestampField = frames[0].fields?.find((f: any) => f.name === 'ts' || f.name === 'Time');
        const lineField = frames[0].fields?.find((f: any) => f.name === 'line');
        const labelsField = frames[0].fields?.find((f: any) => f.name === 'labels');

        if (timestampField && lineField) {
          const timestamp = timestampField.values.get(i);
          const formattedTime = timestamp ? new Date(timestamp).toISOString() : 'unknown_time';
          const logLine = lineField.values.get(i);

          formattedData += `\n[${formattedTime}]`;

          // Add labels if available
          if (labelsField) {
            const labels = labelsField.values.get(i);
            if (labels) {
              formattedData += ` {${Object.entries(labels)
                .map(([key, value]) => `${key}="${value}"`)
                .join(', ')}}`;
            }
          }

          formattedData += ` ${logLine}`;
        }
      }

      if (frames[0].length > maxLogEntries) {
        formattedData += `\n... and ${frames[0].length - maxLogEntries} more log entries not shown`;
      }
    }
  } else if (isMetricResult) {
    formattedData += "\nRESULT_TYPE: metrics";
    formattedData += `\nSERIES_COUNT: ${frames.length}`;

    // Process each series (frame)
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i] as DataFrame;
      const nameField = frame.name || `Series ${i + 1}`;

      // Find label fields to extract metric names and labels
      const labelField = frame.fields?.find((f: any) => f.labels);
      let labels = '';
      if (labelField && labelField.labels) {
        labels = Object.entries(labelField.labels)
          .map(([key, value]) => `${key}="${value}"`)
          .join(', ');
      }

      formattedData += `\n\nSERIES ${i + 1}: ${nameField} {${labels}}`;

      // Extract times and values
      const timeField = frame.fields?.find((f: any) => f.name === 'Time');
      const valueField = frame.fields?.find((f: any) => f.name === 'Value');

      if (timeField && valueField) {
        const times = timeField.values.toArray();
        const values = valueField.values.toArray();

        // Calculate some basic stats
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;

        formattedData += `\nPoints: ${values.length}, Min: ${min}, Max: ${max}, Avg: ${avg.toFixed(2)}`;

        // Include a sample of data points (up to 10)
        const maxPoints = Math.min(values.length, 10);
        if (maxPoints > 0) {
          formattedData += "\nSample points:";
          for (let j = 0; j < maxPoints; j++) {
            // Pick evenly distributed points
            const idx = Math.floor(j * (values.length / maxPoints));
            const time = times[idx] ? new Date(times[idx]).toISOString() : 'unknown';
            formattedData += `\n  [${time}, ${values[idx]}]`;
          }
        }
      }
    }
  } else {
    formattedData += "\nRESULT_TYPE: unknown";
    formattedData += "\nDATA: " + JSON.stringify(frames, null, 2).substring(0, 2000);
  }

  return formattedData;
}

/**
 * Function to summarize Loki query results using an LLM
 */
export async function summarizeLokiQueryResult(
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

    // Call LLM directly
    const response = await getAgent().haikuLlm.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: formattedData }
    ]);

    if (response && response.content) {
      return response.content as string;
    }

    // Fallback message if LLM summarization fails
    return "Unable to generate summary. Please check the raw data for insights.";
  } catch (error: unknown) {
    console.error('Error summarizing Loki query result:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return `Failed to summarize query results: ${errorMessage}. Please check the raw data.`;
  }
}
