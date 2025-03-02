import { DashboardScene } from 'app/features/dashboard-scene/scene/DashboardScene';
import { vizPanelToPanel } from 'app/features/dashboard-scene/serialization/transformSceneToSaveModel';

import { AppContext, AppIdentifiers } from './app';
import { PageContext } from './page';

export interface PanelsContext {
  panels: Array<ReturnType<typeof vizPanelToPanel>>;
}

const unknown: PanelsContext = {
  panels: [],
} as const;

export function getPanelsContext(_pageContext: PageContext, { id }: AppContext): PanelsContext {
  switch (id) {
    case AppIdentifiers.Dashboard: {
      if (!(window.__grafanaSceneContext instanceof DashboardScene)) {
        return unknown;
      }

      return {
        panels: window.__grafanaSceneContext.state.body.getVizPanels().map((vizPanel) => vizPanelToPanel(vizPanel)),
      };
    }

    default:
      return unknown;
  }
}
