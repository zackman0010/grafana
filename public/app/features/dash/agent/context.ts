import { ExploreUrlState, UrlQueryMap, urlUtil } from '@grafana/data';
import { locationService } from '@grafana/runtime';

export function getCurrentContext() {
  const urlContext = getCurrentURLContext();
  console.log(urlContext);
  const timeRangeContext = getCurrentTimeRangeContext(urlContext);
  console.log(timeRangeContext);
  const dataSourceContext = getDataSourceContext(urlContext);
  console.log(dataSourceContext);
  const queryContext = getQueryContext(urlContext);
  console.log(queryContext);
};

interface URLContext {
  url: string;
  appName: string;
  title: string;
  params: UrlQueryMap;
}
function getCurrentURLContext(): URLContext {
  const location = locationService.getLocation();
  const params = filterContextRelevantParams(urlUtil.getUrlSearchParams());
  return {
    url: location.pathname,
    appName: locationToAppName(location.pathname),
    title: document.title,
    params,
  };
}

function locationToAppName(pathname: string) {
  if (pathname === '/') {
    return 'Grafana home page';
  } else if (pathname.includes('grafana-lokiexplore-app')) {
    return 'Grafana Drilldown Logs, the queryless app to browse Loki Logs';
  } else if (pathname.includes('/explore')) {
    return 'Grafana Explore';
  }
  return '';
}

function filterContextRelevantParams(params: UrlQueryMap) {
  const filteredParams: UrlQueryMap = {};
  for (const key in params) {
    if (Array.isArray(params[key])) {
      const filteredArray = params[key].filter((element) => element !== '') as string[] | number[] | boolean[];
      if (filteredArray.length > 0) {
        filteredParams[key] = filteredArray;
      }
    } else if (params[key] != null) {
      filteredParams[key] = params[key];
    }
  }
  return filteredParams;
}

function getCurrentTimeRangeContext(urlContext?: URLContext) {
  if (urlContext && urlContext.params.from && urlContext.params.to) {
    if (urlContext.params.from.toString().includes('now-')) {
      return urlContext.params.from;
    }
    return `${urlContext.params.from} to ${urlContext.params.to}`;
  }
  return (
    document
      .querySelector('[data-testid~="TimePicker"]')
      ?.getAttribute('aria-label')
      ?.replace('Time range selected: ', '') ?? ''
  );
}

function getDataSourceContext(urlContext?: URLContext) {
  if (urlContext?.url.includes('grafana-lokiexplore-app')) {
    return 'Loki';
  }
  if (urlContext?.url.includes('/explore') && urlContext.params.panes) {
    let panes: ExploreUrlState | undefined = undefined;
    try {
      panes = JSON.parse(urlContext.params.panes.toString());
    } catch (e) {
      console.error(e);
    }
    if (panes) {
      const keys = Object.keys(panes);
      // @ts-expect-error
      if (keys[0] in panes && panes[keys[0]].queries) {
        // @ts-expect-error
        return panes[keys[0]].queries[0]?.datasource?.type ?? '';
      }
    }
  }

  return '';
}

function getQueryContext(urlContext?: URLContext) {
  if (urlContext?.url.includes('/explore') && urlContext.params.panes) {
    let panes: ExploreUrlState | undefined = undefined;
    try {
      panes = JSON.parse(urlContext.params.panes.toString());
    } catch (e) {
      console.error(e);
    }
    if (panes) {
      const keys = Object.keys(panes);
      // @ts-expect-error
      if (keys[0] in panes && panes[keys[0]].queries) {
        // @ts-expect-error
        return panes[keys[0]].queries[0]?.expr ?? '';
      }
    }
  }

  return '';
}
