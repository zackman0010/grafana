import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { Field } from '@grafana/data';

const getDrilldownLogToSummarizeSchema = z.object({
  logs_quantity: z.number().optional().describe('How many from the logs in display to summarize, from 1 to 1000.'),
});

const error =
  'Failure. The user is not in Drilldown Logs or does not have logs in display. Help them navigate to Drilldown logs with a filter.';

export const getDrilldownLogToSummarizeTool = tool(
  async (input) => {
    const { logs_quantity } = getDrilldownLogToSummarizeSchema.parse(input);

    if (!window.__grafanaSceneContext) {
      return error;
    }
    const scene = window.__grafanaSceneContext;
    if (!scene.state?.body?.state?.contentScene?.state?.$data?.state?.data?.series[0]?.fields) {
      return error;
    }
    const fields: Field[] = scene.state?.body?.state?.contentScene?.state?.$data?.state?.data?.series[0]?.fields ?? [];
    const lineField = fields.find((field) => field.name === 'Line' || field.name === 'body');
    if (!lineField) {
      return error;
    }
    const values = logs_quantity && logs_quantity > 0 ? lineField.values.slice(0, logs_quantity) : lineField.values;

    return JSON.stringify(values);
  },
  {
    name: 'get_drilldown_logs_to_summarize',
    description:
      'When the current app is Drilldown Logs, use this tool to create a summary of the logs in display for the user. If the user is not in Drilldown logs, help them navigate to it with a filter.',
    schema: getDrilldownLogToSummarizeSchema,
    metadata: {
      explainer: () => {
        return `get logs to summarize`;
      },
    },
    verboseParsingErrors: true,
  }
);
