import { ReactNode } from 'react';

import { AppPlugin } from '@grafana/data';

import { useContactPointsWithStatus } from '../unified/components/contact-points/useContactPoints';
import { GRAFANA_RULES_SOURCE_NAME } from '../unified/utils/datasource';

export const ALERTING_PLUGIN_PREFIX = 'com.grafana.alerting';

export function initAlertingPlugin() {
  new AppPlugin().exposeComponent({
    id: `${ALERTING_PLUGIN_PREFIX}/listContactPoints/v0`,
    title: 'List Contact Points',
    description:
      'This components will use renderProps to return all contact points for the built-in Grafana Alertmanager',
    component: ListContactPointsV1Component,
  });
}

type ListContactPointsV1ComponentProps = {
  children: (result: ReturnType<typeof useContactPointsWithStatus>) => ReactNode;
};

function ListContactPointsV1Component({ children }: ListContactPointsV1ComponentProps) {
  const result = useContactPointsWithStatus({
    alertmanager: GRAFANA_RULES_SOURCE_NAME,
    fetchStatuses: true,
    fetchPolicies: false,
  });
  return children(result);
}
