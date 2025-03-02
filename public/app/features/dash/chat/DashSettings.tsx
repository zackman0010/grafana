import { css } from '@emotion/css';
import { useMemo } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { Combobox, ComboboxOption, Divider, Field, Switch, useStyles2 } from '@grafana/ui';

export interface DashSettingsState extends SceneObjectState {
  codeOverflow: 'scroll' | 'wrap' | 'ellipsis';
  showTools: boolean;
}

export class DashSettings extends SceneObjectBase<DashSettingsState> {
  public static Component = DashSettingsRenderer;

  public constructor() {
    super({
      codeOverflow: 'wrap',
      showTools: true,
    });
  }

  public changeCodeOverflow(codeOverflow: DashSettingsState['codeOverflow']) {
    this.setState({ codeOverflow });
  }

  public toggleShowTools() {
    this.setState({ showTools: !this.state.showTools });
  }
}

function DashSettingsRenderer({ model }: SceneComponentProps<DashSettings>) {
  const styles = useStyles2(getStyles);
  const { codeOverflow, showTools } = model.useState();

  const codeOverflowOptions: Array<ComboboxOption<DashSettingsState['codeOverflow']>> = useMemo(
    () => [
      { label: 'Scroll', value: 'scroll' },
      { label: 'Wrap', value: 'wrap' },
      { label: 'Ellipsis', value: 'ellipsis' },
    ],
    []
  );

  const codeOverflowValue = codeOverflowOptions.find(({ value }) => value === codeOverflow);

  return (
    <div className={styles.container}>
      <Field label="Code overflow" description="Control how code blocks overflow">
        <Combobox
          isClearable={false}
          value={codeOverflowValue}
          options={codeOverflowOptions}
          onChange={(value) => model.changeCodeOverflow(value?.value ?? 'scroll')}
        />
      </Field>
      <Divider />
      <Field label="Show tools" description="Toggle the visibility of tools">
        <Switch value={showTools} onChange={() => model.toggleShowTools()} />
      </Field>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    height: '100%',
    width: '100%',
    backgroundColor: theme.colors.background.primary,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'scroll',
    padding: theme.spacing(2),
  }),
});
