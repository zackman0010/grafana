import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { SceneDataTransformer, SceneQueryRunner, VizPanel } from '@grafana/scenes';

import { DashboardScene } from '../../../dashboard-scene/scene/DashboardScene';

const panelConfigSchema = z.object({
  title: z.string().optional().describe('The title of the panel'),
  description: z.string().optional().describe('The description of the panel'),
  pluginId: z.string().describe('The ID of the panel plugin to use'),
  options: z.record(z.unknown()).optional().describe('The panel options configuration'),
  fieldConfig: z.record(z.unknown()).optional().describe('The field configuration for the panel'),
  targets: z
    .array(z.record(z.unknown()))
    .describe('The target objects to use for a query to run. Each target is one query to run.'),
  transformations: z.array(z.unknown()).optional().describe('The transformations to use for the panel'),
  datasource_uid: z.string().optional().describe('The datasource uid to use for the panel'),
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

const addDashboardPanelSchema = panelConfigSchema;

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
      fieldConfig: config.fieldConfig as any,
      $data:
        config.targets.length === 0
          ? undefined
          : new SceneDataTransformer({
              $data: new SceneQueryRunner({
                datasource: config.datasource_uid ?? config.targets[0].datasource ?? undefined,
                queries: config.targets as any,
                maxDataPointsFromWidth: true,
              }),
              transformations: (config.transformations as any) ?? [],
            }),
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
    const panelConfig = addDashboardPanelSchema.parse(input);

    const result = await addSinglePanel(panelConfig);

    return result;
  },
  {
    name: 'add_dashboard_panel',
    description: `Adds a new panel to the current dashboard. A panel requires a pluginId and options configuration. Never call this tool without a pluginId and options configuration.
  
      The pluginId is the ID of the panel plugin to use. It is a string that uniquely identifies the panel plugin.
      The options are the configuration options for the panel. They are a record of key-value pairs.

      The fieldConfig is the field configuration for the panel. It is a record of key-value pairs. An EXAMPLE of a fieldConfig is:
      {
        "defaults": {
          "custom": {
            "drawStyle": "line",
            "lineInterpolation": "linear",
            "barAlignment": 0,
            "barWidthFactor": 0.6,
            "lineWidth": 1,
            "fillOpacity": 0,
            "gradientMode": "none",
            "spanNulls": false,
            "insertNulls": false,
            "showPoints": "auto",
            "pointSize": 5,
            "stacking": {
              "mode": "none",
              "group": "A"
            },
            "axisPlacement": "auto",
            "axisLabel": "",
            "axisColorMode": "text",
            "axisBorderShow": false,
            "scaleDistribution": {
              "type": "linear"
            },
            "axisCenteredZero": false,
            "hideFrom": {
              "tooltip": false,
              "viz": false,
              "legend": false
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "color": {
            "mode": "palette-classic"
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "value": null,
                "color": "green"
              },
              {
                "value": 80,
                "color": "red"
              }
            ]
          }
        },
        "overrides": []
      }

      The targets are the targets to use for a query to run. Each target is one query to run. An EXAMPLE of a target is:
      {
        "datasource": {
          "uid": "grafana"
        },
        "expr": "sum(my_metric) by (my_label)",
        "instant": true,
        "interval": "5m",
        "refId": "A"
      }

      The datasource_uid is the uid of the datasource to use for the panel. It is a string that uniquely identifies the datasource.

      The transformations are the transformations to use for the panel. They are an array of objects. A list of EXAMPLES of a transformation is:
      {
        id: 'seriesToRows',
        options: {},
      },
      {
        id: 'sortBy',
        options: {
          fields: {},
          sort: [
            {
              field: 'Value',
              desc: true,
            },
          ],
        },
      },
      {
        id: 'extractFields',
        options: {
          delimiter: ',',
          source: 'Metric',
          replace: false,
          keepTime: false,
          format: 'kvp',
        },
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Time: true,
            Metric: true,
          },
          indexByName: {
            Time: 0,
            Value: -1,
          },
          renameByName: {},
          includeByName: {},
        },
      }

      The title is the title of the panel. It is a string that will be displayed at the top of the panel.
      The description is the description of the panel. It is a string that will be displayed below the title.

      The gridPos is the position of the panel on the dashboard. It is an object with the following properties:
      - h: the height of the panel in grid units
      - w: the width of the panel in grid units
      - x: the x position of the panel in grid units
      - y: the y position of the panel in grid units

      Only call this tool when you have a panel to add.
      `,
    schema: addDashboardPanelSchema,
  }
);
