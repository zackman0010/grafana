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
    const initialTitle = 'New chat'; // Temporary title before we can call this._generateTimeBasedTitle()
    super({
      chats: [new DashChat({ name: initialTitle })],
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
                  nameGenerated: chat.nameGenerated,
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
          chats = [new DashChat({ name: this._generateTimeBasedTitle() })];
        }

        this._chatNumber = chatNumber ?? 2;

        this.setState({
          chats,
          chatIndex: chatIndex !== undefined && chats[chatIndex] ? chatIndex : chats.length - 1,
          opened: opened ?? false,
        });
      }),
    ]).finally(() => {
      this.setState({ initializing: false });
      // Now we can safely use this to generate and set the proper title
      this.state.chats[0].setName(this._generateTimeBasedTitle(), false);
    });
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

  private _generateTimeBasedTitle(): string {
    const now = new Date();
    const hour = now.getHours();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[now.getDay()];

    if (hour === 23 || hour === 0) {
      return 'Midnight chat';
    }

    let timeOfDay = '';
    if (hour >= 2 && hour < 12) {
      timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 17) {
      timeOfDay = 'afternoon';
    } else {
      timeOfDay = 'evening';
    }

    const titles = ['chat', 'discussion', 'conversation'];
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];

    return `${dayName} ${timeOfDay} ${randomTitle}`;
  }

  public async addChat() {
    const newChat = new DashChat({ name: this._generateTimeBasedTitle() });
    const newChatIndex = this.state.chats.length;
    this.setState({ chats: [...this.state.chats, newChat], chatIndex: newChatIndex });
    this.persist();
  }

  public removeChat(index: number) {
    if (this.state.chats.length === 1) {
      this.setState({ chats: [new DashChat({ name: this._generateTimeBasedTitle() })], chatIndex: 0 });
      this.persist();
      return;
    }

    const chats = [...this.state.chats];
    chats.splice(index, 1);
    this.setState({ chats: chats, chatIndex: index === 0 ? 0 : index - 1 });
    this.persist();
  }

  public clearChats() {
    const newChat = new DashChat({ name: this._generateTimeBasedTitle() });
    this.setState({
      chats: [newChat],
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
                {chats.length > 1 ? (
                  <>
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
                    <Menu.Item icon="times" label="Clear all" onClick={() => model.clearChats()} />
                  </>
                ) : (
                  <Menu.Item disabled label="No chat history yet" />
                )}
              </Menu>
            }
            placement="bottom-start"
          >
            <div className={styles.titleContent}>
              <div className={styles.dashText}>DASH</div>
              <div className={styles.titleEllipsis}>{name}</div>
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
    gap: theme.spacing(2),
  }),
  dashText: css({
    label: 'dash-text',
    writingMode: 'vertical-lr',
    transform: 'rotate(180deg)',
    fontSize: '7px',
    color: theme.colors.text.primary,
    letterSpacing: '0.1em',
    margin: 0,
    textShadow: '0 0 2px rgba(155, 89, 182, 0.3)',
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
  titleEllipsis: css({
    maxWidth: '16vw',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
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
    '&:focus': {
      outline: 'none',
      border: `1px solid ${theme.colors.border.weak}`,
    },
    '& [class*="menu-item"]': {
      '&[class*="disabled"]': {
        color: theme.colors.text.secondary,
      },
    },
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
    '@media (prefers-reduced-motion: no-preference)': {
      transition: 'opacity 0.2s ease',
    },
    '&:hover': {
      opacity: 1,
    },
  }),
});

export const dash = new Dash();
