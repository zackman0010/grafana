const providers = [
  'dashboard',
  'metrics_name',
  'label_name',
  'datasource',
  'label_value',
];

export function dataProvider(token: string) {
  return providers.filter(provider => provider.startsWith(token));
}
