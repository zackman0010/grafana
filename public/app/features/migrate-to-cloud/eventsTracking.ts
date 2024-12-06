import { EventDefinition } from '@grafana/runtime/src/analytics/events/types';

export const eventsTracking: EventDefinition[] = [
  {
    owner: 'Grafana Frontend Squad',
    product: 'e2c',
    eventName: 'generate_token_clicked',
    description: 'User clicked on the geenrate token button',
    state: 'featureUsage',
    eventFunction: 'trackGenerateTokenClicked',
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
