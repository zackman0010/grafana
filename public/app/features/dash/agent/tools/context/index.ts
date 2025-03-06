import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { AppContext, getAppContext } from './app';
import { DataSourceContext, getDataSourceContext } from './dataSource';
import { getPageContext, PageContext } from './page';
import { getPanelsContext, PanelsContext } from './panels';
import { getQueryContext, QueryContext } from './query';
import { getTimeRangeContext, TimeRangeContext } from './timeRange';
import { getVariablesContext, VariablesContext } from './variables';

export interface Contexts {
  page: PageContext;
  app: AppContext;
  time_range: TimeRangeContext;
  datasource: DataSourceContext;
  query: QueryContext;
  panels: PanelsContext;
  variables: VariablesContext;
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
    variables: getVariablesContext(page, app),
  };
}

export const contextTool = tool(() => JSON.stringify(getCurrentContext()), {
  name: 'context',
  description: 'Get the current context.',
  schema: z.object({}),
  metadata: {
    explainer: () => {
      return `Getting current context`;
    },
  },
  verboseParsingErrors: true,
});
