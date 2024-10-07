import { logsExtension } from './logs';
import { metricsExtension } from './metrics';
import { profilesExtension } from './profiles';
import { tracesExtension } from './traces';

export function getAppExtensions() {
  return [logsExtension(), metricsExtension(), tracesExtension(), profilesExtension()];
}
