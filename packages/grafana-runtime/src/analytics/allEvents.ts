import { EventDefinition } from '@grafana/runtime';

import { megaMenuTracking } from '../../../../public/app/core/components/AppChrome/MegaMenu/eventsTracking';
import { ReturnToPreviousTracking } from '../../../../public/app/core/components/AppChrome/ReturnToPrevious/eventsTracking';
import { E2CEvents } from '../../../../public/app/features/migrate-to-cloud/eventsTracking';

export const allEvents: EventDefinition[] = [...megaMenuTracking, ...ReturnToPreviousTracking, ...E2CEvents];
