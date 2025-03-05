import { TimeRange } from '@grafana/data';

export function buildPanelJson(
  timeRange: TimeRange,
  type: string,
  title: string,
  description: string,
  queryObject: any,
  transformations: any[] = []
) {
  return {
    timeRange: timeRange,
    panel: {
      type: type,
      title: title,
      description: description,
      fieldConfig: {
        defaults: {
          custom: {
            align: 'auto',
            cellOptions: {
              type: 'auto',
            },
            inspect: false,
          },
          mappings: [],
          thresholds: {
            mode: 'absolute',
            steps: [],
          },
        },
        overrides: [],
      },
      transformations: transformations,
      targets: [queryObject],
      options: {
        showHeader: true,
      },
    },
  };
}
