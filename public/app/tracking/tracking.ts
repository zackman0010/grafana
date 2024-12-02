import { reportInteraction } from '@grafana/runtime';
import { Codeowners, Codeowner } from './owners';

// todo: add some description of types here
type EventType = 'featureUsage' | 'error' | 'performance' | 'experiment';
type Event = {
  description: string;
  productArea?: string;
  owner: Codeowner;
  type: EventType;
  properties: EventProperties;
};
type EventProperties = Grafana_navigation_item_clicked | Grafana_nav_item_pinned;

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

const allEvents: { [key: string]: Event } = {
  grafana_navigation_item_clicked: {
    description: 'User clicked on a navigation item in the menu',
    productArea: 'Navigation',
    owner: Codeowners.grafanaFrontendPlatformSquad,
    type: 'featureUsage',
    properties: { path: '', menuIsDocked: true, bookmarkToggleOn: true } as Grafana_navigation_item_clicked,
  },
  grafana_nav_item_pinned: {
    description: 'User pinned a navigation item',
    productArea: 'Navigation',
    owner: Codeowners.grafanaFrontendPlatformSquad,
    type: 'featureUsage',
    properties: { path: '' } as Grafana_nav_item_pinned,
  },
  grafana_nav_item_unpinned: {
    description: 'User unpinned a navigation item',
    productArea: 'Navigation',
    owner: Codeowners.grafanaFrontendPlatformSquad,
    type: 'featureUsage',
    properties: { path: '' } as Grafana_nav_item_pinned,
  },
};

export const generateTrackUtil = (name: string) => {
  const event = allEvents[name];
  if (!event) {
    throw new Error(`Event ${name} not found`);
  }
  return (properties: typeof event.properties) => {
    reportInteraction(name, properties);
  };
};
