import memoize from 'micro-memoize';

import { BaseAlertmanagerArgs } from 'app/features/alerting/unified/types/hooks';
import { MatcherOperator, Route } from 'app/plugins/datasource/alertmanager/types';

import { alertmanagerApi } from '../../api/alertmanagerApi';
import {
  ComGithubGrafanaGrafanaPkgApisAlertingNotificationsV0Alpha1Route,
  ComGithubGrafanaGrafanaPkgApisAlertingNotificationsV0Alpha1RoutingTreeSpec,
  IoK8SApimachineryPkgApisMetaV1ObjectMeta,
  generatedRoutesApi,
} from '../../openapi/routesApi.gen';
import { K8sAnnotations, PROVENANCE_NONE } from '../../utils/k8s/constants';
import { getAnnotation, getK8sNamespace, shouldUseK8sApi } from '../../utils/k8s/utils';
const k8sRoutesToRoutesMemoized = memoize(k8sRoutesToRoutes, { maxSize: 1 });

const { useListNamespacedRoutingTreeQuery, useCreateNamespacedRoutingTreeMutation } = generatedRoutesApi;

const {
  useUpdateAlertmanagerConfigurationMutation,
  useLazyGetAlertmanagerConfigurationQuery,
  useGetAlertmanagerConfigurationQuery,
} = alertmanagerApi;

export const useNotificationPolicyRoute = ({ alertmanager }: BaseAlertmanagerArgs) => {
  const k8sApiSupported = shouldUseK8sApi(alertmanager);

  const k8sRouteQuery = useListNamespacedRoutingTreeQuery(
    { namespace: getK8sNamespace() },
    {
      skip: !k8sApiSupported,
      selectFromResult: (result) => {
        console.log(result.data);
        return {
          ...result,
          currentData: result.currentData
            ? k8sRoutesToRoutesMemoized(result.currentData.items, result.currentData.metadata)
            : undefined,
          data: result.data ? k8sRoutesToRoutes(result.data.items, result.data.metadata) : undefined,
        };
      },
    }
  );

  const amConfigQuery = useGetAlertmanagerConfigurationQuery(alertmanager, {
    skip: k8sApiSupported,
    selectFromResult: (result) => {
      return {
        ...result,
        currentData: result.currentData ? result.currentData.alertmanager_config.route : undefined,
        data: result.data ? result.data.alertmanager_config.route : undefined,
      };
    },
  });

  return k8sApiSupported ? k8sRouteQuery : amConfigQuery;
};

export function useUpdateNotificationPolicyRoute(selectedAlertmanager: string) {
  const [getAlertmanagerConfiguration] = useLazyGetAlertmanagerConfigurationQuery();
  const [updateAlertmanagerConfiguration] = useUpdateAlertmanagerConfigurationMutation();

  const [createNamespacedRoute] = useCreateNamespacedRoutingTreeMutation();

  const k8sApiSupported = shouldUseK8sApi(selectedAlertmanager);

  async function updateUsingK8sApi({ newRoute, oldRoute }: { newRoute: Route; oldRoute: Route }) {
    const namespace = getK8sNamespace();

    // Convert Route to K8s compatible format
    const k8sRoute: ComGithubGrafanaGrafanaPkgApisAlertingNotificationsV0Alpha1RoutingTreeSpec = {
      ...newRoute,
      receiver: newRoute.receiver ?? '', // TODO Types are incorrect. Undefined should be allowed.
      routes: newRoute.routes?.map(routeToK8sSubRoute),
    };

    // TODO Add a check to see if not updated in the meantime

    // Create the K8s route object
    const routeObject = { spec: k8sRoute, metadata: {} };

    return createNamespacedRoute({
      namespace,
      comGithubGrafanaGrafanaPkgApisAlertingNotificationsV0Alpha1Route: routeObject,
    }).unwrap();
  }

  async function updateUsingConfigFileApi({ newRoute, oldRoute }: { newRoute: Route; oldRoute: Route }) {
    const lastConfig = await getAlertmanagerConfiguration(selectedAlertmanager).unwrap();

    const configChangedInMeantime = JSON.stringify(oldRoute) !== JSON.stringify(lastConfig.alertmanager_config.route);

    if (configChangedInMeantime) {
      throw new Error(
        'A newer Alertmanager configuration is available. Please reload the page and try again to not overwrite recent changes.'
      );
    }

    const newConfig = {
      ...lastConfig,
      alertmanager_config: {
        ...lastConfig.alertmanager_config,
        route: newRoute,
      },
    };

    // TODO This needs to properly handle lazy AM initialization
    return updateAlertmanagerConfiguration({
      selectedAlertmanager,
      config: newConfig,
    }).unwrap();
  }

  return k8sApiSupported ? updateUsingK8sApi : updateUsingConfigFileApi;
}

function k8sRoutesToRoutes(
  routes: ComGithubGrafanaGrafanaPkgApisAlertingNotificationsV0Alpha1RoutingTreeSpec,
  metadata: IoK8SApimachineryPkgApisMetaV1ObjectMeta
): Route {
  debugger;
  console.log(routes);
  const provenance = getAnnotation({ metadata }, K8sAnnotations.Provenance) || PROVENANCE_NONE;
  return routes?.map(k8sSubRouteToRoute);
  return {
    ...route,
    provenance,
    routes: route.routes?.map(k8sSubRouteToRoute),
  };
}

/** Helper to provide type safety for matcher operators from API */
function isValidMatcherOperator(type: string): type is MatcherOperator {
  return type in MatcherOperator;
}

function k8sSubRouteToRoute(route: ComGithubGrafanaGrafanaPkgApisAlertingNotificationsV0Alpha1Route): Route {
  console.log(route);
  debugger;
  return {
    ...route,
    matchers: undefined,
    object_matchers: route.matchers?.map(({ label, type, value }) => {
      if (!isValidMatcherOperator(type)) {
        throw new Error(`Invalid matcher operator from API: ${type}`);
      }
      return [label, type, value];
    }),
    routes: route.routes?.map(k8sSubRouteToRoute),
  };
}

function routeToK8sSubRoute(route: Route): ComGithubGrafanaGrafanaPkgApisAlertingNotificationsV0Alpha1Route {
  return {
    ...route,
    receiver: route.receiver ?? undefined,
    matchers: route.object_matchers?.map(([label, type, value]) => ({
      label,
      type,
      value,
    })),
    routes: route.routes?.map(routeToK8sSubRoute),
  };
}
