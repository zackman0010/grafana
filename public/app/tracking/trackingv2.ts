import { reportInteraction } from '@grafana/runtime';

type GrafanaEvent = NavigationEvent | MigrateToCloudEvent;

// owner: grafanaFrontendPlatformSquad
type NavigationEvent =
  | {
      name: 'grafana_navigation_item_clicked';
      properties: {
        //the target URL the user clicked on
        path: string;
        // true if the menu is docked, false otherwise
        menuIsDocked: boolean;
        // true is the user clicked on a bookmarked item
        itemIsBookmarked?: boolean;
        // true if the bookmark feature toggle is on
        bookmarkToggleOn: boolean;
      };
    }
  | {
      name: 'grafana_nav_item_pinned' | 'grafana_nav_item_unpinned';
      properties: {
        // the target URL the user clicked on
        path: string;
      };
    };

// owner: grafanaFrontendPlatformSquad
type MigrateToCloudEvent =
  | 'grafana_e2c_generate_token_clicked'
  | 'grafana_e2c_delete_token_clicked'
  | 'grafana_e2c_generated_token_modal_dismissed';

// track event only if the name is defined and if the type of the props match
export const trackEvent = (event: GrafanaEvent) => {
  if (typeof event === 'string') {
    reportInteraction(event);
  } else {
    reportInteraction(event.name, event.properties);
  }
};
