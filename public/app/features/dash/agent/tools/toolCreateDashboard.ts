import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { locationService } from '@grafana/runtime';

const dashboardSchema = z.object({
  title: z.string().describe('The title of the dashboard'),
  uid: z.string().optional().describe('The unique identifier for the dashboard'),
  folderUid: z.string().optional().describe('The folder UID to place the dashboard in'),
});

export const createDashboardTool = tool(
  async (input): Promise<string> => {
    // Validate input
    const validatedInput = dashboardSchema.parse(input);

    // Create dashboard data
    const dashboardData = {
      dashboard: {
        title: validatedInput.title,
        uid: validatedInput.uid,
        folderUid: validatedInput.folderUid,
        panels: [],
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
      message: 'Dashboard created successfully. Use the add_dashboard_panels tool to add panels to this dashboard.',
    });
  },
  {
    name: 'create_dashboard',
    description:
      'Creates a new empty dashboard with the specified title, optional UID, and folder. After creating the dashboard, you should use the add_dashboard_panels tool to add panels to it. This separation allows for better control over dashboard creation and panel addition.',
    schema: dashboardSchema,
  }
);
