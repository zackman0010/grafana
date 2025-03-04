import { css } from '@emotion/css';
import { useState, useEffect, useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { IconButton, useStyles2 } from '@grafana/ui';

import { getPersistedSetting, persistSetting } from './utils';

export interface DashSettingsState extends SceneObjectState {
  codeOverflow: 'scroll' | 'wrap';
  mode: 'floating' | 'sidebar';
  showTools: boolean;
  verbosity: 'concise' | 'educational';
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
      verbosity: (getPersistedSetting('verbosity') ?? 'concise') as 'concise' | 'educational',
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

  public setVerbosity(verbosity: 'concise' | 'educational') {
    this.setState({ verbosity });
    persistSetting('verbosity', verbosity);
  }
}

function DashSettingsRenderer({ model }: SceneComponentProps<DashSettings>) {
  const styles = useStyles2(getStyles);
  const { codeOverflow, mode, showTools, verbosity } = model.useState();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const codeOverflowText = codeOverflow === 'scroll' ? 'Enable soft wrap' : 'Disable soft wrap';
  const showToolsText = showTools ? 'Hide tools' : 'Show tools';
  const modeText = mode === 'floating' ? 'View as chat window' : 'View as sidebar';

  return (
    <div className={styles.container}>
      <div className={styles.leftSection}>
        <div className={styles.verbosityControl} onClick={() => setShowMenu(!showMenu)}>
          <span className={styles.verbosityLabel}>
            {verbosity}
            <i className={`${styles.caret} fa fa-angle-up`} />
          </span>
        </div>
        {showMenu && (
          <div className={styles.menu} ref={menuRef}>
            <div
              className={`${styles.menuItem} ${verbosity === 'concise' ? styles.active : ''}`}
              onClick={() => {
                model.setVerbosity('concise');
                setShowMenu(false);
              }}
            >
              Concise
            </div>
            <div
              className={`${styles.menuItem} ${verbosity === 'educational' ? styles.active : ''}`}
              onClick={() => {
                model.setVerbosity('educational');
                setShowMenu(false);
              }}
            >
              Educational
            </div>
          </div>
        )}
      </div>
      <div className={styles.rightSection}>
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
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  }),
  leftSection: css({
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
  }),
  rightSection: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  }),
  verbosityControl: css({
    cursor: 'pointer',
    opacity: 0.8,
    '&:hover': {
      opacity: 1,
    },
  }),
  verbosityLabel: css({
    fontSize: '12px',
    color: theme.colors.text.secondary,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  }),
  caret: css({
    fontSize: '14px',
    marginLeft: '2px',
  }),
  menu: css({
    position: 'absolute',
    bottom: '100%',
    left: 0,
    background: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    boxShadow: theme.shadows.z2,
    zIndex: 1000,
  }),
  menuItem: css({
    padding: '8px 12px',
    fontSize: '12px',
    cursor: 'pointer',
    color: theme.colors.text.primary,
    '&:hover': {
      background: theme.colors.action.hover,
    },
  }),
  active: css({
    background: theme.colors.action.selected,
    color: theme.colors.text.primary,
  }),
});
