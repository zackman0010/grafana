import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { getBackendSrv } from 'app/core/services/backend_srv';
import { getDataSources } from 'app/features/datasources/api';
import { getCurrentContext } from './context';

// Helper to get current time in seconds (Unix timestamp)
const getCurrentTimeInSeconds = (): number => Math.floor(Date.now() / 1000);

// Helper to get default time range (last 1h) if not provided
const getDefaultTimeRange = (): { start: number; end: number } => {
  const end = getCurrentTimeInSeconds();
  const start = end - 3600; // Last hour (3600 seconds)
  return { start, end };
};

// Function to get Prometheus label values
const getPrometheusLabelValues = async (
  datasourceUid: string,
  labelName: string,
  start?: number,
  end?: number
): Promise<string[]> => {
  try {
    // If time range not provided, use default (last 1h)
    const timeRange = !start || !end ? getDefaultTimeRange() : { start, end };

    const params: Record<string, any> = {
      start: timeRange.start,
      end: timeRange.end,
    };

    const response = await getBackendSrv().get(
      `/api/datasources/uid/${datasourceUid}/resources/api/v1/label/${labelName}/values`,
      params
    );

    return response.data?.result || [];
  } catch (error) {
    console.error(`Error fetching Prometheus label values for ${labelName}:`, error);
    throw new Error(`Failed to fetch label values for datasource ${datasourceUid}: ${error}`);
  }
};

// Function to get Prometheus label names
const getPrometheusLabelNames = async (datasourceUid: string, start?: number, end?: number): Promise<string[]> => {
  try {
    // If time range not provided, use default (last 1h)
    const timeRange = !start || !end ? getDefaultTimeRange() : { start, end };

    const params: Record<string, any> = {
      start: timeRange.start,
      end: timeRange.end,
    };

    const response = await getBackendSrv().get(`/api/datasources/uid/${datasourceUid}/resources/api/v1/labels`, params);

    return response.data?.result || [];
  } catch (error) {
    console.error('Error fetching Prometheus label names:', error);
    throw new Error(`Failed to fetch label names for datasource ${datasourceUid}: ${error}`);
  }
};

// Function to execute a Prometheus instant query
const executePrometheusInstantQuery = async (
  datasourceUid: string,
  query: string,
  time?: number,
  timeout?: string
): Promise<any> => {
  try {
    const params: Record<string, any> = {
      query,
    };

    // Use specified time or current time
    if (time) {
      params.time = time;
    }

    // Add timeout if specified
    if (timeout) {
      params.timeout = timeout;
    }

    const response = await getBackendSrv().get(`/api/datasources/uid/${datasourceUid}/resources/api/v1/query`, params);

    return response.data;
  } catch (error) {
    console.error('Error executing Prometheus instant query:', error);
    throw new Error(`Failed to execute instant query for datasource ${datasourceUid}: ${error}`);
  }
};

// Function to execute a Prometheus range query
const executePrometheusRangeQuery = async (
  datasourceUid: string,
  query: string,
  start: number,
  end: number,
  step: string,
  timeout?: string
): Promise<any> => {
  try {
    const params: Record<string, any> = {
      query,
      start,
      end,
      step,
    };

    // Add timeout if specified
    if (timeout) {
      params.timeout = timeout;
    }

    const response = await getBackendSrv().get(
      `/api/datasources/uid/${datasourceUid}/resources/api/v1/query_range`,
      params
    );

    return response.data;
  } catch (error) {
    console.error('Error executing Prometheus range query:', error);
    throw new Error(`Failed to execute range query for datasource ${datasourceUid}: ${error}`);
  }
};

const listDatasourcesSchema = z.object({
  uid: z.string().optional().describe('Optional datasource uid for exact matching'),
  name: z.string().optional().describe('Optional datasource name (can be a regex pattern)'),
});

const listDatasourcesTool = tool(
  async (input): Promise<string> => {
    // Parse the input using the schema
    const parsedInput = listDatasourcesSchema.parse(input);
    const { uid, name } = parsedInput;
    const datasources = await getDataSources();

    let filteredDatasources = datasources;

    if (uid) {
      filteredDatasources = filteredDatasources.filter((ds) => ds.uid === uid);
    }

    if (name) {
      try {
        const nameRegex = new RegExp(name);
        filteredDatasources = filteredDatasources.filter((ds) => nameRegex.test(ds.name));
      } catch (error) {
        // If regex is invalid, treat it as a simple string match
        filteredDatasources = filteredDatasources.filter((ds) => ds.name.includes(name));
      }
    }

    return JSON.stringify(filteredDatasources);
  },
  {
    name: 'list_datasources',
    description: 'List all datasources. Can filter by uid (exact match) or name (regex pattern).',
    schema: listDatasourcesSchema,
  }
);

// Define schema for Prometheus label values tool
const prometheusLabelValuesSchema = z.object({
  datasource_uid: z.string().describe('The datasource UID of the Prometheus/Cortex/Mimir datasource'),
  label_name: z.string().describe('The label name to query values for. Use "__name__" for metric names.'),
  start: z
    .number()
    .optional()
    .describe('Optional start timestamp for the query range. Defaults to 1 hour ago if not provided.'),
  end: z
    .number()
    .optional()
    .describe('Optional end timestamp for the query range. Defaults to current time if not provided.'),
  regex: z.string().optional().describe('Optional regex pattern to filter label values'),
});

export const pageContextTool = tool(
  async () => {
    const context = await getCurrentContext();
    return JSON.stringify(context);
  },
  {
    name: 'get_context',
    description: 'Data about the module where the user is at and the current state of the application',
  }
);

// Create Prometheus label values tool (previously metrics tool)
const prometheusLabelValuesTool = tool(
  async (input): Promise<string> => {
    // Parse the input using the schema
    const parsedInput = prometheusLabelValuesSchema.parse(input);
    const { datasource_uid, label_name, start, end, regex } = parsedInput;

    // Fetch the label values from the datasource
    const labelValues = await getPrometheusLabelValues(datasource_uid, label_name, start, end);

    // Filter by regex if provided
    let filteredValues = labelValues;
    if (regex) {
      try {
        const regexPattern = new RegExp(regex);
        filteredValues = labelValues.filter((value) => regexPattern.test(value));
      } catch (error) {
        // If regex is invalid, treat it as a simple string match
        filteredValues = labelValues.filter((value) => value.includes(regex));
      }
    }

    // Convert to CSV format
    return filteredValues.join(',');
  },
  {
    name: 'list_prometheus_label_values',
    description:
      'List values for a specified Prometheus label. Use label_name="__name__" to get metric names. Default time range is last hour if not specified.',
    schema: prometheusLabelValuesSchema,
  }
);

// Define schema for Prometheus label names tool
const prometheusLabelNamesSchema = z.object({
  datasource_uid: z.string().describe('The datasource UID of the Prometheus/Cortex/Mimir datasource'),
  start: z
    .number()
    .optional()
    .describe('Optional start timestamp for the query range. Defaults to 1 hour ago if not provided.'),
  end: z
    .number()
    .optional()
    .describe('Optional end timestamp for the query range. Defaults to current time if not provided.'),
  regex: z.string().optional().describe('Optional regex pattern to filter label names'),
});

// Create Prometheus label names tool
const prometheusLabelNamesTool = tool(
  async (input): Promise<string> => {
    // Parse the input using the schema
    const parsedInput = prometheusLabelNamesSchema.parse(input);
    const { datasource_uid, start, end, regex } = parsedInput;

    // Fetch the label names from the datasource
    const labelNames = await getPrometheusLabelNames(datasource_uid, start, end);

    // Filter by regex if provided
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

    // Convert to CSV format
    return filteredNames.join(',');
  },
  {
    name: 'list_prometheus_label_names',
    description:
      'List all available Prometheus label names for a given datasource. Default time range is last hour if not specified.',
    schema: prometheusLabelNamesSchema,
  }
);

// Define schema for Prometheus instant query tool
const prometheusInstantQuerySchema = z.object({
  datasource_uid: z.string().describe('The datasource UID of the Prometheus/Cortex/Mimir datasource'),
  query: z.string().describe('The PromQL query expression to evaluate'),
  time: z
    .number()
    .optional()
    .describe('Optional evaluation timestamp (Unix seconds). Defaults to current time if not provided.'),
  timeout: z
    .string()
    .optional()
    .describe('Optional evaluation timeout (e.g., "30s"). Uses datasource default if not specified.'),
});

// Create Prometheus instant query tool
const prometheusInstantQueryTool = tool(
  async (input): Promise<string> => {
    // Parse the input using the schema
    const parsedInput = prometheusInstantQuerySchema.parse(input);
    const { datasource_uid, query, time, timeout } = parsedInput;

    // Execute the instant query
    const result = await executePrometheusInstantQuery(datasource_uid, query, time, timeout);

    // Return the complete JSON response
    return JSON.stringify(result);
  },
  {
    name: 'prometheus_instant_query',
    description: 'Execute a Prometheus instant query to evaluate a PromQL expression at a single point in time.',
    schema: prometheusInstantQuerySchema,
  }
);

// Define schema for Prometheus range query tool
const prometheusRangeQuerySchema = z.object({
  datasource_uid: z.string().describe('The datasource UID of the Prometheus/Cortex/Mimir datasource'),
  query: z.string().describe('The PromQL query expression to evaluate'),
  start: z.number().describe('Start timestamp for the query range (Unix seconds)'),
  end: z.number().describe('End timestamp for the query range (Unix seconds)'),
  step: z.string().describe('Query resolution step width as a duration string (e.g., "15s", "1m", "1h")'),
  timeout: z
    .string()
    .optional()
    .describe('Optional evaluation timeout (e.g., "30s"). Uses datasource default if not specified.'),
});

// Create Prometheus range query tool
const prometheusRangeQueryTool = tool(
  async (input): Promise<string> => {
    // Parse the input using the schema
    const parsedInput = prometheusRangeQuerySchema.parse(input);
    const { datasource_uid, query, start, end, step, timeout } = parsedInput;

    // Execute the range query
    const result = await executePrometheusRangeQuery(datasource_uid, query, start, end, step, timeout);

    // Return the complete JSON response
    return JSON.stringify(result);
  },
  {
    name: 'prometheus_range_query',
    description: 'Execute a Prometheus range query to evaluate a PromQL expression over a range of time.',
    schema: prometheusRangeQuerySchema,
  }
);

// Combine all tools from both branches
export const tools = [
  pageContextTool,
  listDatasourcesTool,
  prometheusLabelValuesTool,
  prometheusLabelNamesTool,
  prometheusInstantQueryTool,
  prometheusRangeQueryTool,
];

export const toolsByName = tools.reduce(
  (acc, tool) => {
    acc[tool.name] = tool;
    return acc;
  },
  {} as Record<string, (typeof tools)[number]>
);
