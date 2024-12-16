import { css } from '@emotion/css';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';

import { SelectableValue } from '@grafana/data';
import { Stack } from '@grafana/experimental';
import { Button, Field, Icon, Input, Select, SelectCommonProps, Text, useStyles2 } from '@grafana/ui';

import { alertmanagerApi } from '../../../api/alertmanagerApi';
import { useURLSearchParams } from '../../../hooks/useURLSearchParams';
import { useAlertmanager } from '../../../state/AlertmanagerContext';
import { stringifyErrorLike } from '../../../utils/misc';

const useGrafanaNotifiers = alertmanagerApi.endpoints.grafanaNotifiers.useQuery;

const ContactPointsFilter = () => {
  const styles = useStyles2(getStyles);
  const { isGrafanaAlertmanager } = useAlertmanager();

  const [searchParams, setSearchParams] = useURLSearchParams();
  const [filters, setFilters] = useState({
    search: searchParams.get('search') ?? undefined,
    type: searchParams.get('type') ?? undefined,
  });
  const filtersDeferred = useDeferredValue(filters);

  const clear = useCallback(() => {
    setFilters({ search: '', type: '' });
  }, []);

  // when the filters are updated (deferred) update the search params
  useEffect(() => {
    setSearchParams(filtersDeferred, true);
  }, [filtersDeferred, setSearchParams]);

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <Stack direction="row" alignItems="end" gap={0.5}>
      <Field className={styles.noBottom} label="Search by name or type">
        <Input
          aria-label="search contact points"
          placeholder="Search"
          width={46}
          prefix={<Icon name="search" />}
          onChange={(event) => {
            setFilters({
              ...filters,
              search: event.currentTarget.value,
            });
          }}
          value={filtersDeferred.search}
        />
      </Field>
      {/* I don't feel like doing this for non-Grafana Alertmanagers right now */}
      {isGrafanaAlertmanager && (
        <Field className={styles.noBottom} label="Filter by type">
          <NotifierSelector
            width={24}
            value={filtersDeferred.type}
            onChange={(type) => {
              setFilters({
                ...filters,
                type: type.value,
              });
            }}
          />
        </Field>
      )}
      <Button variant="secondary" icon="times" onClick={() => clear()} disabled={!hasFilters} aria-label="clear">
        Clear
      </Button>
    </Stack>
  );
};

export function NotifierSelector(props: SelectCommonProps<string>) {
  const { data, isLoading, error } = useGrafanaNotifiers();
  if (error) {
    return <Text color="error">{stringifyErrorLike(error)}</Text>;
  }

  const options: Array<SelectableValue<string>> = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.map((notifier) => ({
      value: notifier.type,
      label: notifier.name,
    }));
  }, [data]);

  const selectedOption = options.find((option) => option.value === props.value) ?? null;

  return <Select<string> {...props} value={selectedOption} options={options} isLoading={isLoading} />;
}

const getStyles = () => ({
  noBottom: css({
    marginBottom: 0,
  }),
});

export { ContactPointsFilter };
