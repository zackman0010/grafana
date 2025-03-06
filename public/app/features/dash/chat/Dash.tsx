import { css } from '@emotion/css';
import { mapStoredMessagesToChatMessages } from '@langchain/core/messages';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { Dropdown, Icon, IconButton, Menu, useStyles2 } from '@grafana/ui';

import { DashChat } from './DashChat';
import { DashChatInstance } from './DashChatInstance';
import { DashMessage } from './DashMessage';
import { DashMessages } from './DashMessages';
import { DashSettings } from './DashSettings';
import { DashStorage } from './DashStorage';
import { Mode } from './types';

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
      opened: false,
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
        let opened: boolean | undefined;

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
            opened = dash.opened;
          }
        } catch (err) {}

        if (chats.length === 0) {
          chats = [new DashChat({ name: 'Chat 1' })];
        }

        this._chatNumber = chatNumber ?? 2;

        this.setState({
          chats,
          chatIndex: chatIndex !== undefined && chats[chatIndex] ? chatIndex : chats.length - 1,
          opened: opened ?? false,
        });
      }),
    ]).finally(() => this.setState({ initializing: false }));
  }

  public setOpened(opened: boolean) {
    if (opened !== this.state.opened) {
      this.setState({ opened });
      this.persist();
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

  public clearChats() {
    this.setState({
      chats: this.state.chats.filter((_chat, index) => index === this.state.chatIndex),
      chatIndex: 0,
    });
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
        opened: this.state.opened,
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
  const { name, versions, versionIndex } = chat.useState();
  const styles = useStyles2(getStyles, mode, versions.length > 1);

  if (initializing) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.chatTitle}>
          <Dropdown
            overlay={
              <Menu className={styles.chatMenu}>
                {chats
                  .map((chat, index) =>
                    index === chatIndex ? null : (
                      <div key={chat.state.key} className={styles.chatMenuItem}>
                        <div className={styles.chatMenuItemText} onClick={() => model.setCurrentChat(index)}>
                          {chat.state.name}
                        </div>
                        <Icon
                          name="times"
                          className={styles.removeChatIcon}
                          onClick={(e) => {
                            e.stopPropagation();
                            model.removeChat(index);
                          }}
                        />
                      </div>
                    )
                  )
                  .reverse()}

                <Menu.Divider />

                {chats.length > 1 && <Menu.Item icon="times" label="Clear all" onClick={() => model.clearChats()} />}
              </Menu>
            }
            placement="bottom-start"
          >
            <div className={styles.titleContent}>
              <span className={styles.sparkle}>✨</span> {name}
              <Icon name="angle-down" className={styles.titleCaret} />
            </div>
          </Dropdown>
        </div>
        <div className={styles.actions}>
          <IconButton name="plus" aria-label="Add chat" onClick={() => model.addChat()} />

          {versions.length > 1 && (
            <Dropdown
              overlay={
                <Menu>
                  {versions
                    .map((version, index) => (
                      <Menu.Item
                        key={version.state.key}
                        disabled={index === versionIndex}
                        icon={index === versionIndex ? 'arrow-right' : 'history-alt'}
                        label={version.state.timestamp.toLocaleString()}
                        onClick={() => chat.setVersionIndex(version)}
                      />
                    ))
                    .reverse()}
                  <Menu.Divider />
                  <Menu.Item label="Clear all" destructive onClick={() => chat.clearHistory()} />
                </Menu>
              }
            >
              <IconButton name="history" aria-label="Previous versions" />
            </Dropdown>
          )}
        </div>
      </div>

      <chat.Component model={chat} />

      <div className={styles.bottomBar}>
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
  topBar: css({
    label: 'dash-top-bar',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    padding: theme.spacing(1),
    backgroundColor: theme.colors.background.canvas,

    '&:hover': {
      overflow: 'auto',
    },
  }),
  chatTitle: css({
    label: 'dash-chat-title',
    flex: 1,
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    fontWeight: theme.typography.fontWeightBold,
    display: 'flex',
    alignItems: 'center',
  }),
  titleContent: css({
    label: 'dash-title-content',
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    cursor: 'pointer',
    '&:hover': {
      opacity: 0.8,
    },
  }),
  sparkle: css({
    label: 'dash-sparkle',
    filter: 'grayscale(100%)',
  }),
  actions: css({
    label: 'dash-actions',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing(1),
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
  titleCaret: css({
    label: 'dash-title-caret',
    fontSize: '14px',
    opacity: 0.7,
    marginLeft: theme.spacing(0.5),
  }),
  chatMenu: css({
    label: 'dash-chat-menu',
    minWidth: '200px',
    backgroundColor: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.weak}`,
  }),
  chatMenuItem: css({
    label: 'dash-chat-menu-item',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1),
    '&:hover': {
      backgroundColor: theme.colors.action.hover,
      '& [class*="remove-chat-icon"]': {
        opacity: 0.7,
      },
    },
  }),
  chatMenuItemText: css({
    label: 'dash-chat-menu-item-text',
    flex: 1,
    cursor: 'pointer',
    padding: theme.spacing(0.5),
    margin: theme.spacing(-0.5),
  }),
  removeChatIcon: css({
    label: 'dash-remove-chat-icon',
    cursor: 'pointer',
    opacity: 0,
    padding: theme.spacing(0.5),
    fontSize: '20px',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s ease',
    '&:hover': {
      opacity: 1,
    },
  }),
});

export const dash = new Dash();
