import { screen } from '@testing-library/react';
import { nanoid } from 'nanoid';
import React from 'react';
import { from, map, of } from 'rxjs';

import { DataQueryRequest, DataQueryResponse, DataSourceApi, dateTime, LoadingState, PanelData } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';

import { render } from '../../../../../test/test-utils';

import LogViewer from './LogViewer';

jest.mock('./log', () => {
  const original = jest.requireActual('./log');
  return {
    ...original,
    log: {
      asObservable: () =>
        of(
          {
            level: 'info',
            labels: {
              test: 'test',
            },
            timestamp: Date.now(),
            id: nanoid(),
            message: 'a message',
            pluginId: 'grafana-k8-app',
            extensionPointId: 'grafana/dashboards/panel/menu',
          },
          {
            level: 'debug',
            labels: {
              title: 'a link',
              onClick: 'function',
            },
            timestamp: Date.now(),
            id: nanoid(),
            message: 'another message',
          }
        ),
    },
  };
});

jest.mock('@grafana/runtime', () => {
  const original = jest.requireActual('@grafana/runtime');
  return {
    ...original,
    getPluginImportUtils: jest.fn(() => ({
      getPanelPluginFromCache: jest.fn(),
    })),
    getRunRequest: () => (ds: DataSourceApi, request: DataQueryRequest) => {
      return from(ds.query(request)).pipe(
        map<DataQueryResponse, PanelData>((response) => {
          return {
            request,
            timeRange: {
              from: dateTime(),
              to: dateTime(),
              raw: {
                from: '',
                to: '',
              },
            },
            series: response.data,
            state: response.state!,
          };
        })
      );
    },
  };
});

describe('LogViewer', () => {
  it('should render log panel with logs', async () => {
    render(<LogViewer />);

    const firstLogRow = await screen.findByRole('button', { name: 'a message' });
    expect(firstLogRow).toBeVisible();

    const secondLogRow = await screen.findByRole('button', { name: 'another message' });
    expect(secondLogRow).toBeVisible();
  });
});
