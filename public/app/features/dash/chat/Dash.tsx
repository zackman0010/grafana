import { css } from '@emotion/css';
import { mapStoredMessagesToChatMessages } from '@langchain/core/messages';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { Dropdown, Icon, IconButton, Menu, Tab, TabsBar, useStyles2 } from '@grafana/ui';

import { DashChat } from './DashChat';
import { DashChatInstance } from './DashChatInstance';
import { DashMessage } from './DashMessage';
import { DashMessages } from './DashMessages';
import { DashSettings } from './DashSettings';
import { DashStorage } from './DashStorage';
import { Mode } from './types';
import { getPersistedSetting, persistSetting } from './utils';

interface DashState extends SceneObjectState {
  chats: DashChat[];
  chatIndex: number;
  initializing: boolean;
  opened: boolean;
  settings: DashSettings;
}

export class Dash extends SceneObjectBase<DashState> {
  public static Component = DashRenderer;

  private _chatNumber = 2;
  private _savingPromise: Promise<void> | undefined;

  public get renderBeforeActivation(): boolean {
    return true;
  }

  public constructor() {
    super({
      chats: [new DashChat({ name: 'Chat 1' })],
      chatIndex: 0,
      initializing: true,
      opened: getPersistedSetting('opened') === 'true',
      settings: new DashSettings(),
    });

    this.addActivationHandler(() => this._activationHandler());

    this.activate();
    this.state.settings.activate();
  }

  private _activationHandler() {
    Promise.all([
      DashStorage.instance.getSettings().then((settings) => this.state.settings.setState(settings)),
      DashStorage.instance.getChat().then((dash) => {
        let chats: DashChat[] = [];
        let chatIndex: number | undefined;
        let chatNumber: number | undefined;

        try {
          if (dash) {
            chats = dash.chats.map(
              (chat) =>
                new DashChat({
                  name: chat.name,
                  versionIndex: chat.versionIndex,
                  versions: chat.versions.map(
                    (instance) =>
                      new DashChatInstance({
                        timestamp: new Date(instance.timestamp),
                        messages: new DashMessages({
                          messages: instance.messages.messages.map(
                            (message) =>
                              new DashMessage({
                                content: message.content,
                                sender: message.sender,
                              })
                          ),
                          langchainMessages: mapStoredMessagesToChatMessages(instance.messages.langchainMessages),
                        }),
                      })
                  ),
                })
            );

            chatIndex = dash.chatIndex;
            chatNumber = dash.chatNumber;
          }
        } catch (err) {}

        if (chats.length === 0) {
          chats = [new DashChat({ name: 'Chat 1' })];
        }

        this._chatNumber = chatNumber ?? 2;

        this.setState({
          chats,
          chatIndex: chatIndex !== undefined && chats[chatIndex] ? chatIndex : chats.length - 1,
        });
      }),
    ]).finally(() => this.setState({ initializing: false }));
  }

  public setOpened(opened: boolean) {
    if (opened !== this.state.opened) {
      this.setState({ opened });
      persistSetting('opened', String(opened));
    }
  }

  public setCurrentChat(index: number) {
    if (index !== this.state.chatIndex) {
      this.state.chats[this.state.chatIndex].state.versions.forEach((chat) =>
        chat.state.messages.exitSelectMode(false)
      );
      this.setState({ chatIndex: index });
      this.persist();
    }
  }

  public async addChat() {
    const newChat = new DashChat({ name: `Chat ${this._chatNumber++}` });
    const newChatIndex = this.state.chats.length;
    this.setState({ chats: [...this.state.chats, newChat], chatIndex: newChatIndex });
    this.persist();
  }

  public removeChat(index: number) {
    if (this.state.chats.length === 1) {
      this.setState({ chats: [new DashChat({ name: `Chat ${this._chatNumber++}` })], chatIndex: 0 });
      this.persist();
      return;
    }

    const chats = [...this.state.chats];
    chats.splice(index, 1);
    this.setState({ chats: chats, chatIndex: index === 0 ? 0 : index - 1 });
    this.persist();
  }

  public async persist() {
    if (this._savingPromise) {
      await this._savingPromise;
    }

    DashStorage.instance
      .setChat({
        chats: this.state.chats.map((chat) => chat.toJSON()),
        chatIndex: this.state.chatIndex,
        chatNumber: this._chatNumber,
      })
      .finally(() => {
        this._savingPromise = undefined;
      });
  }
}

function DashRenderer({ model }: SceneComponentProps<Dash>) {
  const { chatIndex, initializing, settings, chats } = model.useState();
  const { mode } = settings.useState();
  const chat = chats[chatIndex]!;
  const { versions } = chat.useState();
  const styles = useStyles2(getStyles, mode, versions.length > 1);

  if (initializing) {
    return null;
  }

  return (
    <div className={styles.container}>
      <TabsBar className={styles.tabs}>
        {chats.map((chat, index) => (
          <Tab
            key={chat.state.key}
            title={chat.state.name}
            label={chat.state.name}
            active={chatIndex === index}
            className={styles.tab}
            suffix={
              chatIndex === index
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

      <chat.Component model={chat} />

      <div className={styles.bottomBar}>
        {versions.length > 1 && (
          <Dropdown
            overlay={
              <Menu>
                {versions.map((version) => (
                  <Menu.Item
                    key={version.state.key}
                    label={version.state.timestamp.toLocaleString()}
                    onClick={() => chat.setVersionIndex(version)}
                  />
                ))}
                <Menu.Divider />
                <Menu.Item label="Clear history" onClick={() => chat.clearHistory()} />
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

const getStyles = (theme: GrafanaTheme2, mode: Mode, withVersions: boolean) => ({
  container: css({
    label: 'dash-container',
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
    label: 'dash-tabs',
    overflow: 'hidden',

    '&:hover': {
      overflow: 'auto',
    },
  }),
  tab: css({
    label: 'dash-tab',

    '& > button': {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing(1.5),
    },
  }),
  bottomBar: css({
    label: 'dash-bottom-bar',
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
