import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { DashboardScene } from '../../../dashboard-scene/scene/DashboardScene';
import { findOriginalVizPanelByKey } from '../../../dashboard-scene/utils/utils';
import { VizPanelState } from '@grafana/scenes';

const updateDashboardPanelSchema = z.object({
  panelId: z.string().describe('The ID of the panel to update'),
  config: z.record(z.unknown()).describe('The new configuration to apply to the panel'),
});

function generateDiffMarkdown(oldState: VizPanelState, newState: VizPanelState): string {
  const changes: string[] = [];

  // Check for added/modified values
  for (const [key, newValue] of Object.entries(newState)) {
    if (!(key in oldState)) {
      changes.push(`- Added: \`${key}\` = \`${JSON.stringify(newValue)}\``);
    } else if (JSON.stringify(oldState[key as keyof VizPanelState]) !== JSON.stringify(newValue)) {
      changes.push(
        `- Changed: \`${key}\` from \`${JSON.stringify(oldState[key as keyof VizPanelState])}\` to \`${JSON.stringify(newValue)}\``
      );
    }
  }

  // Check for removed values
  for (const key of Object.keys(oldState)) {
    if (!(key in newState)) {
      changes.push(`- Removed: \`${key}\` (was \`${JSON.stringify(oldState[key as keyof VizPanelState])}\`)`);
    }
  }

  if (changes.length === 0) {
    return 'No changes detected in panel configuration.';
  }

  return 'Changes made to panel:\n' + changes.join('\n');
}

export const updateDashboardPanelTool = tool(
  async (input): Promise<string> => {
    const parsedInput = updateDashboardPanelSchema.parse(input);
    const { panelId, config } = parsedInput;

    if (!(window.__grafanaSceneContext instanceof DashboardScene)) {
      return JSON.stringify({
        error: 'No dashboard scene context found',
        details: 'The dashboard context is not available. This usually means the dashboard is not loaded.',
      });
    }

    const panel = findOriginalVizPanelByKey(window.__grafanaSceneContext, panelId);
    if (!panel) {
      return JSON.stringify({
        error: `Panel with ID ${panelId} not found`,
        details: 'The panel you are trying to update does not exist in the current dashboard.',
      });
    }

    try {
      const oldState = { ...panel.state };
      panel.setState(config);

      // Check for panel errors after update
      const panelState = panel.state;

      // Check for plugin load errors
      if ('_pluginLoadError' in panelState && panelState._pluginLoadError) {
        return JSON.stringify({
          error: 'Panel has errors after update',
          details: panelState._pluginLoadError,
        });
      }

      // Check for plugin load errors in editor state
      if ('pluginLoadError' in panelState && panelState.pluginLoadError) {
        return JSON.stringify({
          error: 'Panel plugin error',
          details: panelState.pluginLoadError,
        });
      }

      // Check for data errors
      const dataProvider = panel.state.$data;
      if (dataProvider && 'error' in dataProvider.state && dataProvider.state.error) {
        return JSON.stringify({
          error: 'Panel data error',
          details: dataProvider.state.error,
        });
      }

      const diffMarkdown = generateDiffMarkdown(oldState, panel.state);
      return diffMarkdown;
    } catch (error) {
      // If the error is a circular reference error, return a simplified error message
      if (error instanceof Error && error.message.includes('Converting circular structure to JSON')) {
        return JSON.stringify({
          error: 'Failed to update panel',
          details: 'The panel update was successful but encountered a display error. The changes have been applied.',
        });
      }
      return JSON.stringify({
        error: 'Failed to update panel',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  },
  {
    name: 'updateDashboardPanel',
    description:
      'Updates a dashboard panel with new configuration. Get the configuration via dashboard_panels tool first. Automatically navigate the user to view the dashboard before making any changes.',
    schema: updateDashboardPanelSchema,
  }
);
