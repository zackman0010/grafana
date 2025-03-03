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
  sender: 'user' | 'ai' | 'system';
  time: string;
  selected: boolean;
}

export class DashMessage extends SceneObjectBase<DashMessageState> {
  public static Component = DashMessageRenderer;

  public constructor(
    state: Omit<DashMessageState, 'children' | 'icon' | 'selected' | 'time'> &
      Partial<Pick<DashMessageState, 'selected'>>
  ) {
    const children =
      typeof state.content === 'string'
        ? [new Text({ content: state.content })]
        : state.content.reduce<SceneObject[]>((acc, currentContent) => {
            switch (currentContent.type) {
              case 'text':
                return [...acc, new Text({ content: currentContent.text })];

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
  const { children, sender, selected } = model.useState();
  const styles = useStyles2(getStyles, sender);

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

const getStyles = (theme: GrafanaTheme2, sender: DashMessageState['sender']) => ({
  messages: css({
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    alignItems: sender === 'user' ? 'flex-end' : sender === 'ai' ? 'flex-start' : 'center',
    width: '100%',
    minWidth: 0,
    gap: theme.spacing(1),
  }),
});
