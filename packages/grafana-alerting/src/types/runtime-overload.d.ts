import '@grafana/runtime';

import type { AlertingComponents } from '@grafana/alerting';

declare module '@grafana/runtime' {
  export function usePluginComponent(id: AlertingComponents.AlertmanagerProvider): 'test1';
  export function usePluginComponent(id: AlertingComponents.ListContactPoints): 'test2';
}
