import { PageContext } from './page';

export enum AppIdentifiers {
  Home,

  Explore,
  Dashboard,
  DrilldownMetrics,
  DrilldownLogs,
  DrilldownTraces,
  DrilldownProfiles,
  Unknown = -1,
}

export interface AppContext {
  id: AppIdentifiers;
  name: string;
  description: string;
  is_scenes_app: boolean;
}

export function getAppContext({ pathname }: PageContext): AppContext {
  if (pathname === '/') {
    return {
      id: AppIdentifiers.Home,
      name: 'Grafana Home',
      description: '',
      is_scenes_app: false,
    };
  } else if (pathname.includes('/explore/metrics')) {
    return {
      id: AppIdentifiers.DrilldownMetrics,
      name: 'Grafana Drilldown Metrics',
      description: 'The Drilldown Metrics app to browse and analyze metrics',
      is_scenes_app: false,
    };
  } else if (pathname.includes('grafana-lokiexplore-app')) {
    return {
      id: AppIdentifiers.DrilldownLogs,
      name: 'Grafana Drilldown Logs',
      description: 'The queryless app to browse Loki Logs',
      is_scenes_app: false,
    };
  } else if (pathname.includes('grafana-pyroscope-app')) {
    return {
      id: AppIdentifiers.DrilldownProfiles,
      name: 'Drilldown Profiles (previously Pyroscope)',
      description: 'The Drilldown Profiles app to browse and analyze profiles',
      is_scenes_app: false,
    };
  } else if (pathname.includes('grafana-exploretraces-app')) {
    return {
      id: AppIdentifiers.DrilldownTraces,
      name: 'Grafana Drilldown Traces',
      description: 'The Drilldown Traces app to browse and analyze traces',
      is_scenes_app: false,
    };
  } else if (pathname.includes('/explore')) {
    return {
      id: AppIdentifiers.Explore,
      name: 'Grafana Explore',
      description: '',
      is_scenes_app: false,
    };
  } else if (pathname.startsWith('/d/')) {
    return {
      id: AppIdentifiers.Dashboard,
      name: 'Grafana Dashboard',
      description: '',
      is_scenes_app: false,
    };
  }

  return {
    id: AppIdentifiers.Unknown,
    name: 'Unknown',
    description: '',
    is_scenes_app: false,
  };
}
