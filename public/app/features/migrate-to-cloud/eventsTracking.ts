import { EventDefinition } from '@grafana/runtime/src/analytics/events/types';

export const eventsTracking: EventDefinition[] = [
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
    state: 'featureUsage',
    eventFunction: 'dismissReturnToPrevious',
  },
];
