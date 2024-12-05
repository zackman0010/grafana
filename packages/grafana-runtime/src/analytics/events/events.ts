import { reportInteraction } from '../utils';

import { EventTrackingProps } from './types';

export const reportTrackingEvent = (props: EventTrackingProps) => {
  const repo = props.repo || 'grafana';
  reportInteraction(`${repo}_${props.product}_${props.eventName}`, props.properties);
};
