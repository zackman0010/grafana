import { sceneGraph } from '@grafana/scenes';
import { VariableModel } from '@grafana/schema';
import { DashboardScene } from 'app/features/dashboard-scene/scene/DashboardScene';
import { sceneVariablesSetToVariables } from 'app/features/dashboard-scene/serialization/sceneVariablesSetToVariables';

import { AppContext, AppIdentifiers } from './app';
import { PageContext } from './page';

export interface VariablesContext {
  variables: VariableModel[];
}

const unknown: VariablesContext = {
  variables: [],
} as const;

export function getVariablesContext(_pageContext: PageContext, { id }: AppContext): VariablesContext {
  switch (id) {
    case AppIdentifiers.Dashboard: {
      if (!(window.__grafanaSceneContext instanceof DashboardScene)) {
        return unknown;
      }

      return {
        variables: sceneVariablesSetToVariables(sceneGraph.getVariables(window.__grafanaSceneContext)) ?? [],
      };
    }

    default:
      return unknown;
  }
}
