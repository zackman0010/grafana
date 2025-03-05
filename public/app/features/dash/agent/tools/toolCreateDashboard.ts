import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { locationService } from '@grafana/runtime';

const dashboardSchema = z.object({
  title: z.string().describe('The title of the dashboard'),
  uid: z.string().optional().describe('The unique identifier for the dashboard'),
  folderUid: z.string().optional().describe('The folder UID to place the dashboard in'),
  data: z.any().describe('The dashboard data object containing panels and other configuration'),
});

export const createDashboardTool = tool(
  async (input): Promise<string> => {
    // Validate input
    const validatedInput = dashboardSchema.parse(input);

    // Create dashboard data
    const dashboardData = {
      dashboard: {
        ...validatedInput.data,
        title: validatedInput.title,
        uid: validatedInput.uid,
        folderUid: validatedInput.folderUid,
      },
      overwrite: false,
    };

    // Create dashboard
    const response = await fetch('/api/dashboards/db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dashboardData),
    });

    if (!response.ok) {
      return JSON.stringify({
        error: 'Failed to create dashboard',
        details: response.statusText,
      });
    }

    const result = await response.json();

    if (!result.uid || !result.url) {
      return JSON.stringify({
        error: 'Invalid response from Grafana API',
        details: 'Response missing required fields',
      });
    }

    // Navigate to the new dashboard
    locationService.push({ pathname: result.url });

    return JSON.stringify({
      success: true,
      uid: result.uid,
      url: result.url,
      message: 'Dashboard created and navigated to successfully',
    });
  },
  {
    name: 'create_dashboard',
    description:
      'Creates a new dashboard with the specified title, optional UID, folder, and dashboard data. Automatically navigates to the new dashboard after creation. Minimise calls to this tool by consolodating all the new panels you want to add and building the data.',
    schema: dashboardSchema,
  }
);
