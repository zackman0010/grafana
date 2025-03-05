import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { locationService } from '@grafana/runtime';

import { createRelativeUrl } from '../../utils/url';

// Define more specific schemas for the alert rule defaults
const queryModelSchema = z
  .object({
    datasource: z.object({
      type: z.string(),
      uid: z.string(),
    }),
    expr: z.string().optional(),
    editorMode: z.string().optional(),
    legendFormat: z.string().optional(),
    range: z.boolean().optional(),
    refId: z.string(),
    adhocFilters: z.array(z.any()).optional(),
    interval: z.string().optional(),
    intervalMs: z.number().optional(),
    // Additional fields for expression queries
    type: z.string().optional(),
    conditions: z.array(z.any()).optional(),
    reducer: z.union([z.string(), z.object({}).passthrough()]).optional(),
    expression: z.string().optional(),
  })
  .passthrough();

const querySchema = z
  .object({
    refId: z.string(),
    queryType: z.string().optional(),
    relativeTimeRange: z
      .object({
        from: z.number(),
        to: z.number(),
      })
      .optional(),
    datasourceUid: z.string(),
    model: queryModelSchema,
  })
  .passthrough();

const annotationSchema = z.object({
  key: z.string(),
  value: z.string(),
});

const defaultsSchema = z
  .object({
    type: z.string().describe('The type of alert rule, e.g., "grafana-alerting"'),
    queries: z.array(querySchema).describe('The queries used to evaluate the alert condition'),
    name: z.string().optional().describe('The name of the alert rule'),
    condition: z.string().optional().describe('The condition refId that determines when the alert fires'),
    annotations: z.array(annotationSchema).optional().describe('Additional metadata for the alert rule'),
    // Add other fields as needed
  })
  .passthrough();

const createAlertSchema = z.object({
  navigate: z
    .boolean()
    .describe(
      'Whether to navigate to create a new alert. Only ever set this to true if the user has confirmed to create a new alert.'
    ),
  returnTo: z.string().optional().describe('Optional URL to return to after creating the alert.'),
  defaults: defaultsSchema
    .optional()
    .describe('Optional default values for the new alert, including type, queries, name, condition, and annotations.'),
});

export const createAlertTool = tool(
  async (input) => {
    const { navigate, returnTo, defaults } = createAlertSchema.parse(input);

    const queryParams: Record<string, string> = {};

    if (returnTo) {
      queryParams.returnTo = returnTo;
    }

    if (defaults) {
      queryParams.defaults = JSON.stringify(defaults);
    }

    const url = createRelativeUrl('/alerting/new', queryParams);

    if (navigate) {
      locationService.push(url);
    }

    return url;
  },
  {
    name: 'create_alert_rule',
    description:
      'Use this tool when the user wants to create a new alert rule. NEVER use it without asking the user for confirmation.',
    schema: createAlertSchema,
  }
);
