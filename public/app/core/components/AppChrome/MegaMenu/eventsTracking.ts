export const eventsTracking: Array<{
  owner: string;
  product: string;
  eventName: string;
  description: string;
  properties: {
    [key: string]: {
      description: string;
      type: string;
      required: boolean;
    };
  };
  state: string;
  eventFunction: string;
}> = [
  {
    owner: 'Grafana Frontend Squad',
    product: 'navigation',
    eventName: 'item_clicked',
    description: 'User clicked on a navigation item',
    properties: {
      path: {
        description: 'The path of the clicked item',
        type: 'string',
        required: false,
      },
      menuIsDocked: {
        description: 'The state of the navigation menu',
        type: 'boolean',
        required: true,
      },
      itemIsBookmarked: {
        description: 'Whether the clicked item is bookmarked',
        type: 'boolean',
        required: true,
      },
      bookmarkToggleOn: {
        description: 'Whether the bookmark toggle is on',
        type: 'boolean',
        required: true,
      },
    },
    state: 'featureUsage',
    eventFunction: 'megaMenuItemClicked',
  },
  {
    owner: 'Grafana Frontend Squad',
    product: 'navigation',
    eventName: 'menu_opened',
    description: 'User opened the navigation menu',
    properties: {
      state: {
        description: 'The state of the navigation menu',
        type: 'boolean',
        required: true,
      },
      singleTopNav: {
        description: 'Whether the navigation menu is in single top nav mode',
        type: 'boolean',
        required: true,
      },
    },
    state: 'featureUsage',
    eventFunction: 'megaMenuOpened',
  },
  {
    owner: 'Grafana Frontend Squad',
    product: 'navigation',
    eventName: 'menu_docked',
    description: 'User docked the navigation menu',
    properties: {
      state: {
        description: 'The state of the navigation menu',
        type: 'boolean',
        required: true,
      },
    },
    state: 'featureUsage',
    eventFunction: 'megaMenuDocked',
  },
];
