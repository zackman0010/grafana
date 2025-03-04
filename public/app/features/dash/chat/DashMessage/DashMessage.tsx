import { css } from '@emotion/css';
import { MessageContent } from '@langchain/core/messages';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObject, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { Image } from './Image';
import { MessageContainer } from './MessageContainer';
import { Text } from './Text';
import { Tool, ToolState } from './Tool';

export interface DashMessageState extends SceneObjectState {
  children: SceneObject[];
  content: MessageContent;
  sender: 'user' | 'ai' | 'system' | 'tool_notification';
  time: string;
  selected: boolean;
  muted?: boolean;
  isError?: boolean;
}

export class DashMessage extends SceneObjectBase<DashMessageState> {
  public static Component = DashMessageRenderer;

  public constructor(
    state: Omit<DashMessageState, 'children' | 'icon' | 'selected' | 'time'> &
      Partial<Pick<DashMessageState, 'selected' | 'muted' | 'isError'>>
  ) {
    const children =
      typeof state.content === 'string'
        ? [new Text({ content: state.content, muted: state.muted })]
        : state.content.reduce<SceneObject[]>((acc, currentContent) => {
            switch (currentContent.type) {
              case 'text':
                return [...acc, new Text({ content: currentContent.text, muted: state.muted })];

              case 'tool_use':
                return [...acc, new Tool({ content: currentContent as ToolState['content'] })];

              case 'image_url':
                return [...acc, new Image({ url: currentContent.image_url })];

              default:
                return acc;
            }
          }, []);

    super({
      children,
      selected: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isError: false,
      ...state,
    });
  }

  public setSelected(selected: boolean) {
    if (selected !== this.state.selected) {
      this.setState({ selected });
    }
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

const getStyles = (theme: GrafanaTheme2, sender: DashMessageState['sender'], isError?: boolean) => ({
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
