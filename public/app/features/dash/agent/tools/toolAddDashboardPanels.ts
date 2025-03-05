import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { VizPanel } from '@grafana/scenes';
import { DashboardScene } from '../../../dashboard-scene/scene/DashboardScene';

const panelConfigSchema = z.object({
  title: z.string().optional().describe('The title of the panel'),
  description: z.string().optional().describe('The description of the panel'),
  pluginId: z.string().describe('The ID of the panel plugin to use'),
  options: z.record(z.unknown()).describe('The panel options configuration'),
  gridPos: z
    .object({
      h: z.number().optional().describe('Height of the panel in grid units'),
      w: z.number().optional().describe('Width of the panel in grid units'),
      x: z.number().optional().describe('X position in grid units'),
      y: z.number().optional().describe('Y position in grid units'),
    })
    .optional()
    .describe('Grid position configuration'),
});

const addDashboardPanelsSchema = z.object({
  panels: z.array(panelConfigSchema).describe('Array of panel configurations to add'),
});

async function addSinglePanel(config: z.infer<typeof panelConfigSchema>): Promise<string> {
  if (!(window.__grafanaSceneContext instanceof DashboardScene)) {
    return JSON.stringify({
      error: 'No dashboard scene context found',
      details: 'The dashboard context is not available. This usually means the dashboard is not loaded.',
    });
  }

  try {
    const dashboard = window.__grafanaSceneContext;

    // Create a new VizPanel with the provided configuration
    const vizPanel = new VizPanel({
      title: config.title,
      description: config.description,
      pluginId: config.pluginId,
      options: config.options,
    });

    // Add the panel to the dashboard
    dashboard.addPanel(vizPanel);

    return JSON.stringify({
      success: true,
      panelId: vizPanel.state.key,
      details: `Successfully added panel with title: ${config.title || 'Untitled'}`,
    });
  } catch (error) {
    return JSON.stringify({
      error: 'Failed to add panel',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export const addDashboardPanelsTool = tool(
  async (input): Promise<string> => {
    const parsedInput = addDashboardPanelsSchema.parse(input);
    const { panels } = parsedInput;

    const results = await Promise.all(
      panels.map(async (panelConfig) => {
        const result = await addSinglePanel(panelConfig);
        return {
          ...JSON.parse(result),
          config: panelConfig,
        };
      })
    );

    return JSON.stringify({
      success: true,
      results,
    });
  },
  {
    name: 'add_dashboard_panels',
    description:
      'Adds new panels to the current dashboard. Each panel requires a pluginId and options configuration. The gridPos is optional and will use defaults if not specified. Use the grafana_com_docs_search tool to find available panel plugins and their configuration options. Minimise calls to this tool by consolodating all the new panels you want to add.',
    schema: addDashboardPanelsSchema,
  }
);
