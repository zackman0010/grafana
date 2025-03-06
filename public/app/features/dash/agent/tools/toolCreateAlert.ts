import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { locationService } from '@grafana/runtime';

const alertSchema = z.object({
  title: z.string().describe('The title of the alert'),
  folderUid: z.string().optional().describe('The folder UID to place the alert in'),
  condition: z.string().describe('The alert condition expression'),
  for: z.string().optional().describe('How long the condition must be true before alerting (e.g. "5m")'),
  labels: z.record(z.string()).optional().describe('Labels to attach to the alert'),
  annotations: z.record(z.string()).optional().describe('Annotations to attach to the alert'),
});

export const createAlertRuleTool = tool(
  async (input): Promise<string> => {
    // Validate input
    const validatedInput = alertSchema.parse(input);

    // Create alert data
    const alertData = {
      folderUid: validatedInput.folderUid || 'general',
      ruleGroup: 'API Created',
      title: validatedInput.title,
      condition: validatedInput.condition,
      for: validatedInput.for || '5m',
      labels: validatedInput.labels || {},
      annotations: validatedInput.annotations || {},
      isPaused: false,
      noDataState: 'NoData',
      execErrState: 'Error',
    };

    // Create alert using the correct API endpoint
    const folderUid = validatedInput.folderUid || 'default';
    const response = await fetch(`/api/ruler/grafana/api/v1/rules/${encodeURIComponent(folderUid)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        [folderUid]: [
          {
            ...alertData,
            uid: undefined, // Let the server generate the UID
          },
        ],
      }),
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      return JSON.stringify({
        success: false,
        error: `Failed to parse API response. The server returned: ${responseText}`,
      });
    }

    if (response.status < 200 || response.status >= 300) {
      if (response.status === 404) {
        return JSON.stringify({
          success: false,
          error: `Failed to create alert. The folder UID "${validatedInput.folderUid || 'general'}" does not exist. Please provide a valid folder UID.`,
        });
      }
      return JSON.stringify({
        success: false,
        error: `Failed to create alert. The server returned: ${responseText}`,
      });
    }

    // Extract the UID from the response
    const alertUid = result?.uid;
    if (!alertUid) {
      return JSON.stringify({
        success: false,
        error: `Invalid response from Grafana API. The server response was missing the required 'uid' field. Response: ${JSON.stringify(result)}`,
      });
    }

    // Only proceed with success response if we have a valid UID
    const alertUrl = `/alerting/${encodeURIComponent(alertUid)}/${encodeURIComponent(validatedInput.title)}/view`;
    locationService.push({ pathname: alertUrl });

    return JSON.stringify({
      success: true,
      uid: alertUid,
      alertUrl,
      message:
        'Alert created successfully. You have been navigated to the alert view page where you can see the details of your alert.',
      apiResponse: {
        value: result,
        label: 'Alert Creation API Response',
      },
    });
  },
  {
    name: 'create_alert_rule',
    description:
      'Creates a new alert rule with the specified title, condition, and optional parameters. Automatically navigates to the alert view page after creation where you can see the details of your alert.',
    schema: alertSchema,
    metadata: {
      explainer: () => {
        return `Creating an alert rule`;
      },
    },
  }
);
