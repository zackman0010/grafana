import { AbstractQuery } from '@grafana/data';

export function decomposeAbstractQuery(abstractQuery: AbstractQuery) {
  const serviceNameMatchers = abstractQuery.labelMatchers.filter((matcher) => matcher.otel === 'service.name');
  const otherMatcher = abstractQuery.labelMatchers.filter((matcher) => matcher.otel !== 'service.name');

  return {
    serviceName: serviceNameMatchers.length ? serviceNameMatchers[0] : undefined,
    labels: otherMatcher,
  };
}
