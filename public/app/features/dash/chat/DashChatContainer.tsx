import { css } from '@emotion/css';

import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { TabContent, useStyles2 } from '@grafana/ui';

import { DashChat } from './DashChat';
import { DashInput } from './DashInput';
import { DashMessages } from './DashMessages';

export interface DashChatContainerState extends SceneObjectState {
  name: string;
  versions: DashChat[];
  currentVersion: number;
}

export class DashChatContainer extends SceneObjectBase<DashChatContainerState> {
  public static Component = DashChatContainerRenderer;

  public constructor(state: Pick<DashChatContainerState, 'name'>) {
    super({
      ...state,
      versions: [new DashChat({})],
      currentVersion: 0,
    });
  }

  public setCurrentVersion(chat: DashChat) {
    this.setState({ currentVersion: this.state.versions.indexOf(chat) });
  }

  public setName(name: string) {
    this.setState({ name });
  }

  public cloneChat(chat: DashChat) {
    const { messages, langchainMessages } = chat.state.messages.state;

    const [selectedMessage, selectedMessageIndex] = chat.state.messages.findSelectedMessage();
    const langchainMessageIndex = langchainMessages.findIndex((message) => message.id === selectedMessage?.state.key);

    const newLangchainMessages = langchainMessages.slice(0, langchainMessageIndex);
    const newMessages = messages.slice(0, selectedMessageIndex).map((message) => message.clone());

    this.setState({
      versions: [
        ...this.state.versions,
        new DashChat({
          input: new DashInput({ message: String(selectedMessage?.state.content!) }),
          messages: new DashMessages({ messages: newMessages, langchainMessages: newLangchainMessages }),
        }),
      ],
      currentVersion: this.state.versions.length,
    });
  }
}

function DashChatContainerRenderer({ model }: SceneComponentProps<DashChatContainer>) {
  const styles = useStyles2(getStyles);
  const { versions, currentVersion } = model.useState();
  const chat = versions[currentVersion];

  return (
    <TabContent className={styles.top}>
      <chat.Component model={chat} />
    </TabContent>
  );
}

const getStyles = () => ({
  top: css({
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    flex: 1,
  }),
});
