import { reportInteraction } from '@grafana/runtime';
import { Codeowner } from './owners';
import { navigationEvents } from 'app/core/components/AppChrome/tracking';
import { e2cEvents } from 'app/features/migrate-to-cloud/tracking';

// todo: add some description of types here
type EventType = 'featureUsage' | 'error' | 'performance' | 'experiment' | 'funnel';
export type Event = {
  description: string;
  productArea?: string;
  owner: Codeowner;
  type: EventType;
  exampleProperties?: Record<string, string | boolean | number>;
};

const allEvents: { [key: string]: Event } = {
  ...navigationEvents,
  ...e2cEvents,
};

export const generateTrackUtil = (name: string) => {
  const event = allEvents[name];
  if (!event) {
    throw new Error(`Event ${name} not found`);
  }
  if (!event.exampleProperties) {
    return () => reportInteraction(name);
  } else {
    return (properties?: typeof event.exampleProperties) => {
      reportInteraction(name, properties);
    };
  }
};
