import { config } from '../../config';
import { getEchoSrv, EchoEventType } from '../../services/EchoSrv';

import { EventProps } from './types';

export const reportTrackingEvent = (props: EventProps) => {
  // get static reporting context and append it to properties
  if (props.properties && config.reportingStaticContext && config.reportingStaticContext instanceof Object) {
    props.properties = { ...props.properties, ...config.reportingStaticContext };
  }
  console.log('reportTrackingEvent', props);
  getEchoSrv().addEvent({
    type: EchoEventType.Interaction,
    payload: {
      owner: props.owner,
      eventName: props.eventName,
      description: props.description,
      properties: props.properties,
      stage: props.stage,
    },
  });
};
