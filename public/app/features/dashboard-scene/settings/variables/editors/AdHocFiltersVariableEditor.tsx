import { FormEvent } from 'react';
import { useAsync } from 'react-use';

import { DataSourceInstanceSettings, MetricFindValue, getDataSourceRef } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { DataSourcePicker, getDataSourceSrv } from '@grafana/runtime';
import { AdHocFiltersVariable, SceneVariable } from '@grafana/scenes';
import { Alert, Stack } from '@grafana/ui';
import { t } from 'app/core/internationalization';
import { OptionsPaneItemDescriptor } from 'app/features/dashboard/components/PanelEditor/OptionsPaneItemDescriptor';

import { AdHocVariableForm } from '../components/AdHocVariableForm';

interface AdHocFiltersVariableEditorProps {
  variable: AdHocFiltersVariable;
  onRunQuery: (variable: AdHocFiltersVariable) => void;
}

export function AdHocFiltersVariableEditor(props: AdHocFiltersVariableEditorProps) {
  const { variable } = props;
  const { datasource: datasourceRef, defaultKeys, allowCustomValue } = variable.useState();

  const { value: datasourceSettings } = useAsync(async () => {
    return await getDataSourceSrv().get(datasourceRef);
  }, [datasourceRef]);

  const message = datasourceSettings?.getTagKeys
    ? 'Ad hoc filters are applied automatically to all queries that target this data source'
    : 'This data source does not support ad hoc filters yet.';

  const onDataSourceChange = (ds: DataSourceInstanceSettings) => {
    const dsRef = getDataSourceRef(ds);

    variable.setState({
      datasource: dsRef,
      supportsMultiValueOperators: ds.meta.multiValueFilterOperators,
    });
  };

  const onDefaultKeysChange = (defaultKeys?: MetricFindValue[]) => {
    variable.setState({
      defaultKeys,
    });
  };

  const onAllowCustomValueChange = (event: FormEvent<HTMLInputElement>) => {
    variable.setState({ allowCustomValue: event.currentTarget.checked });
  };

  return (
    <AdHocVariableForm
      datasource={datasourceRef ?? undefined}
      infoText={message}
      allowCustomValue={allowCustomValue}
      onDataSourceChange={onDataSourceChange}
      defaultKeys={defaultKeys}
      onDefaultKeysChange={onDefaultKeysChange}
      onAllowCustomValueChange={onAllowCustomValueChange}
    />
  );
}

export function getAdhocFiltersVariableOptions(variable: SceneVariable): OptionsPaneItemDescriptor[] {
  if (!(variable instanceof AdHocFiltersVariable)) {
    return [];
  }

  return [
    new OptionsPaneItemDescriptor({
      title: t('dashboard.edit-pane.variable.adhoc-options.datasource', 'Data source'),
      render: () => <AdHocFilterDataSourcePicker variable={variable} />,
    }),
  ];
}

function AdHocFilterDataSourcePicker({ variable }: { variable: AdHocFiltersVariable }) {
  const { datasource } = variable.useState();

  const { value: dsInstance } = useAsync(async () => {
    return await getDataSourceSrv().get(datasource);
  }, [datasource]);

  const onDataSourceChange = async (ds: DataSourceInstanceSettings) => {
    const dsRef = getDataSourceRef(ds);
    variable.setState({ datasource: dsRef });
  };

  const message = dsInstance?.getTagKeys
    ? 'Ad hoc filters are applied automatically to all queries that target this data source'
    : 'This data source does not support ad hoc filters yet.';

  return (
    <Stack direction={'column'} gap={1}>
      <DataSourcePicker current={datasource} onChange={onDataSourceChange} width={30} variables={true} noDefault />
      {message ? (
        <Alert
          title={message}
          severity="info"
          data-testid={selectors.pages.Dashboard.Settings.Variables.Edit.AdHocFiltersVariable.infoText}
        />
      ) : null}
    </Stack>
  );
}
