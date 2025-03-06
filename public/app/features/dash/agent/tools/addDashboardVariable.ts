import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { sceneGraph } from '@grafana/scenes';
import { DashboardScene } from 'app/features/dashboard-scene/scene/DashboardScene';
import { createSceneVariableFromVariableModel } from 'app/features/dashboard-scene/utils/variables';

const variableConfigSchema = z.object({
  allowCustomValue: z.boolean().optional().describe('Flag indicating if the variable can have a custom value'),
  current: z
    .array(
      z.object({
        selected: z.boolean().optional().describe('Flag indicating if the value is selected'),
        text: z.string().or(z.array(z.string())).optional().describe('The text or list of texts of the current value'),
        value: z
          .string()
          .or(z.array(z.string()))
          .optional()
          .describe('The value or list of values of the current value'),
      })
    )
    .optional()
    .describe('The current value of the current variable'),
  datasource: z
    .object({
      type: z.string().describe('The type of the datasource'),
      uid: z.string().describe('The uid of the datasource'),
    })
    .nullable()
    .describe('The datasource object to use for the variable'),
  description: z.string().optional().describe('The description of the variable'),
  hide: z.number().min(0).max(2).optional().describe(`Flag indicating if the variable should be:
- 0: not hidden
- 1: hide label
- 2: hide variable`),
  includeAll: z.boolean().optional().describe('Flag indicating if the variable should include the all option'),
  label: z.string().optional().describe('The label of the variable'),
  multi: z.boolean().optional().describe('Flag indicating if the variable can have multiple values'),
  name: z.string().describe('The name of the variable'),
  options: z
    .array(
      z.object({
        selected: z.boolean().optional().describe('Flag indicating if the value is selected'),
        text: z.string().or(z.array(z.string())).optional().describe('The text or list of texts of the current option'),
        value: z
          .string()
          .or(z.array(z.string()))
          .optional()
          .describe('The value or list of values of the current option'),
      })
    )
    .optional()
    .describe("The available options for the variable if it's variable with static values"),
  query: z.string().optional().describe('The query to use for the variable'),
  refresh: z.number().min(0).max(2).optional().describe(`Options to config when to refresh a variable
- 0: Never refresh the variable
- 1: Queries the data source every time the dashboard loads.
- 2: Queries the data source when the dashboard time range changes.`),
  regex: z
    .string()
    .optional()
    .describe(
      'if you want to extract part of a series name or metric node segment. Named capture groups can be used to separate the display text and value.'
    ),
  skipUrlSync: z
    .boolean()
    .optional()
    .describe('Whether the variable value should be managed by URL query params or not'),
  sort: z.number().min(0).max(8).optional().describe(`Sort variable options. Accepted values are:
- 0: No sorting
- 1: Alphabetical ASC
- 2: Alphabetical DESC
- 3: Numerical ASC
- 4: Numerical DESC
- 5: Alphabetical Case Insensitive ASC
- 6: Alphabetical Case Insensitive DESC
- 7: Natural ASC
- 8: Natural DESC`),
  type: z.enum(['query', 'datasource', 'custom']).optional().describe(`Dashboard variable type:
- query: Query-generated list of values such as metric names, server names, sensor IDs, data centers, and so on.
- datasource: Quickly change the data source for an entire dashboard.
- custom: Define the variable options manually using a comma-separated list.`),
});

const addDashboardVariableSchema = variableConfigSchema;

async function addSingleVariable(config: z.infer<typeof variableConfigSchema>): Promise<string> {
  if (!(window.__grafanaSceneContext instanceof DashboardScene)) {
    return JSON.stringify({
      error: 'No dashboard scene context found',
      details: 'The dashboard context is not available. This usually means the dashboard is not loaded.',
    });
  }

  try {
    const dashboard = window.__grafanaSceneContext;
    dashboard.onEnterEditMode();
    const variable = createSceneVariableFromVariableModel({
      allowCustomValue: config.allowCustomValue,
      current: config.current as any,
      datasource: config.datasource,
      description: config.description ?? null,
      hide: config.hide ?? 0,
      includeAll: config.includeAll ?? true,
      label: config.label,
      multi: config.multi ?? false,
      name: config.name,
      options: config.options as any,
      query: config.query,
      refresh: config.refresh,
      regex: config.regex,
      skipUrlSync: config.skipUrlSync ?? false,
      sort: config.sort,
      type: config.type ?? 'custom',
    } as any);
    dashboard.state.$variables!.setState({ variables: [...dashboard.state.$variables!.state.variables, variable] });
    dashboard.forceRender();
    sceneGraph.getTimeRange(dashboard).onRefresh();
    return JSON.stringify({
      success: true,
      variableName: variable.state.name,
      details: `Successfully added variable with name: ${config.name ?? 'Untitled'}`,
    });
  } catch (error) {
    return JSON.stringify({
      error: 'Failed to add variable',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export const addDashboardVariableTool = tool(
  async (input): Promise<string> => {
    const variableConfig = addDashboardVariableSchema.parse(input);

    return await addSingleVariable(variableConfig);
  },
  {
    name: 'add_dashboard_variable',
    description: `Adds a new variable to the current dashboard. Some examples of variables are:
{
  "current": {
      "selected": false,
      "text": "ops-cortex",
      "value": "ops-cortex"
  },
  "hide": 0,
  "includeAll": false,
  "label": "Metrics Datasource",
  "multi": false,
  "name": "metricsDatasource",
  "options": [],
  "query": "prometheus",
  "queryValue": "op",
  "refresh": 1,
  "regex": "",
  "skipUrlSync": false,
  "type": "datasource"
},
{
  "current": {
      "selected": false,
      "text": "Grafana Logging",
      "value": "Grafana Logging"
  },
  "hide": 0,
  "includeAll": false,
  "label": "Logs Datasource",
  "multi": false,
  "name": "logsDatasource",
  "options": [],
  "query": "loki",
  "queryValue": "",
  "refresh": 1,
  "regex": "",
  "skipUrlSync": false,
  "type": "datasource"
},
{
  "current": {
      "selected": false,
      "text": "amixr-prod",
      "value": "amixr-prod"
  },
  "datasource": {
      "type": "prometheus",
      "uid": "\${metricsDatasource}"
  },
  "definition": "label_values(kube_namespace_status_phase{namespace=~\\"amixr.*\\"}, namespace)",
  "hide": 0,
  "includeAll": false,
  "multi": false,
  "name": "namespace",
  "options": [],
  "query": {
      "query": "label_values(kube_namespace_status_phase{namespace=~\\"amixr.*\\"}, namespace)",
      "refId": "StandardVariableQuery"
  },
  "refresh": 2,
  "regex": "",
  "skipUrlSync": false,
  "sort": 0,
  "type": "query"
},
{
  "current": {
      "selected": false,
      "text": "prod-us-central-0",
      "value": "prod-us-central-0"
  },
  "datasource": {
      "type": "prometheus",
      "uid": "\${metricsDatasource}"
  },
  "definition": "label_values(kube_namespace_status_phase{namespace=~\\"amixr.*\\"}, cluster)",
  "hide": 0,
  "includeAll": false,
  "multi": false,
  "name": "cluster",
  "options": [],
  "query": {
      "query": "label_values(kube_namespace_status_phase{namespace=~\\"amixr.*\\"}, cluster)",
      "refId": "StandardVariableQuery"
  },
  "refresh": 2,
  "regex": "",
  "skipUrlSync": false,
  "sort": 0,
  "type": "query"
},
{
  "current": {
      "selected": true,
      "text": [
          "All"
      ],
      "value": [
          "$__all"
      ]
  },
  "datasource": {
      "type": "prometheus",
      "uid": "\${metricsDatasource}"
  },
  "definition": "label_values(flower_events_total{namespace=~\\"amixr.*\\"}, worker)",
  "hide": 0,
  "includeAll": true,
  "multi": true,
  "name": "queue",
  "options": [],
  "query": {
      "query": "label_values(flower_events_total{namespace=~\\"amixr.*\\"}, worker)",
      "refId": "StandardVariableQuery"
  },
  "refresh": 2,
  "regex": "celery@amixr-engine-celery-(.*)-.*-.*",
  "skipUrlSync": false,
  "sort": 0,
  "type": "query"
}

The properties include:
- allowCustomValue: Optional flag indicating if the variable can have a custom value
- current: Optional array of current values for the variable
- datasource: Optional datasource object to use for the variable
- description: Optional description of the variable
- hide: Optional flag indicating if the variable should be hidden. Possible values:
    - 0: Not hidden
    - 1: Hide label
    - 2: Hide variable
- includeAll: Optional flag indicating if the variable should include the all option
- label: The label of the variable
- multi: Optional flag indicating if the variable can have multiple values
- name: The name of the variable
- options: Optional array of available options for the variable if it's variable with static values
- query: Optional query to use for the variable
- refresh: Optional options to config when to refresh a variable. Possible values:
    - 0: Never refresh the variable
    - 1: Queries the data source every time the dashboard loads
    - 2: Queries the data source when the dashboard time range changes
- regex: Optional regex to extract part of a series name or metric node segment
- skipUrlSync: Optional flag indicating whether the variable value should be managed by URL query params
- sort: Optional sort variable options. Possible values:
    - 0: No sorting
    - 1: Alphabetical ASC
    - 2: Alphabetical DESC
    - 3: Numerical ASC
    - 4: Numerical DESC
    - 5: Alphabetical Case Insensitive ASC
    - 6: Alphabetical Case Insensitive DESC
    - 7: Natural ASC
    - 8: Natural DESC
- type: Optional dashboard variable type. Possible values:
    - query: Query-generated list of values such as metric names, server names, sensor IDs, data centers, and so on.
    - datasource: Quickly change the data source for an entire dashboard.
    - custom: Define the variable options manually using a comma-separated list.

Only call this tool when you have a variable to add.
      `,
    schema: addDashboardVariableSchema,
  }
);
