import {
  // EventProperty,
  reportTrackingEvent,
} from '@grafana/runtime';

const OWNER = 'Grafana Frontend Squad';
const REPO = 'grafana';
const PRODUCT = 'navigation';

type itemClickedProps = {
  path?: string;
  menuIsDocked: boolean;
  itemIsBookmarked: boolean;
  bookmarkToggleOn: boolean;
};

type menuOpenProps = {
  state: boolean;
  singleTopNav: boolean;
};

type menuDockedProps = {
  state: boolean;
};

export const itemClicked = (props: itemClickedProps) => {
  reportTrackingEvent({
    owner: OWNER,
    eventName: `${REPO}_${PRODUCT}_item_clicked`,
    description: 'User clicked on a navigation item',
    properties: props,
    stage: 'timeboxed',
  });
};

export const menuOpen = (props: menuOpenProps) => {
  reportTrackingEvent({
    owner: OWNER,
    eventName: `${REPO}_${PRODUCT}_menu_opened`,
    description: 'User opened the navigation menu',
    properties: props,
    stage: 'businessy',
  });
};

export const menuDocked = (props: menuDockedProps) => {
  reportTrackingEvent({
    owner: OWNER,
    eventName: `${REPO}_${PRODUCT}_menu_docked`,
    description: 'User docked the navigation menu',
    properties: props,
    stage: 'businessy',
  });
};
