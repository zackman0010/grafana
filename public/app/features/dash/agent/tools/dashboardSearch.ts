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

    // Get all dashboards matching the query / tags / uids
    const dashboardsList = (await getBackendSrv().get('/api/search', {
      query: dashboardTitleQuery,
      tags: dashboardTags,
      dashboardUIDs,
      type: 'dash-db',
    })) as DashboardSearchItem[];

    // If no metric names or query expressions are provided, return all dashboards
    if (metricNames.length === 0 && queryExpressions.length === 0) {
      return JSON.stringify(dashboardsList);
    }

    return JSON.stringify(
      // Fetch the DTOs for the dashboards above
      (
        (await Promise.all(
          dashboardsList.map(async (dashboardListItem) =>
            getBackendSrv().get(`/api/dashboards/uid/${dashboardListItem.uid}`)
          )
        )) as DashboardDTO[]
      )
        // Map the DTOs to a list of objects with the DTO, a stringified version of it, and a list of query expressions
        .map((dto) => ({
          dto,
          stringified: JSON.stringify(dto),
          expressions: [
            // Get the panels
            ...(get(dto, 'dashboard.panels', []) ?? []),
            // Get the panels from every row
            ...(get(dto, 'dashboard.rows', []) ?? []).reduce((acc, row) => [...acc, ...get(row, 'panels', [])], []),
          ].reduce<string[]>(
            (acc, panel) => [...acc, ...(panel.targets?.map((target: any) => get(target, 'expr', '')) ?? [])],
            []
          ),
        }))
        // Filter the DTOs to only include those that contain a metric name or query expression
        .filter(({ stringified, expressions }) => {
          const containsMetricName = metricNames.some((metricName) => stringified.includes(metricName));

          if (containsMetricName) {
            return true;
          }

          return queryExpressions.some((queryExpression) => expressions.includes(queryExpression));
        })
        // Map the DTOs to the original dashboard list items
        .map(({ dto }) => dashboardsList.find((dashboardListItem) => dashboardListItem.uid === dto.dashboard.uid))
        // Filter out any null values
        .filter(Boolean)
    );
  },
  {
    name: 'search_dashboard',
    description: 'Search for dashboards',
    schema: dashboardSearchToolSchema,
    metadata: {
      explainer: () => {
        return `Searching for dashboards`;
      },
    },
  }
);
