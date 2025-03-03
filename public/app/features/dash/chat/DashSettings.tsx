import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { IconButton, useStyles2 } from '@grafana/ui';

import { getPersistedSetting, persistSetting } from './utils';

export interface DashSettingsState extends SceneObjectState {
  codeOverflow: 'scroll' | 'wrap';
  mode: 'floating' | 'sidebar';
  showTools: boolean;
}

export class DashSettings extends SceneObjectBase<DashSettingsState> {
  public static Component = DashSettingsRenderer;

  public get renderBeforeActivation(): boolean {
    return true;
  }

  public constructor() {
    super({
      codeOverflow: (getPersistedSetting('code-overflow') ?? 'wrap') as 'scroll' | 'wrap',
      mode: (getPersistedSetting('mode') ?? 'sidebar') as 'floating' | 'sidebar',
      showTools: getPersistedSetting('show-tools') === 'false' ? false : true,
    });
  }

  public toggleCodeOverflow() {
    const codeOverflow = this.state.codeOverflow === 'scroll' ? 'wrap' : 'scroll';
    this.setState({ codeOverflow });
    persistSetting('code-overflow', codeOverflow);
  }

  public toggleMode() {
    const mode = this.state.mode === 'floating' ? 'sidebar' : 'floating';
    this.setState({ mode });
    persistSetting('mode', mode);
  }

  public toggleShowTools() {
    const showTools = !this.state.showTools;
    this.setState({ showTools });
    persistSetting('show-tools', String(showTools));
  }
}

function DashSettingsRenderer({ model }: SceneComponentProps<DashSettings>) {
  const styles = useStyles2(getStyles);
  const { codeOverflow, mode, showTools } = model.useState();

  const codeOverflowText = codeOverflow === 'scroll' ? 'Enable soft wrap' : 'Disable soft wrap';
  const showToolsText = showTools ? 'Hide tools' : 'Show tools';
  const modeText = mode === 'floating' ? 'View as chat window' : 'View as sidebar';

  return (
    <div className={styles.container}>
      <IconButton
        name={codeOverflow === 'scroll' ? 'ellipsis-h' : 'wrap-text'}
        size="lg"
        tooltip={codeOverflowText}
        aria-label={codeOverflowText}
        onClick={() => model.toggleCodeOverflow()}
      />

      <IconButton
        name={showTools ? 'eye' : 'eye-slash'}
        size="lg"
        tooltip={showToolsText}
        aria-label={showToolsText}
        onClick={() => model.toggleShowTools()}
      />

      <IconButton
        name={mode === 'floating' ? 'library-panel' : 'columns'}
        size="lg"
        tooltip={modeText}
        aria-label={modeText}
        onClick={() => model.toggleMode()}
      />
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  }),
});
