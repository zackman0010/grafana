// As per pkg/tests/secret/testdata/secure-value-xyz.yaml
export const MOCKED_SECRET_AUDIENCES = [
  'k6.grafana.app/app-name-1',
  'k6.grafana.app/app-name-2',
  'entity.grafana.app/*',
];
export const MOCKED_SECRET_KEEPER = 'kp-default-sql';

export const MOCKED_FILTER_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Enabled', value: 'enabled' },
  { label: 'Disabled', value: 'disabled' },
];
