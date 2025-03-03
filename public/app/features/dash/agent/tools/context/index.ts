import { tool } from '@langchain/core/tools';

import { AppContext, getAppContext } from './app';
import { DataSourceContext, getDataSourceContext } from './dataSource';
import { getPageContext, PageContext } from './page';
import { getPanelsContext, PanelsContext } from './panels';
import { getQueryContext, QueryContext } from './query';
import { getTimeRangeContext, TimeRangeContext } from './timeRange';

export interface Contexts {
  page: PageContext;
  app: AppContext;
  time_range: TimeRangeContext;
  datasource: DataSourceContext;
  query: QueryContext;
  panels: PanelsContext;
}

export function getCurrentContext(): Contexts {
  const page = getPageContext();
  const app = getAppContext(page);

  return {
    page,
    app,
    time_range: getTimeRangeContext(page, app),
    datasource: getDataSourceContext(page, app),
    query: getQueryContext(page, app),
    panels: getPanelsContext(page, app),
  };
}

export const contextTool = tool(() => JSON.stringify(getCurrentContext()), {
  name: 'update_current_context',
  description:
    'Use this tool when you need an update about the module where the user is at and the current state of the application',
});
