import { css } from '@emotion/css';

import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { DashChatInstance } from './DashChatInstance';
import { DashInput } from './DashInput';
import { DashMessages } from './DashMessages';
import { SerializedDashChat } from './types';
import { getDash } from './utils';

interface DashChatState extends SceneObjectState {
  name: string;
  nameGenerated: boolean;
  versions: DashChatInstance[];
  versionIndex: number;
}

export class DashChat extends SceneObjectBase<DashChatState> {
  public static Component = DashChatRenderer;

  public constructor(
    state: Pick<DashChatState, 'name'> & Partial<Pick<DashChatState, 'versionIndex' | 'versions' | 'nameGenerated'>>
  ) {
    const versions = state.versions?.length ? state.versions : [new DashChatInstance({})];

    super({
      ...state,
      nameGenerated: state.nameGenerated ?? false,
      versions,
      versionIndex:
        state.versionIndex !== undefined && versions[state.versionIndex] ? state.versionIndex : versions.length - 1,
    });
  }

  public setVersionIndex(chat: DashChatInstance) {
    this.setState({ versionIndex: this.state.versions.indexOf(chat) });
    getDash(this).persist();
  }

  public setName(name: string, isGenerated?: boolean) {
    const payload: Partial<DashChatState> = {};

    if (name !== this.state.name) {
      payload.name = name;
    }

    if (isGenerated !== undefined && isGenerated !== this.state.nameGenerated) {
      payload.nameGenerated = isGenerated;
    }

    if (Object.keys(payload).length > 0) {
      this.setState(payload);
      getDash(this).persist();
    }
  }

  public cloneChat(chat: DashChatInstance) {
    const { messages: currentMessages, langchainMessages } = chat.state.messages.state;

    const [selectedMessage, selectedMessageIndex] = chat.state.messages.findSelectedMessage();
    const langchainMessageIndex = langchainMessages.findIndex((message) => message.id === selectedMessage?.state.key);

    const input = new DashInput({
      message: selectedMessage?.state.editedMessage ?? String(selectedMessage?.state.content!),
    });

    const messages = new DashMessages({
      messages: currentMessages.slice(0, selectedMessageIndex).map((message) => message.clone()),
      langchainMessages: langchainMessages.slice(0, langchainMessageIndex),
    });

    const newChat = new DashChatInstance({ input, messages });
    this.setState({
      versions: [...this.state.versions, newChat],
      versionIndex: this.state.versions.length,
    });
    newChat.activate();
    messages.activate();
    input.activate();
    input.sendMessage();
    getDash(this).persist();
  }

  public clearHistory() {
    this.setState({
      versions: this.state.versions.filter((_version, index) => index === this.state.versionIndex),
      versionIndex: 0,
    });
    getDash(this).persist();
  }

  public toJSON(): SerializedDashChat {
    return {
      name: this.state.name,
      nameGenerated: this.state.nameGenerated,
      versions: this.state.versions.map((chat) => chat.toJSON()),
      versionIndex: this.state.versionIndex,
    };
  }
}

function DashChatRenderer({ model }: SceneComponentProps<DashChat>) {
  const styles = useStyles2(getStyles);
  const { versions, versionIndex } = model.useState();
  const chat = versions[versionIndex];

  return (
    <div className={styles.container}>
      <chat.Component model={chat} />
    </div>
  );
}

const getStyles = () => ({
  container: css({
    label: 'dash-chat-container',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    flex: 1,
  }),
});
