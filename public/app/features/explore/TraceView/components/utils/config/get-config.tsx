import _get from 'lodash/get';

import defaultConfig from '../../constants/default-config';

/**
 * Merge the embedded config from the query service (if present) with the
 * default config from `../../constants/default-config`.
 */
export default function getConfig() {
  return defaultConfig;
}

export function getConfigValue(path: string) {
  return _get(getConfig(), path);
}
