import { css, keyframes } from '@emotion/css';
import { MessageContent } from '@langchain/core/messages';
import { useEffect, useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObject, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { Icon } from './Icon';
import { Image } from './Image';
import { Loader } from './Loader';
import { Text } from './Text';
import { Tool, ToolState } from './Tool';

export interface DashMessageState extends SceneObjectState {
  children: SceneObject[];
  icon: Icon;
  content: MessageContent;
  indicator?: boolean;
  sender: 'user' | 'ai' | 'system';
  time: string;
  timestamp: Date;
  selected: boolean;
}

export class DashMessage extends SceneObjectBase<DashMessageState> {
  public static Component = DashMessageRenderer;

  public constructor(
    state: Omit<DashMessageState, 'children' | 'icon' | 'indicator' | 'selected' | 'time'> &
      Partial<Pick<DashMessageState, 'indicator' | 'selected'>>
  ) {
    const children = state.indicator
      ? [new Loader({})]
      : typeof state.content === 'string'
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
      icon: new Icon({}),
      indicator: false,
      selected: false,
      time: state.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
  const { children, icon, sender, selected } = model.useState();
  const styles = useStyles2(getStyles, sender);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selected]);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.messages}>
        {children.map((child) => (
          <child.Component model={child} key={child.state.key} />
        ))}
      </div>
      <icon.Component model={icon} />
    </div>
  );
}

const fadeIn = keyframes({
  '0%': {
    opacity: 0,
    transform: 'translateY(10px)',
  },
  '100%': {
    opacity: 1,
    transform: 'translateY(0)',
  },
});

const getStyles = (theme: GrafanaTheme2, sender: DashMessageState['sender']) => ({
  container: css({
    display: 'flex',
    flexDirection: sender === 'ai' ? 'row-reverse' : 'row',
    alignItems: 'flex-end',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1.5),

    '&:first-child': {
      marginTop: 0,
    },

    [theme.transitions.handleMotion('no-preference', 'reduce')]: {
      animationName: fadeIn,
      animationDuration: '0.3s',
      animationTimingFunction: 'ease-in-out',
      transition: 'all 0.2s ease',
    },
  }),
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
