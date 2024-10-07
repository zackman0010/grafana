import { PluginExtensionPoints } from '@grafana/data';
import { locationService } from '@grafana/runtime';

import { createAddedLinkConfig } from '../plugins/extensions/utils';

export function exampleExtension() {
  return createAddedLinkConfig({
    title: 'Test',
    description: 'Test',
    targets: [PluginExtensionPoints.QueryToAppPlugin],
    onClick: () => {
      locationService.push('/a/grafana-lokiexplore-app/explore');
    },
  });
}
