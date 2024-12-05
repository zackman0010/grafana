export type EventPropertyDefinition = {
  [name: string]: {
    description: string;
    type: 'string' | 'number' | 'boolean' | 'undefined';
    required?: boolean;
  };
};

export type EventStage = 'timeboxed' | 'businessy' | 'experimental';

export type EventProperty = {
  [name: string]: string | number | boolean;
};

export type EventDefinition = {
  owner: string;
  product: string;
  eventName: string;
  description: string;
  properties: EventPropertyDefinition;
  stage: EventStage;
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
