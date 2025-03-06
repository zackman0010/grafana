import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { SceneDataTransformer, sceneGraph, SceneQueryRunner, VizPanelState } from '@grafana/scenes';

import { DashboardScene } from '../../../dashboard-scene/scene/DashboardScene';
import { findOriginalVizPanelByKey } from '../../../dashboard-scene/utils/utils';

const panelUpdateItemSchema = z.object({
  panelId: z.string().describe('The ID of the panel to update'),
  title: z.string().optional().describe('The title of the panel'),
  description: z.string().optional().describe('The description of the panel'),
  pluginId: z.string().optional().describe('The ID of the panel plugin to use'),
  options: z.record(z.unknown()).optional().describe('The panel options configuration'),
  fieldConfig: z.record(z.unknown()).optional().describe('The field configuration for the panel'),
  targets: z
    .array(z.record(z.unknown()))
    .optional()
    .describe('The target objects to use for a query to run. Each target is one query to run.'),
  transformations: z.array(z.unknown()).optional().describe('The transformations to use for the panel'),
  datasource_uid: z.string().optional().describe('The datasource uid to use for the panel'),
});

const panelUpdateSchema = z.array(panelUpdateItemSchema).describe('Array of panel updates to apply');

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

async function updateSinglePanel(
  panelId: string,
  title?: string,
  description?: string,
  pluginId?: string,
  options?: Record<string, unknown>,
  fieldConfig?: Record<string, unknown>,
  targets?: Array<Record<string, unknown>>,
  transformations?: unknown[],
  datasource_uid?: string
): Promise<string> {
  const panel = findOriginalVizPanelByKey(window.__grafanaSceneContext, panelId);
  if (!panel) {
    return JSON.stringify({
      error: `Panel with ID ${panelId} not found`,
      details: 'The panel you are trying to update does not exist in the current dashboard.',
    });
  }

  try {
    const oldState = { ...panel.state };

    if (title) {
      panel.setState({
        title: title,
      });
    }

    if (description) {
      panel.setState({
        description: description,
      });
    }

    if (pluginId) {
      panel.setState({
        pluginId: pluginId,
      });
    }

    if (options) {
      panel.setState({
        options: options,
      });
    }

    if (fieldConfig) {
      panel.setState({
        fieldConfig: fieldConfig as any,
      });
    }

    if (targets?.length && targets.length > 0) {
      const data = new SceneDataTransformer({
        $data: new SceneQueryRunner({
          datasource: datasource_uid ?? targets?.[0].datasource ?? undefined,
          queries: targets as any,
          maxDataPointsFromWidth: true,
        }),
        transformations: transformations as any,
      });
      panel.setState({
        $data: data,
      });
    }

    if (transformations?.length && transformations.length > 0) {
      const data = new SceneDataTransformer({
        $data: new SceneQueryRunner({
          datasource: datasource_uid ?? targets?.[0].datasource ?? undefined,
          queries: targets as any,
          maxDataPointsFromWidth: true,
        }),
        transformations: transformations as any,
      });
      panel.setState({
        $data: data,
      });
    }
    if (datasource_uid) {
      const data = new SceneDataTransformer({
        $data: new SceneQueryRunner({
          datasource: { uid: datasource_uid },
          queries: targets as any,
          maxDataPointsFromWidth: true,
        }),
        transformations: transformations as any,
      });
      panel.setState({
        $data: data,
      });
    }

    const dashboard = window.__grafanaSceneContext;
    dashboard.forceRender();
    sceneGraph.getTimeRange(dashboard).onRefresh();

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

    return JSON.stringify({ diffMarkdown: generateDiffMarkdown(oldState, panel.state) });
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
}

async function updatePanels(panelUpdates: Array<z.infer<typeof panelUpdateItemSchema>>): Promise<Record<string, any>> {
  const results: Record<string, any> = {};

  for (const update of panelUpdates) {
    const { panelId, title, description, pluginId, options, fieldConfig, targets, transformations, datasource_uid } =
      update;

    const result = await updateSinglePanel(
      panelId,
      title,
      description,
      pluginId,
      options,
      fieldConfig,
      targets,
      transformations,
      datasource_uid
    );

    results[panelId] = JSON.parse(result);
  }

  return results;
}

export const updateCurrentDashboardPanelTool = tool(
  async (input): Promise<string> => {
    if (!(window.__grafanaSceneContext instanceof DashboardScene)) {
      return JSON.stringify({
        error: 'No dashboard scene context found',
        details: 'The dashboard context is not available. This usually means the dashboard is not loaded.',
      });
    }
    const dashboard = window.__grafanaSceneContext;
    dashboard.onEnterEditMode();

    const parsedInput = panelUpdateSchema.parse(input);

    // Multiple panel updates
    const results = await updatePanels(parsedInput);
    return JSON.stringify({
      success: true,
      results,
    });
  },
  {
    name: 'update_current_dashboard_panels',
    description: `Updates an array of dashboard panels with new configuration. This tool expects an array of panel update objects.

Before using this tool:
1. First retrieve existing panel configurations using the read_dashboard_panels tool
2. For new dashboards or unfamiliar panel types, research panel schemas using grafana_com_docs_search

This tool will automatically put the dashboard in edit mode. Each panel update in the array should include a panelId and any properties you wish to modify (title, description, options, etc.).

Best practices:
- Provide clear, descriptive panel titles and helpful descriptions
- Keep panel configurations focused on visualizing specific metrics or data points
- Ensure datasource references are valid
- Test complex visualizations incrementally

Example usage: Update multiple panels in a single operation, such as changing titles, visualization options, or data sources across several panels.`,
    schema: panelUpdateSchema,
  }
);
