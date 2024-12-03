export type EventProperty = {
  [key: string]: string | number | boolean | undefined;
};
export type EventStage = 'timeboxed' | 'businessy' | 'experimental';

export type EventProps = {
  owner: string;
  eventName: string;
  description: string;
  properties: EventProperty;
  stage: EventStage;
};
