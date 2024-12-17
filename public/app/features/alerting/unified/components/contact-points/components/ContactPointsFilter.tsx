import { css } from '@emotion/css';
import { useMemo } from 'react';

import { SelectableValue } from '@grafana/data';
import { Button, Field, Icon, Input, Select, SelectCommonProps, Stack, Text, useStyles2 } from '@grafana/ui';

import { alertmanagerApi } from '../../../api/alertmanagerApi';
import { useAlertmanager } from '../../../state/AlertmanagerContext';
import { stringifyErrorLike } from '../../../utils/misc';

import { useContactPointsFilter } from './useContactPointsFilter';

const useGrafanaNotifiers = alertmanagerApi.endpoints.grafanaNotifiers.useQuery;

const ContactPointsFilter = () => {
  const styles = useStyles2(getStyles);
  const { isGrafanaAlertmanager } = useAlertmanager();
  const { filters, updateFilter, clear } = useContactPointsFilter();

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <Stack direction="row" alignItems="end" gap={0.5}>
      <Field className={styles.noBottom} label="Search by name">
        <Input
          aria-label="search contact points"
          placeholder="Search"
          width={46}
          prefix={<Icon name="search" />}
          onChange={(event) => {
            updateFilter({ search: event.currentTarget.value });
          }}
          value={filters.search}
        />
      </Field>
      {/* I don't feel like doing this for non-Grafana Alertmanagers right now */}
      {isGrafanaAlertmanager && (
        <Field className={styles.noBottom} label="Filter by type">
          <NotifierSelector
            width={24}
            value={filters.type}
            onChange={(type) => {
              updateFilter({ type: type.value });
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
