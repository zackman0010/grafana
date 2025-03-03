import { css, keyframes } from '@emotion/css';
import { MessageContent, MessageContentComplex } from '@langchain/core/messages';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { getTagColor, Icon, useStyles2 } from '@grafana/ui';

import { getSettings } from '../utils';

import { Bubble } from './Bubble';
import { Image } from './Image';
import { Loader } from './Loader';
import { Text } from './Text';
import { Tool } from './Tool';

export interface DashMessageState extends SceneObjectState {
  content: MessageContent;
  indicator?: boolean;
  sender: 'user' | 'ai' | 'system';
  timestamp: Date;
  selected: boolean;
}

export class DashMessage extends SceneObjectBase<DashMessageState> {
  public static Component = DashMessageRenderer;

  public constructor(
    state: Omit<DashMessageState, 'indicator' | 'selected'> & Partial<Pick<DashMessageState, 'indicator' | 'selected'>>
  ) {
    super({ indicator: false, selected: false, ...state });
  }

  public setSelected(selected: boolean) {
    if (selected !== this.state.selected) {
      this.setState({ selected });
    }
  }
}

function DashMessageRenderer({ model }: SceneComponentProps<DashMessage>) {
  const { content, sender, timestamp, indicator, selected } = model.useState();
  const colors = useMemo(() => getTagColor(sender === 'user' ? 7 : sender === 'ai' ? 11 : 8), [sender]);
  const styles = useStyles2(getStyles, sender);
  const settings = useMemo(() => getSettings(model), [model]).useState();
  const time = useMemo(() => timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), [timestamp]);
  const commonBubbleProps = useMemo(() => ({ colors, selected, sender, time }), [colors, selected, sender, time]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selected]);

  const renderIndicator = useCallback(
    () => (
      <Bubble {...commonBubbleProps} hideTime>
        <Loader colors={colors} />
      </Bubble>
    ),
    [commonBubbleProps, colors]
  );

  const renderText = useCallback(
    (content: string, key?: string | number) => (
      <Bubble {...commonBubbleProps} key={key}>
        <Text settings={settings} content={content} key={key} />
      </Bubble>
    ),
    [commonBubbleProps, settings]
  );

  const renderTool = useCallback(
    (content: MessageContentComplex, key: string | number) =>
      settings.showTools ? (
        <Bubble {...commonBubbleProps} key={key}>
          <Tool content={content} />
        </Bubble>
      ) : null,
    [commonBubbleProps, settings.showTools]
  );

  const renderContent = useCallback(
    () =>
      typeof content === 'string'
        ? renderText(content)
        : content.map((currentContent, idx) => {
            switch (currentContent.type) {
              case 'text':
                return renderText(currentContent.text, idx);

              case 'image_url':
                return <Image url={currentContent.image_url} key={idx} />;

              case 'tool_use':
                return renderTool(currentContent, idx);

              default:
                return renderText(`I don't know what to do with this: ${JSON.stringify(currentContent)}`, idx);
            }
          }),
    [content, renderText, renderTool]
  );

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.messages}>{indicator ? renderIndicator() : renderContent()}</div>
      {sender !== 'system' && <Icon name={sender === 'ai' ? 'ai' : 'user'} className={styles.icon} />}
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

const getStyles = (theme: GrafanaTheme2, sender: DashMessageState['sender']) => {
  const container = css({
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
  });

  return {
    container,
    messages: css({
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      alignItems: sender === 'user' ? 'flex-end' : sender === 'ai' ? 'flex-start' : 'center',
      width: '100%',
      minWidth: 0,
      gap: theme.spacing(1),
    }),
    icon: css({
      visibility: 'hidden',

      [`.${container}:not(:has(+ .${container})) &`]: {
        visibility: 'visible',
      },
    }),
  };
};
