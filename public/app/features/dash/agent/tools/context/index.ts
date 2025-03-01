import { tool } from '@langchain/core/tools';

import { AppContext, getAppContext } from './app';
import { DataSourceContext, getDataSourceContext } from './dataSource';
import { getPageContext, PageContext } from './page';
import { getQueryContext, QueryContext } from './query';
import { getTimeRangeContext, TimeRangeContext } from './timeRange';

export interface Contexts {
  page: PageContext;
  app: AppContext;
  time_range: TimeRangeContext;
  datasource: DataSourceContext;
  query: QueryContext;
}

export async function getCurrentContext(): Promise<Contexts> {
  const page = getPageContext();
  const app = getAppContext(page);

  return {
    page,
    app,
    time_range: getTimeRangeContext(page, app),
    datasource: getDataSourceContext(page, app),
    query: getQueryContext(page, app),
  };
}

export const contextTool = tool(async () => JSON.stringify(await getCurrentContext()), {
  name: 'get_context',
  description: 'Data about the module where the user is at and the current state of the application',
});
