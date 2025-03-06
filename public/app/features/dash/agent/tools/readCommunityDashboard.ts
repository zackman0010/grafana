import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { getBackendSrv } from '@grafana/runtime';

const readCommunityDashboardSchema = z.object({
  id: z.string().describe('The ID of the community dashboard'),
});

export const readCommunityDashboardTool = tool(
  async (input) => {
    const { id } = readCommunityDashboardSchema.parse(input);

    try {
      return JSON.stringify((await getBackendSrv().get(`/api/gnet/dashboards/${id}`)).json);
    } catch (error) {
      return JSON.stringify({});
    }
  },
  {
    name: 'read_community_dashboard',
    description: `This tool reads a community dashboard. It returns a JSON with two properties:
- details: The details of the dashboard
- dashboardJson: The JSON of the dashboard itself.`,
    schema: readCommunityDashboardSchema,
    metadata: {
      explainer: () => {
        return 'Reading community dashboard';
      },
    },
  }
);
