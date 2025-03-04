import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { Dropdown, Icon, IconButton, Menu, MenuItem, Tab, TabsBar, useStyles2 } from '@grafana/ui';

import { DashChatContainer } from './DashChatContainer';
import { DashSettings, DashSettingsState } from './DashSettings';
import { getPersistedSetting, persistSetting } from './utils';

export interface DashState extends SceneObjectState {
  chatContainers: DashChatContainer[];
  currentChatContainer: number;
  settings: DashSettings;
  opened: boolean;
}

export class Dash extends SceneObjectBase<DashState> {
  public static Component = DashRenderer;

  private _chatName = 2;

  public get renderBeforeActivation(): boolean {
    return true;
  }

  public constructor() {
    super({
      currentChatContainer: 0,
      settings: new DashSettings(),
      chatContainers: [new DashChatContainer({ name: 'Chat 1' })],
      opened: getPersistedSetting('opened') === 'true' ? true : false,
    });

    this.activate();
    this.state.settings.activate();
  }

  public setOpened(opened: boolean) {
    if (opened !== this.state.opened) {
      this.setState({ opened });
      persistSetting('opened', String(opened));
    }
  }

  public setCurrentChat(index: number) {
    if (index !== this.state.currentChatContainer) {
      this.state.chatContainers[this.state.currentChatContainer].state.versions.forEach((chat) =>
        chat.state.messages.exitSelectMode(false)
      );
      this.setState({ currentChatContainer: index });
    }
  }

  public addChat() {
    this.setState({
      chatContainers: [...this.state.chatContainers, new DashChatContainer({ name: `Chat ${this._chatName++}` })],
      currentChatContainer: this.state.chatContainers.length,
    });
  }

  public removeChat(index: number) {
    if (this.state.chatContainers.length === 1) {
      this.setState({
        chatContainers: [new DashChatContainer({ name: `Chat ${this._chatName++}` })],
        currentChatContainer: 0,
      });
      return;
    }

    const chats = [...this.state.chatContainers];
    chats.splice(index, 1);
    this.setState({ chatContainers: chats, currentChatContainer: index === 0 ? 0 : index - 1 });
  }
}

function DashRenderer({ model }: SceneComponentProps<Dash>) {
  const { currentChatContainer, settings, chatContainers } = model.useState();
  const { mode } = settings.useState();
  const chatContainer = chatContainers[currentChatContainer]!;
  const { versions } = chatContainer.useState();
  const styles = useStyles2(getStyles, mode, versions.length > 1);

  return (
    <div className={styles.container}>
      <TabsBar className={styles.tabs}>
        {chatContainers.map((chat, index) => (
          <Tab
            key={chat.state.key}
            title={chat.state.name}
            label={chat.state.name}
            active={currentChatContainer === index}
            className={styles.tab}
            suffix={
              currentChatContainer === index
                ? () => (
                    <Icon
                      name="times"
                      aria-label="Remove"
                      onClick={(evt) => {
                        evt.preventDefault();
                        evt.stopPropagation();
                        model.removeChat(index);
                      }}
                    />
                  )
                : undefined
            }
            onChangeTab={(evt) => {
              evt.preventDefault();
              model.setCurrentChat(index);
            }}
          />
        ))}
        <Tab
          icon="plus"
          label=""
          onChangeTab={(evt) => {
            evt.preventDefault();
            model.addChat();
          }}
        />
      </TabsBar>
      <chatContainer.Component model={chatContainer} />
      <div className={styles.bottomBar}>
        {versions.length > 1 && (
          <Dropdown
            overlay={
              <Menu>
                {versions.map((version, index) => (
                  <MenuItem
                    key={version.state.key}
                    label={version.state.timestamp.toLocaleString()}
                    onClick={() => chatContainer.setCurrentVersion(version)}
                  />
                ))}
              </Menu>
            }
          >
            <IconButton name="history" aria-label="Previous versions" />
          </Dropdown>
        )}
        <settings.Component model={settings} />
      </div>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2, mode: DashSettingsState['mode'], withVersions: boolean) => ({
  container: css({
    height: '100%',
    width: '100%',
    backgroundColor: theme.colors.background.primary,
    borderRadius: mode === 'floating' ? theme.shape.radius.default : '0',
    boxShadow: mode === 'floating' ? '0 8px 30px rgba(0, 0, 0, 0.3)' : 'none',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: `1px solid ${theme.colors.border.weak}`,
    ...(mode === 'sidebar' && {
      borderTop: 'none',
      borderBottom: 'none',
    }),
  }),
  tabs: css({
    overflow: 'hidden',

    '&:hover': {
      overflow: 'auto',
    },
  }),
  tab: css({
    '& > button': {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing(1.5),
    },
  }),
  bottomBar: css({
    backgroundColor: theme.colors.background.canvas,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: withVersions ? 'space-between' : 'flex-end',
    gap: theme.spacing(1),
    padding: theme.spacing(1),
  }),
});

export const dash = new Dash();
