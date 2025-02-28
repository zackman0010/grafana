import { UrlQueryMap, urlUtil } from "@grafana/data";
import { locationService } from "@grafana/runtime";

// @ts-expect-error
window.getContext = () => {
  console.log(getCurrentURLContext());
}

interface URLContext {
  url: string;
  title: string;
  params: UrlQueryMap;
}
function getCurrentURLContext(): URLContext {
  const location = locationService.getLocation();
  const params = filterContextRelevantParams(urlUtil.getUrlSearchParams());
  return {
    url: location.pathname,
    title: document.title,
    params,
  }
}

function filterContextRelevantParams(params: UrlQueryMap) {
  const filteredParams: UrlQueryMap = {};
  for (const key in params) {
    if (Array.isArray(params[key])) {
      const filteredArray = params[key].filter(element => element !== '') as string[] | number[] | boolean[];
      if (filteredArray.length > 0) {
        filteredParams[key] = filteredArray;
      }
    } else if (params[key] != null) {
      filteredParams[key] = params[key];
    }
  }
  return filteredParams;
}
