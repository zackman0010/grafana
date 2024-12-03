import { ReactNode } from 'react';

import { PluginExtensionExposedComponentConfig } from '@grafana/data';

import { alertRuleApi } from '../unified/api/alertRuleApi';
import { GRAFANA_RULER_CONFIG } from '../unified/api/featureDiscoveryApi';
import { FetchRulerRulesFilter } from '../unified/api/ruler';
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
  {
    id: 'grafana/listAlertRuleDefinitions/v0',
    title: 'This components will use renderProps to return all alert rule definitions for the built-in Grafana ruler',
    component: ListAlertRuleDefinitionsForNamespaceAndGroup,
  },
] as const satisfies ReadonlyArray<PluginExtensionExposedComponentConfig<any>>;

type ListContactPointsComponentProps = {
  children: (result: ReturnType<typeof useContactPointsWithStatus>) => ReactNode;
};

/** List Contact Points */
function ListContactPointsComponent({ children }: ListContactPointsComponentProps) {
  const result = useContactPointsWithStatus({
    alertmanager: GRAFANA_RULES_SOURCE_NAME,
    fetchStatuses: true,
    fetchPolicies: false,
  });
  return children(result);
}

// @TODO figure out the typings here, ideally the consumer wouldn't have to use type narrowing / union discrimination
type ListAlertRuleDefinitionsForNamespaceAndGroupProps = {
  folderUID?: string; // Grafana folder UID
  group?: string;
  filter?: FetchRulerRulesFilter;
  children: (
    result:
      | ReturnType<typeof alertRuleApi.endpoints.getRuleGroupForNamespace.useQuery>
      | ReturnType<typeof alertRuleApi.endpoints.rulerNamespace.useQuery>
      | ReturnType<typeof alertRuleApi.endpoints.rulerRules.useQuery>
  ) => ReactNode;
};

/** List alert rule definitions by namespace / group */
function ListAlertRuleDefinitionsForNamespaceAndGroup({
  children,
  folderUID,
  group,
  filter,
}: ListAlertRuleDefinitionsForNamespaceAndGroupProps) {
  const rulerConfig = GRAFANA_RULER_CONFIG;

  if (folderUID && group) {
    const result = alertRuleApi.endpoints.getRuleGroupForNamespace.useQuery({
      namespace: folderUID,
      group,
      rulerConfig,
    });
    return children(result);
  }

  if (folderUID) {
    const result = alertRuleApi.endpoints.rulerNamespace.useQuery({
      namespace: folderUID,
      rulerConfig,
    });
    return children(result);
  }

  const result = alertRuleApi.endpoints.rulerRules.useQuery({
    rulerConfig,
    filter,
  });
  return children(result);
}

export const getCoreAlertingConfigurations = () => ExposedAlertingComponents;
