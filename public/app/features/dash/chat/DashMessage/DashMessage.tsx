import { css } from '@emotion/css';
import { MessageContent } from '@langchain/core/messages';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObject, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { Sender, SerializedDashMessage, ToolContent } from '../types';

import { Image } from './Image';
import { MessageContainer } from './MessageContainer';
import { Text } from './Text';
import { Tool } from './Tool';

interface DashMessageState extends SceneObjectState {
  children: SceneObject[];
  content: MessageContent;
  editedMessage: string | undefined;
  editing: boolean;
  isError: boolean;
  muted: boolean;
  sender: Sender;
  selected: boolean;
}

export class DashMessage extends SceneObjectBase<DashMessageState> {
  public static Component = DashMessageRenderer;

  public constructor(
    state: Omit<
      DashMessageState,
      'children' | 'editedMessage' | 'editing' | 'icon' | 'selected' | 'muted' | 'isError'
    > &
      Partial<Pick<DashMessageState, 'selected' | 'muted' | 'isError'>>
  ) {
    const children =
      typeof state.content === 'string'
        ? [new Text({ content: state.content })]
        : state.content.reduce<SceneObject[]>((acc, currentContent) => {
            switch (currentContent.type) {
              case 'text':
                return [...acc, new Text({ content: currentContent.text })];

              case 'tool_use':
                return [...acc, new Tool({ content: currentContent as ToolContent })];

              case 'image_url':
                return [...acc, new Image({ url: currentContent.image_url })];

              default:
                return acc;
            }
          }, []);

    super({
      ...state,
      children,
      editedMessage: undefined,
      editing: false,
      selected: false,
      isError: state.isError ?? false,
      muted: state.muted ?? false,
    });
  }

  public setSelected(selected: boolean) {
    if (selected !== this.state.selected) {
      this.setState({ selected, editing: false, editedMessage: undefined });
    }
  }

  public setEditing(editing: boolean) {
    if (editing !== this.state.editing) {
      this.setState({ editing, editedMessage: editing ? String(this.state.content) : undefined });
    }
  }

  public updateEditedMessage(editedMessage: string) {
    this.setState({ editedMessage });
  }

  public setToolWorking(id: string | undefined, working: boolean) {
    if (!id) {
      return;
    }

    this.state.children.forEach((child) => {
      if (child instanceof Tool && child.state.content.id === id) {
        child.setWorking(working);
      }
    });
  }

  public hasWorkingTools(): boolean {
    return this.state.children.some((child) => child instanceof Tool && child.state.working);
  }

  public toJSON(): SerializedDashMessage {
    return {
      content: this.state.content,
      sender: this.state.sender,
    };
  }
}

function DashMessageRenderer({ model }: SceneComponentProps<DashMessage>) {
  const { children, sender, selected, isError } = model.useState();
  const styles = useStyles2(getStyles, sender, isError);

  return (
    <MessageContainer selected={selected} sender={sender}>
      <div className={styles.messages}>
        {children.map((child) => (
          <child.Component model={child} key={child.state.key} />
        ))}
      </div>
    </MessageContainer>
  );
}

const getStyles = (theme: GrafanaTheme2, sender: Sender, isError?: boolean) => ({
  messages: css({
    label: 'dash-message-messages',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    width: '100%',
    minWidth: 0,
    gap: theme.spacing(1),
    '& p': {
      margin: 0,
    },
    ...(sender === 'tool_notification' && {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.shape.radius.circle,
      padding: theme.spacing(1),
      border: `1px solid ${theme.colors.border.medium}`,
    }),
    ...(isError && {
      color: theme.colors.error.text,
      borderLeft: `3px solid ${theme.colors.error.border}`,
      '& p': {
        color: theme.colors.text.disabled,
        margin: 0,
        padding: 0,
      },
    }),
  }),
});
