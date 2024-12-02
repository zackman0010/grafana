import { ReactNode } from 'react';

import { PluginExtensionExposedComponentConfig } from '@grafana/data';

import { ContactPoint } from '../unified/components/contact-points/ContactPoint';
import { useContactPointsWithStatus } from '../unified/components/contact-points/useContactPoints';
import { AlertmanagerProvider } from '../unified/state/AlertmanagerContext';
import { GRAFANA_RULES_SOURCE_NAME } from '../unified/utils/datasource';

const ExposedAlertingComponents = [
  {
    id: 'grafana/listContactPoints/v0',
    title: 'List Contact Points',
    description:
      'This components will use renderProps to return all contact points for the built-in Grafana Alertmanager',
    component: ListContactPointsComponent,
  },
  {
    id: 'grafana/ContactPoint/v0',
    title: 'Visual representation of a single Contact Point',
    component: ContactPoint,
  },
  {
    id: 'grafana/AlertmanagerProvider/v0',
    title: 'Use this component to wrap your code that wants to use the AlertmanagerContext',
    component: AlertmanagerProvider,
  },
] as const satisfies ReadonlyArray<PluginExtensionExposedComponentConfig<any>>;

type ListContactPointsComponentProps = {
  children: (result: ReturnType<typeof useContactPointsWithStatus>) => ReactNode;
};

function ListContactPointsComponent({ children }: ListContactPointsComponentProps) {
  const result = useContactPointsWithStatus({
    alertmanager: GRAFANA_RULES_SOURCE_NAME,
    fetchStatuses: true,
    fetchPolicies: false,
  });
  return children(result);
}

export const getCoreAlertingConfigurations = () => ExposedAlertingComponents;
