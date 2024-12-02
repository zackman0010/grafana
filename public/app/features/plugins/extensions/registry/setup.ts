import { getCoreAlertingConfigurations } from 'app/features/alerting/plugin/plugin';

import { getCoreExtensionConfigurations } from '../getCoreExtensionConfigurations';

import { AddedComponentsRegistry } from './AddedComponentsRegistry';
import { AddedLinksRegistry } from './AddedLinksRegistry';
import { ExposedComponentsRegistry } from './ExposedComponentsRegistry';
import { PluginExtensionRegistries } from './types';

export const GRAFANA_CORE_PLUGIN_ID = 'grafana';

export function setupPluginExtensionRegistries(): PluginExtensionRegistries {
  const pluginExtensionsRegistries = {
    addedComponentsRegistry: new AddedComponentsRegistry(),
    exposedComponentsRegistry: new ExposedComponentsRegistry(),
    addedLinksRegistry: new AddedLinksRegistry(),
  };

  pluginExtensionsRegistries.addedLinksRegistry.register({
    pluginId: GRAFANA_CORE_PLUGIN_ID,
    configs: getCoreExtensionConfigurations(),
  });

  pluginExtensionsRegistries.exposedComponentsRegistry.register({
    pluginId: GRAFANA_CORE_PLUGIN_ID,
    configs: getCoreAlertingConfigurations(),
  });

  return pluginExtensionsRegistries;
}

export const isCorePluginIdentifier = (id: string): boolean => [GRAFANA_CORE_PLUGIN_ID].includes(id);

export const hasCorePluginIdentifier = (id: string): boolean =>
  [GRAFANA_CORE_PLUGIN_ID].findIndex((coreId) => id.startsWith(coreId)) > -1;
