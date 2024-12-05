export type NavigationEvent =
  | {
      // User clicked on a navigation item in the menu
      name: 'grafana_navigation_item_clicked';
      properties: {
        // the target URL the user clicked on
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
      // User pinned or unpinned a navigation item
      name: 'grafana_nav_item_pinned' | 'grafana_nav_item_unpinned';
      properties: {
        // the target URL the user pinned or unpinned
        path: string;
      };
    };
