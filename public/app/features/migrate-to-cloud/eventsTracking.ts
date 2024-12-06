import { EventDefinition } from '@grafana/runtime';

export const E2CEvents: EventDefinition[] = [
  {
    owner: 'Grafana Frontend Squad',
    product: 'e2c',
    eventName: 'delete_token_clicked',
    description: 'User clicked on the delete token button',
    state: 'featureUsage',
    eventFunction: 'trackDeleteTokenClicked',
  },
  {
    owner: 'Grafana Frontend Squad',
    product: 'e2c',
    eventName: 'delete_token_clicked',
    description: 'User clicked on the delete token button',
    state: 'featureUsage',
    eventFunction: 'trackDeleteTokenClicked',
    properties: {},
  },
];
