import { css } from '@emotion/css';
import { mapStoredMessagesToChatMessages } from '@langchain/core/messages';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { Dropdown, Icon, IconButton, Menu, Tab, TabsBar, useStyles2 } from '@grafana/ui';

import { makeSingleRequest } from '../agent/singleRequest';
import { getCurrentContext } from '../agent/tools/context';

import { DashChat } from './DashChat';
import { DashChatInstance } from './DashChatInstance';
import { DashMessage } from './DashMessage';
import { DashMessages } from './DashMessages';
import { DashSettings } from './DashSettings';
import { Mode, SerializedDash } from './types';
import { getPersistedSetting, persistSetting } from './utils';

interface DashState extends SceneObjectState {
  chats: DashChat[];
  chatIndex: number;
  opened: boolean;
  settings: DashSettings;
}

export class Dash extends SceneObjectBase<DashState> {
  public static Component = DashRenderer;

  private _chatNumber = 2;

  public get renderBeforeActivation(): boolean {
    return true;
  }

  public constructor() {
    let chats: DashChat[] = [];
    let chatIndex: number | undefined;
    let chatNumber: number | undefined;

    try {
      const settings = getPersistedSetting('state') ?? '';

      if (settings) {
        const parsedSettings = JSON.parse(settings) as SerializedDash;
        chats = parsedSettings.chats.map(
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

        chatIndex = parsedSettings.chatIndex;
        chatNumber = parsedSettings.chatNumber;
      }
    } catch (err) {}

    if (chats.length === 0) {
      chats = [new DashChat({ name: 'Chat 1' })];
    }

    super({
      chats,
      chatIndex: chatIndex !== undefined && chats[chatIndex] ? chatIndex : chats.length - 1,
      opened: getPersistedSetting('opened') === 'true',
      settings: new DashSettings(),
    });

    this._chatNumber = chatNumber ?? 2;

    this.activate();
    this.state.settings.activate();

    // Generate welcome message for the initial chat
    const messages = this.state.chats[0]?.state.versions[0]?.state.messages;
    this.generateWelcomeMessage(messages).then((welcomeMessage) => {
      if (messages) {
        messages.addSystemMessage(welcomeMessage);
      }
    });
  }

  private async generateWelcomeMessage(messages?: any): Promise<string> {
    try {
      if (!messages) {
        return "Hello! I'm your Grafana AI agent. How can I help you today?";
      }

      messages.setGeneratingWelcome(true);
      const context = getCurrentContext();
      let contextPrompt = `You are a helpful AI agent for Grafana. The user is currently on the "${context.page.title}" page${context.app.description ? ` (${context.app.description})` : ''}. `;
      if (context.time_range) {
        contextPrompt += `The selected time range is ${context.time_range.text}. `;
      }
      if (context.datasource.type !== 'Unknown') {
        contextPrompt += `The current data source type is ${context.datasource.type}. `;
      }
      if (context.query.expression) {
        contextPrompt += `The current query is \`${context.query.expression}\`. `;
      }
      contextPrompt +=
        'Generate a concise overview message using as few words as possible, that introduces yourself as an "agent" (never assistant) and includes what the current page is about. Do not personify yourself. Ask them what they want to know and where they want to go. Do not use titles.';

      const welcomeMessage = await makeSingleRequest({
        systemPrompt: contextPrompt,
        userMessage: 'Generate a welcome message',
      });
      console.log('Generated welcome message:', welcomeMessage);
      return welcomeMessage;
    } catch (error) {
      console.error('Error generating welcome message:', error);
      return "Hello! I'm your Grafana AI agent. How can I help you today?";
    } finally {
      if (messages) {
        messages.setGeneratingWelcome(false);
      }
    }
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
    const messages = newChat.state.versions[0]?.state.messages;

    // Add the new chat and switch to it immediately
    this.setState({ chats: [...this.state.chats, newChat], chatIndex: newChatIndex });
    this.persist();

    // Generate welcome message in the background
    const welcomeMessage = await this.generateWelcomeMessage(messages);
    messages.addSystemMessage(welcomeMessage);
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

  public persist() {
    persistSetting('state', JSON.stringify(this.toJSON()));
  }

  public toJSON(): SerializedDash {
    return {
      chats: this.state.chats.map((chat) => chat.toJSON()),
      chatIndex: this.state.chatIndex,
      chatNumber: this._chatNumber,
    };
  }
}

function DashRenderer({ model }: SceneComponentProps<Dash>) {
  const { chatIndex, settings, chats } = model.useState();
  const { mode } = settings.useState();
  const chat = chats[chatIndex]!;
  const { versions } = chat.useState();
  const styles = useStyles2(getStyles, mode, versions.length > 1);

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
