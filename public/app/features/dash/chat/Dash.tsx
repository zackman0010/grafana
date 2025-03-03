import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { Icon, Tab, TabsBar, useStyles2 } from '@grafana/ui';

import { DashChat } from './DashChat';
import { DashSettings, DashSettingsState } from './DashSettings';
import { getPersistedSetting, persistSetting } from './utils';

export interface DashState extends SceneObjectState {
  chats: DashChat[];
  currentChat: number;
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
      currentChat: 0,
      settings: new DashSettings(),
      chats: [new DashChat({ name: 'Chat 1' })],
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
    if (index !== this.state.currentChat) {
      this.state.chats[this.state.currentChat].state.messages.exitSelectMode(false);
      this.setState({ currentChat: index });
    }
  }

  public addChat() {
    this.setState({
      chats: [...this.state.chats, new DashChat({ name: `Chat ${this._chatName++}` })],
      currentChat: this.state.chats.length,
    });
  }

  public removeChat(index: number) {
    if (this.state.chats.length === 1) {
      this.setState({ chats: [new DashChat({ name: `Chat ${this._chatName++}` })], currentChat: 0 });
      return;
    }

    const chats = [...this.state.chats];
    chats.splice(index, 1);
    this.setState({ chats, currentChat: index === 0 ? 0 : index - 1 });
  }
}

function DashRenderer({ model }: SceneComponentProps<Dash>) {
  const { currentChat, settings, chats } = model.useState();
  const { mode } = settings.useState();
  const styles = useStyles2(getStyles, mode);
  const chat = chats[currentChat];

  return (
    <div className={styles.container}>
      <TabsBar className={styles.tabs}>
        {chats.map((chat, index) => (
          <Tab
            key={chat.state.key}
            title={chat.state.name}
            label={chat.state.name}
            active={currentChat === index}
            className={styles.tab}
            suffix={
              currentChat === index
                ? () => (
                    <Icon
                      name="trash-alt"
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
      {chat && <chat.Component model={chat} />}
      <settings.Component model={settings} />
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2, mode: DashSettingsState['mode']) => ({
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
});

export const dash = new Dash();
