import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { locationService } from '@grafana/runtime';

import { getDashboards } from './context/autocomplete';

const navigateToDashboardToolSchema = z.object({
  dashboard_uid: z.string().optional().describe('UID of the dashboard'),
  dashboard_title: z.string().optional().describe('Title of the dashboard'),
  dashboard_tag: z.string().optional().describe('String tag that labels the dashboard'),
  navigate: z.boolean().describe('Whether to navigate to the dashboard. Only ever set this to true if the user has confirmed to navigate to the dashboard.'),
});

export const navigateToDashboardTool = tool(
  async (input) => {
    const { dashboard_uid, dashboard_title, dashboard_tag, navigate } = navigateToDashboardToolSchema.parse(input);

    if (!dashboard_uid && !dashboard_title && !dashboard_tag) {
      return 'Failure. Ask the user which dashboard they want to see.';
    }

    const dashboard = (await getDashboards()).find((dashboard) => {
      if (dashboard_uid && dashboard.uid === dashboard_uid) {
        return true;
      }
      if (dashboard_title && dashboard.title === dashboard_title) {
        return true;
      }
      if (dashboard_tag) {
        return dashboard.tags.includes(dashboard_tag);
      }
      return false;
    });

    if (!dashboard) {
      return 'Failure. Tell the user that the dashboard does not exist';
    }

    const url = dashboard.url;
    if (navigate) {
      locationService.push(url);
    }

    return url;
  },
  {
    name: 'navigate_to_dashboard',
    description:
      'Use this tool when the user wants to navigate to a dashboard represented by its title or uid.  NEVER use it without asking the user for confirmation.',
    schema: navigateToDashboardToolSchema,
  }
);
