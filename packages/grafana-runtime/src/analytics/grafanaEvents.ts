import { NavigationEvent } from '../../../../public/app/core/components/AppChrome/tracking';
import { MigrateToCloudEvent } from '../../../../public/app/features/migrate-to-cloud/tracking';

export type Properties = Record<string, string | number | boolean>;

export interface Event {
  name: string;
  properties: Properties;
}

/**
 * Describes the payload of a user event.
 * Must be either a constant string (= the event name) or an Event with a name and properties.
 *
 * When adding a new event for your feature, you should first define its type and add it here,
 * you will then be able to call trackEvent
 *   - trackEvent('button_clicked'); // for simple events
 *   - trackEvent({ name: 'share_clicked', properties: { mode: 'link'|'snapshot'|'report' } }); // for events enriched with properties
 *
 */
export type GrafanaEvent = NavigationEvent | MigrateToCloudEvent;
