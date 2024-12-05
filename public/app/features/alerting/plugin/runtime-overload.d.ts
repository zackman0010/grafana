import '@grafana/runtime';
import { type AlertmanagerProvider } from '../unified/state/AlertmanagerContext';

enum Components {
  AlertmanagerProvider = 'grafana/AlertmanagerProvider/v0',
  ListContactPoints = 'grafana/listContactPoints/v0',
  ContactPoint = 'grafana/ContactPoint/v0',
}

export type ListContactPointsComponentProps = {
  children: (result: ReturnType<typeof useContactPointsWithStatus>) => ReactNode;
};

declare module '@grafana/runtime' {
  export function usePluginComponent(id: Components.AlertmanagerProvider): typeof AlertmanagerProvider;
  export function usePluginComponent(id: Components.ListContactPoints): ListContactPointsComponentProps;
}
