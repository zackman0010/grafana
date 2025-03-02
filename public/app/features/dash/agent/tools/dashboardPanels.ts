import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { DashboardScene } from 'app/features/dashboard-scene/scene/DashboardScene';
import { vizPanelToPanel } from 'app/features/dashboard-scene/serialization/transformSceneToSaveModel';
import { findOriginalVizPanelByKey } from 'app/features/dashboard-scene/utils/utils';

const dashboardPanelsSchema = z.object({
  id: z.string().optional().describe('Panel ID'),
});

export const dashboardPanelsTool = tool(
  async (input) => {
    if (!(window.__grafanaSceneContext instanceof DashboardScene)) {
      return '{}';
    }

    const parsedInput = dashboardPanelsSchema.parse(input);
    const { id } = parsedInput;

    if (id) {
      try {
        const vizPanel = findOriginalVizPanelByKey(window.__grafanaSceneContext, id);

        if (!vizPanel) {
          return '{}';
        }

        return JSON.stringify(vizPanelToPanel(vizPanel));
      } catch (err) {
        return '{}';
      }
    }

    return JSON.stringify(
      window.__grafanaSceneContext.state.body.getVizPanels().map((vizPanel) => vizPanelToPanel(vizPanel))
    );
  },
  {
    name: 'dashboard_panels',
    description: 'List panels in the current dashboard. Optionally pass a panel ID to get a specific details.',
    schema: dashboardPanelsSchema,
  }
);
