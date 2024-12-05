import { config } from '../config';
import { locationService } from '../services';
import { getEchoSrv, EchoEventType } from '../services/EchoSrv';
import { GrafanaEvent, Properties } from './grafanaEvents';

import {
  ExperimentViewEchoEvent,
  InteractionEchoEvent,
  MetaAnalyticsEvent,
  MetaAnalyticsEventPayload,
  PageviewEchoEvent,
} from './types';

/**
 * Helper function to report meta analytics to the {@link EchoSrv}.
 *
 * @public
 */
export const reportMetaAnalytics = (payload: MetaAnalyticsEventPayload) => {
  getEchoSrv().addEvent<MetaAnalyticsEvent>({
    type: EchoEventType.MetaAnalytics,
    payload,
  });
};

/**
 * Helper function to report pageview events to the {@link EchoSrv}.
 *
 * @public
 */
export const reportPageview = () => {
  const location = locationService.getLocation();
  const page = `${config.appSubUrl ?? ''}${location.pathname}${location.search}${location.hash}`;
  getEchoSrv().addEvent<PageviewEchoEvent>({
    type: EchoEventType.Pageview,
    payload: {
      page,
    },
  });
};

/**
 * Helper function to report interaction events to the {@link EchoSrv}.
 *
 * @public
 * @deprecated
 */
export const reportInteraction = (interactionName: string, properties?: Record<string, unknown>) => {
  // get static reporting context and append it to properties
  if (config.reportingStaticContext && config.reportingStaticContext instanceof Object) {
    properties = { ...properties, ...config.reportingStaticContext };
  }
  getEchoSrv().addEvent<InteractionEchoEvent>({
    type: EchoEventType.Interaction,
    payload: {
      interactionName,
      properties,
    },
  });
};

/**
 * Helper function to report events to the {@link EchoSrv}.
 * Track events only if the name is defined and if the type of the props match
 *
 * @public
 * @param event -- the event to track, either a simple string or an object with a name and properties
 */
export const trackEvent = (event: GrafanaEvent) => {
  let eventName: string;
  let properties: Properties = {};
  if (typeof event === 'string') {
    eventName = event;
  } else {
    eventName = event.name;
    properties = event.properties;
  }
  // get static reporting context and append it to properties
  if (config.reportingStaticContext && config.reportingStaticContext instanceof Object) {
    properties = { ...properties, ...config.reportingStaticContext };
  }
  getEchoSrv().addEvent<InteractionEchoEvent>({
    type: EchoEventType.Interaction,
    payload: {
      interactionName: eventName,
      properties,
    },
  });
};

/**
 * Helper function to report experimentview events to the {@link EchoSrv}.
 *
 * @public
 */
export const reportExperimentView = (id: string, group: string, variant: string) => {
  getEchoSrv().addEvent<ExperimentViewEchoEvent>({
    type: EchoEventType.ExperimentView,
    payload: {
      experimentId: id,
      experimentGroup: group,
      experimentVariant: variant,
    },
  });
};
