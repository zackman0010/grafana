import { EventDefinition } from '@grafana/runtime/src/analytics/events/types';

export const eventsTracking: EventDefinition[] = [
  {
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
