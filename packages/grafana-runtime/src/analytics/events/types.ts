export type EventPropertyDefinition = {
  [name: string]: {
    description: string;
    type: 'string' | 'number' | 'boolean' | 'undefined';
    required?: boolean;
  };
};

export type EventStage =
  | 'featureUsage' // gathering general usage data
  | 'error' // error tracking
  | 'performance' // for tracking performance
  | 'experiment' // time boxed event used to make a go / no go decision on a feature - should be removed after the experiment is complete
  | 'funnel'; // start or end event of a funnel, used for conversion rate tracking

export type EventProperty = {
  [name: string]: string | number | boolean;
};

export type EventDefinition = {
  owner: string;
  product: string;
  eventName: string;
  description: string;
  properties?: EventPropertyDefinition;
  state: EventStage;
  eventFunction: string;
};

export type EventTrackingProps = {
  repo?: string;
  product: string;
  eventName: string;
  properties: EventProperty;
};

export type EventFunctionInput = EventTrackingProps & {
  eventFunction: string;
  properties: EventPropertyDefinition;
};
