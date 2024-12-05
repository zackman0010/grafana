import { Codeowners } from '../../../tracking/owners';
import { Event } from '../../../tracking/tracking';

type Grafana_navigation_item_clicked = {
  //the target URL the user clicked on
  path: string;
  // true if the menu is docked, false otherwise
  menuIsDocked: boolean;
  // true is the user clicked on a bookmarked item
  itemIsBookmarked?: boolean;
  // true if the bookmark feature toggle is on
  bookmarkToggleOn: boolean;
};

type Grafana_nav_item_pinned = {
  // the target URL the user clicked on
  path: string;
};

export const navigationEvents: { [key: string]: Event } = {
  grafana_navigation_item_clicked: {
    description: 'User clicked on a navigation item in the menu',
    productArea: 'Navigation',
    owner: Codeowners.grafanaFrontendPlatformSquad,
    type: 'featureUsage',
    exampleProperties: { path: '/home', menuIsDocked: true, bookmarkToggleOn: true } as Grafana_navigation_item_clicked,
  },
  grafana_nav_item_pinned: {
    description: 'User pinned a navigation item',
    productArea: 'Navigation',
    owner: Codeowners.grafanaFrontendPlatformSquad,
    type: 'featureUsage',
    exampleProperties: { path: '/dashboards' } as Grafana_nav_item_pinned,
  },
  grafana_nav_item_unpinned: {
    description: 'User unpinned a navigation item',
    productArea: 'Navigation',
    owner: Codeowners.grafanaFrontendPlatformSquad,
    type: 'featureUsage',
    exampleProperties: { path: '/explore' } as Grafana_nav_item_pinned,
  },
};
