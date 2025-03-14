import { css, cx } from '@emotion/css';
import { useState, useEffect, useRef } from 'react';

import { AppEvents, GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { IconButton, useStyles2, Badge, Modal, Button, Switch } from '@grafana/ui';
import { appEvents } from 'app/core/core';

import { DashStorage } from './DashStorage';
import { SerializedDashSettings, Settings, Verbosity } from './types';
import { getDash, persistSetting } from './utils';

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

  public toJSON(): SerializedDashSettings {
    return {
      codeOverflow: this.state.codeOverflow,
      mode: this.state.mode,
      showTools: this.state.showTools,
      verbosity: this.state.verbosity,
    };
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
  const [debugOpened, setDebugOpened] = useState(false);
  const [debugAllChats, setDebugAllChats] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dash = getDash(model);
  const currentChat = dash.state.chats[dash.state.chatIndex];
  const currentInstance = currentChat.state.versions[currentChat.state.versionIndex];
  const speech = currentInstance.state.input.state.speech;
  const { listening } = speech.useState();

  // Ensure speech component is activated
  useEffect(() => {
    speech.activate();
  }, [speech]);

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
          name="microphone"
          className={cx(styles.micButton, { [styles.micActive]: listening })}
          onClick={() => speech.toggleSpeechRecognition()}
          tooltip={listening ? 'Stop dictation' : 'Start dictation'}
          aria-label={listening ? 'Stop dictation' : 'Start dictation'}
        />
        <IconButton
          name="bug"
          tooltip="Debug chat and send feedback"
          aria-label="Debug chat and send feedback"
          className={styles.rightBorder}
          onClick={() => setDebugOpened(true)}
        />
        {debugOpened && (
          <Modal
            title="Debug Dash"
            isOpen={debugOpened}
            onDismiss={() => setDebugOpened(false)}
            contentClassName={styles.debugModalOriginalContent}
          >
            <div className={styles.debugModalContent}>
              <div className={styles.debugModalContentHeader}>
                <Switch
                  label="Include all chats"
                  title="Include all chats"
                  checked={debugAllChats}
                  onChange={() => setDebugAllChats(!debugAllChats)}
                />
                <span>Include all chats</span>
              </div>
              <h3>Settings</h3>
              <pre className={styles.debugModalContentJson}>{JSON.stringify(model.toJSON(), null, 2)}</pre>
              <h3>Message{debugAllChats ? 's' : ''}</h3>
              <pre className={cx(styles.debugModalContentJson, styles.debugModalContentJsonLarge)}>
                {JSON.stringify(
                  debugAllChats
                    ? getDash(model).toJSON().chats
                    : getDash(model).state.chats[getDash(model).state.chatIndex].toJSON(),
                  null,
                  2
                )}
              </pre>
            </div>
            <Modal.ButtonRow>
              <Button onClick={() => setDebugOpened(false)} fill="outline" variant="secondary">
                Close
              </Button>
              <Button
                type="submit"
                variant="secondary"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(
                      JSON.stringify(
                        debugAllChats
                          ? getDash(model).toJSON().chats
                          : getDash(model).state.chats[getDash(model).state.chatIndex].toJSON(),
                        null,
                        2
                      )
                    );

                    const url = new URL(`https://github.com/grafana/hackathon-dash/issues/new`);
                    url.searchParams.set(
                      'body',
                      `
### Settings
\`\`\`json
${JSON.stringify(model.toJSON(), null, 2)}
\`\`\`

### Chat${debugAllChats ? 's' : ''}
\`\`\`json
Chat${debugAllChats ? 's' : ''} was copied to your clipboard. Please paste ${debugAllChats ? 'them' : 'it'} here.
\`\`\`
`
                    );

                    window.open(url.toString(), '_blank');

                    setDebugOpened(false);
                  } catch (err) {
                    appEvents.publish({
                      type: AppEvents.alertError.name,
                      payload: ['Debug info could not be copied to clipboard'],
                    });
                  }

                  setDebugOpened(false);
                }}
                icon="external-link-alt"
              >
                Open GitHub Issue
              </Button>
              <Button
                type="submit"
                variant="primary"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(
                      JSON.stringify(
                        {
                          settings: model.toJSON(),
                          chat: debugAllChats
                            ? undefined
                            : getDash(model).state.chats[getDash(model).state.chatIndex].toJSON(),
                          chats: debugAllChats ? getDash(model).toJSON().chats : undefined,
                        },
                        null,
                        2
                      )
                    );

                    setDebugOpened(false);

                    appEvents.publish({
                      type: AppEvents.alertInfo.name,
                      payload: ['Debug info copied to clipboard'],
                    });
                  } catch (err) {
                    appEvents.publish({
                      type: AppEvents.alertError.name,
                      payload: ['Debug info could not be copied to clipboard'],
                    });
                  }
                }}
                icon="copy"
              >
                Copy
              </Button>
            </Modal.ButtonRow>
          </Modal>
        )}
        <IconButton
          name={codeOverflow === 'scroll' ? 'wrap-text' : 'bars'}
          tooltip={codeOverflowText}
          aria-label={codeOverflowText}
          onClick={() => model.toggleCodeOverflow()}
        />
        <IconButton
          name={showTools ? 'wrench' : 'eye-slash'}
          tooltip={showToolsText}
          aria-label={showToolsText}
          onClick={() => model.toggleShowTools()}
        />
        <IconButton
          name={mode === 'floating' ? 'columns' : 'layer-group'}
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
  debugModalOriginalContent: css({
    display: 'grid',
    gridTemplateColumns: '100%',
    gridTemplateRows: `calc(100% - ${theme.spacing(7)}) auto`,
  }),
  debugModalContent: css({
    label: 'debug-modal-content',
    display: 'flex',
    height: '100%',
    flexDirection: 'column',
    gap: theme.spacing(1),
  }),
  debugModalContentHeader: css({
    label: 'debug-modal-content-header',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: theme.spacing(1),
  }),
  debugModalContentJson: css({
    label: 'debug-modal-content-json',
    overflow: 'auto',
    whiteSpace: 'break-spaces',
    wordBreak: 'unset',
  }),
  debugModalContentJsonLarge: css({
    label: 'debug-modal-content-json',
    flex: 1,
  }),
  micButton: css({
    label: 'mic-button',
    borderRight: `1px solid ${theme.colors.border.weak}`,
    marginRight: theme.spacing(1),
    paddingRight: theme.spacing(1),
  }),
  rightBorder: css({
    borderRight: `1px solid ${theme.colors.border.weak}`,
    marginRight: theme.spacing(1),
    paddingRight: theme.spacing(1),
  }),
  micActive: css({
    label: 'mic-active',
    '&:before': {
      content: '""',
      position: 'absolute',
      top: '-4px',
      left: '-4px',
      right: '0px',
      bottom: '0px',
      border: `2px solid ${theme.colors.warning.border}`,
      borderRadius: '50%',
      animation: 'pulse 2s infinite',
    },
    '@keyframes pulse': {
      '0%': {
        transform: 'scale(1)',
        opacity: 1,
      },
      '50%': {
        transform: 'scale(1.1)',
        opacity: 0.8,
      },
      '100%': {
        transform: 'scale(1)',
        opacity: 1,
      },
    },
  }),
});
