import { tool } from '@langchain/core/tools';
import { get } from 'lodash';
import { z } from 'zod';

import { getBackendSrv } from '@grafana/runtime';
import { DashboardSearchItem } from 'app/features/search/types';
import { DashboardDTO } from 'app/types';

const dashboardSearchToolSchema = z.object({
  dashboardTitleQuery: z.string().optional().describe('Terms to search for in the dashboard title.'),
  dashboardTags: z.array(z.string()).optional().describe('List of dashboard tags to search for.'),
  dashboardUIDs: z.array(z.string()).optional().describe('List of dashboard UIDs to search for.'),
  metricNames: z.array(z.string()).optional().describe('List of metric names to search for.'),
  queryExpressions: z.array(z.string()).optional().describe('List of query expressions to search for.'),
});

export const dashboardSearchTool = tool(
  async (input) => {
    const {
      dashboardTitleQuery,
      dashboardTags,
      dashboardUIDs,
      metricNames = [],
      queryExpressions = [],
    } = dashboardSearchToolSchema.parse(input);

    const dashboardsList = (await getBackendSrv().get('/api/search', {
      query: dashboardTitleQuery,
      tags: dashboardTags,
      dashboardUIDs,
      type: 'dash-db',
    })) as DashboardSearchItem[];

    const dashboards: Array<{ stringified: string; dto: DashboardDTO }> = [];

    for (let dashboardsListIdx = 0; dashboardsListIdx < dashboardsList.length; dashboardsListIdx++) {
      const uid = dashboardsList[dashboardsListIdx].uid;
      const dto = await getBackendSrv().get(`/api/dashboards/uid/${uid}`);
      dashboards.push({ stringified: JSON.stringify(dto), dto });
    }

    if (metricNames.length === 0) {
      return JSON.stringify([]);
    }

    const result = dashboards
      .filter(({ stringified, dto }) => {
        for (let metricNamesIdx = 0; metricNamesIdx < metricNames.length; metricNamesIdx++) {
          if (stringified.includes(metricNames[metricNamesIdx])) {
            return true;
          }
        }

        for (let queryExpressionsIdx = 0; queryExpressionsIdx < queryExpressions.length; queryExpressionsIdx++) {
          const expressions = [
            ...get(dto, 'dashboard.panels', []),
            ...get(dto, 'dashboard.rows', []).reduce((acc, row) => [...acc, ...get(row, 'panels', [])], []),
          ].reduce<string[]>(
            (acc, panel) => [...acc, ...(panel.targets.map((target: any) => get(target, 'expr', '')) ?? [])],
            []
          );

          for (let expressionsIdx = 0; expressionsIdx < expressions.length; expressionsIdx++) {
            if (expressions[expressionsIdx] === queryExpressions[queryExpressionsIdx]) {
              return true;
            }
          }
        }

        return false;
      })
      .map(({ dto }) => dashboardsList.find((dashboardListItem) => dashboardListItem.uid === dto.dashboard.uid))
      .filter(Boolean);

    return JSON.stringify(result);
  },
  {
    name: 'search_dashboard',
    description: 'Search for dashboards',
    schema: dashboardSearchToolSchema,
  }
);
