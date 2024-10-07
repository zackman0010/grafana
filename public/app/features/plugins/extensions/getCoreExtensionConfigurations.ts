import { PluginExtensionAddedLinkConfig } from '@grafana/data';
import { getExploreExtensionConfigs } from 'app/features/explore/extensions/getExploreExtensionConfigs';

import { getAppExtensions } from '../../tmp/appExtensions';

export function getCoreExtensionConfigurations(): PluginExtensionAddedLinkConfig[] {
  return [...getExploreExtensionConfigs(), ...getAppExtensions()];
}
