const eventList = [
  {
    repoName: 'grafana',
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
    stage: 'timeboxed',
    eventFunction: 'megaMenuItemClicked',
  },
  {
    repoName: 'grafana',
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
    stage: 'businessy',
    eventFunction: 'megaMenuOpened',
  },
  {
    repoName: 'grafana',
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
    stage: 'businessy',
    eventFunction: 'megaMenuDocked',
  },
  {
    repoName: 'grafana',
    owner: 'Grafana Frontend Squad',
    product: 'return_to_previous',
    eventName: 'button_created',
    description: 'User created a return to previous button',
    properties: {
      page: {
        description: 'The page the user was on when the button was created',
        type: 'string',
        required: true,
      },
      previousPage: {
        description: 'The previous page the user was on before the current page',
        type: 'string',
        required: false,
      },
    },
    stage: 'timeboxed',
    eventFunction: 'createReturnToPrevious',
  },
  {
    repoName: 'grafana',
    owner: 'Grafana Frontend Squad',
    product: 'return_to_previous',
    eventName: 'button_dismissed',
    description: 'User dismissed a return to previous button',
    properties: {
      action: {
        description: 'The action the user took to dismiss the button',
        type: 'string',
        required: true,
      },
      page: {
        description: 'The page the user was on when the button was dismissed',
        type: 'string',
        required: true,
      },
    },
    stage: 'timeboxed',
    eventFunction: 'dismissReturnToPrevious',
  },
];
