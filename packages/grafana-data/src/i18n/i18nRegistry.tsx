import { Registry } from '../utils/Registry';

import { I18nRegistryItem } from './types';

class I18nRegistry extends Registry<I18nRegistryItem> {}

/**
 * A registry of resource bundles.
 * @internal
 */
export const i18nRegistry = new I18nRegistry();
