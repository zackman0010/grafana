import { UrlQueryMap, urlUtil } from '@grafana/data';
import { locationService } from '@grafana/runtime';

export interface PageContext {
  pathname: string;
  title: string;
  url_parameters: UrlQueryMap;
}

export function getPageContext(): PageContext {
  const location = locationService.getLocation();
  return {
    pathname: location.pathname,
    title: document.title,
    url_parameters: filterContextRelevantParams(urlUtil.getUrlSearchParams()),
  };
}

function filterContextRelevantParams(params: UrlQueryMap): UrlQueryMap {
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
