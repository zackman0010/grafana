import { RegistryItem } from '../utils/Registry';

/**
 * A resource key is a string or an object.
 * @internal
 */
export type ResourceKey =
  | string
  | {
      [key: string]: string;
    };

/**
 * A function that loads a resource bundle.
 * @internal
 */
export type LocaleFileLoader = () => Promise<ResourceKey>;

/**
 * A resource bundle is a collection of translations for a specific language and namespace.
 * @internal
 */
export interface I18nRegistryItem extends RegistryItem {
  language: string;
  namespace: string;
  loader: LocaleFileLoader;
}
