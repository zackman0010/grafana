import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { getBackendSrv } from '@grafana/runtime';

const readCommunityDashboardSchema = z.object({
  id: z.string().describe('The ID of the community dashboard'),
});

export const readCommunityDashboardTool = tool(
  async (input) => {
    const { id } = readCommunityDashboardSchema.parse(input);

    // Get details
    const details = await getBackendSrv().get(`https://grafana.com/api/dashboards/${id}`);
    const dashboardJson = await getBackendSrv().get(
      `https://grafana.com/api/dashboards/${id}/revisions/${details.revision}/download`
    );

    return JSON.stringify({
      details,
      dashboardJson,
    });
  },
  {
    name: 'read_community_dashboard',
    description: `This tool reads a community dashboard. It returns a JSON with two properties:
- details: The details of the dashboard
- dashboardJson: The JSON of the dashboard itself.`,
    schema: readCommunityDashboardSchema,
  }
);
