import { css } from '@emotion/css';
import { useState, useEffect, useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { IconButton, useStyles2, Badge } from '@grafana/ui';

import { DashStorage } from './DashStorage';
import { Settings, Verbosity } from './types';
import { persistSetting } from './utils';

// Token limit is 200k
const TOKEN_LIMIT = 200000;
const TOKEN_WARNING_THRESHOLD = 0.75; // 75%
const TOKEN_DANGER_THRESHOLD = 0.8; // 80%

type DashSettingsState = Settings &
  SceneObjectState & {
    inputTokens: number;
  };

export class DashSettings extends SceneObjectBase<DashSettingsState> {
  public static Component = DashSettingsRenderer;

  public get renderBeforeActivation(): boolean {
    return true;
  }

  private _savingPromise: Promise<void> | undefined;

  public constructor() {
    super({
      codeOverflow: 'wrap',
      mode: 'sidebar',
      showTools: true,
      verbosity: 'concise',
      inputTokens: 0,
    });
  }

  public toggleCodeOverflow() {
    const codeOverflow = this.state.codeOverflow === 'scroll' ? 'wrap' : 'scroll';
    this.setState({ codeOverflow });
    this._persist('codeOverflow', codeOverflow);
  }

  public toggleMode() {
    const mode = this.state.mode === 'floating' ? 'sidebar' : 'floating';
    this.setState({ mode });
    this._persist('mode', mode);
  }

  public toggleShowTools() {
    const showTools = !this.state.showTools;
    this.setState({ showTools });
    this._persist('showTools', showTools);
  }

  public setVerbosity(verbosity: Verbosity) {
    this.setState({ verbosity });
    this._persist('verbosity', verbosity);
    persistSetting('verbosity', verbosity);
  }

  public updateInputTokens(tokens: number) {
    this.setState({ inputTokens: tokens });
  }

  private async _persist<T extends keyof Settings = keyof Settings>(key: T, value: Settings[T]) {
    if (this._savingPromise) {
      await this._savingPromise;
    }

    this._savingPromise = DashStorage.instance.setSettingsValue(key, value).finally(() => {
      this._savingPromise = undefined;
    });
  }
}

function DashSettingsRenderer({ model }: SceneComponentProps<DashSettings>) {
  const styles = useStyles2(getStyles);
  const { codeOverflow, mode, showTools, verbosity, inputTokens } = model.useState();
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
  const modeText = mode === 'floating' ? 'View as sidebar' : 'View as chat window';
  // Format tokens to display in K format
  const formattedTokens = inputTokens >= 1000 ? `${(inputTokens / 1000).toFixed(1)}k` : inputTokens.toString();

  // Determine token counter color based on usage
  const tokenPercentage = inputTokens / TOKEN_LIMIT;
  let tokenColor: 'darkgrey' | 'orange' | 'red' = 'darkgrey';
  if (tokenPercentage >= TOKEN_DANGER_THRESHOLD) {
    tokenColor = 'red';
  } else if (tokenPercentage >= TOKEN_WARNING_THRESHOLD) {
    tokenColor = 'orange';
  }

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
        {inputTokens > 0 && (
          <span className={styles.tokenCounter} title={`Input tokens: ${inputTokens} / ${TOKEN_LIMIT}`}>
            <Badge color={tokenColor} text={formattedTokens} className={styles.noBg} />
          </span>
        )}
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
    label: 'dash-settings-container',
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
    textTransform: 'capitalize',
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
  tokenCounter: css({
    display: 'flex',
    alignItems: 'center',
    marginRight: theme.spacing(1),
    fontSize: '11px',
    opacity: 0.8,
  }),
  noBg: css({
    background: 'transparent !important',
    border: 'none !important',
  }),
});
