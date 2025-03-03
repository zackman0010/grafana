import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { Divider, IconButton, useStyles2 } from '@grafana/ui';

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
      codeOverflow: (localStorage.getItem('grafana.settings.dash.code-overflow') ?? 'wrap') as 'scroll' | 'wrap',
      mode: (localStorage.getItem('grafana.settings.dash.mode') ?? 'sidebar') as 'floating' | 'sidebar',
      showTools: localStorage.getItem('grafana.settings.dash.show-tools') === 'false' ? false : true,
    });
  }

  public toggleCodeOverflow() {
    const codeOverflow = this.state.codeOverflow === 'scroll' ? 'wrap' : 'scroll';
    this.setState({ codeOverflow });
    localStorage.setItem('grafana.settings.dash.code-overflow', codeOverflow);
  }

  public toggleMode() {
    const mode = this.state.mode === 'floating' ? 'sidebar' : 'floating';
    this.setState({ mode });
    localStorage.setItem('grafana.settings.dash.mode', mode);
  }

  public toggleShowTools() {
    const showTools = !this.state.showTools;
    this.setState({ showTools });
    localStorage.setItem('grafana.settings.dash.show-tools', String(showTools));
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
        size="sm"
        tooltip={codeOverflowText}
        aria-label={codeOverflowText}
        onClick={() => model.toggleCodeOverflow()}
      />
      <Divider direction="vertical" />
      <IconButton
        name={showTools ? 'eye' : 'eye-slash'}
        size="sm"
        tooltip={showToolsText}
        aria-label={showToolsText}
        onClick={() => model.toggleShowTools()}
      />
      <Divider direction="vertical" />
      <IconButton
        name={mode === 'floating' ? 'library-panel' : 'columns'}
        size="sm"
        tooltip={modeText}
        aria-label={modeText}
        onClick={() => model.toggleMode()}
      />
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    backgroundColor: theme.colors.background.canvas,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: theme.spacing(1),
    borderTop: `1px solid ${theme.colors.border.strong}`,
    gap: theme.spacing(0.5),
  }),
});
