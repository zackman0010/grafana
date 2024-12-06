import { EventDefinition } from '@grafana/runtime/src/analytics/events/types';
import { megaMenuTracking } from '../app/core/components/AppChrome/MegaMenu/eventsTracking';
import { ReturnToPreviousTracking } from '../app/core/components/AppChrome/ReturnToPrevious/eventsTracking';
import { E2CEvents } from '../app/features/migrate-to-cloud/eventsTracking';

export const allEvents: EventDefinition[] = [...megaMenuTracking, ...ReturnToPreviousTracking, ...E2CEvents];
