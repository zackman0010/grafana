import {
  // EventProperty,
  reportTrackingEvent,
} from '@grafana/runtime';

const OWNER = 'Grafana Frontend Squad';
const REPO = 'grafana';
const PRODUCT = 'return_to_previous';

type CreateReturnToPreviousProps = {
  page: string;
  previousPage?: string;
};
type DismissReturnToPreviousProps = {
  action: string;
  page: string;
};

export const createReturnToPrevious = (props: CreateReturnToPreviousProps) => {
  reportTrackingEvent({
    owner: OWNER,
    eventName: `${REPO}_${PRODUCT}_button_created`,
    description: 'User clicked on a return to previous button',
    properties: props,
    stage: 'businessy',
  });
};

export const dismissReturnToPrevious = (props: DismissReturnToPreviousProps) => {
  reportTrackingEvent({
    owner: OWNER,
    eventName: `${REPO}_${PRODUCT}_button_dismissed`,
    description: 'User clicked on a return to previous button',
    properties: props,
    stage: 'businessy',
  });
};
