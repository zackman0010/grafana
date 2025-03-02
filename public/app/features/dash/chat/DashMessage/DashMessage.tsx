import { css, keyframes } from '@emotion/css';
import { MessageContent, MessageContentComplex } from '@langchain/core/messages';
import { useMemo } from 'react';

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
  content: MessageContent | { __isIndicator: true };
  sender: 'user' | 'ai' | 'system';
  timestamp: Date;
}

export class DashMessage extends SceneObjectBase<DashMessageState> {
  public static Component = DashMessageRenderer;
}

function DashMessageRenderer({ model }: SceneComponentProps<DashMessage>) {
  const { content, sender, timestamp } = model.useState();
  const colors = useMemo(() => getTagColor(sender === 'user' ? 7 : sender === 'ai' ? 11 : 8), [sender]);
  const styles = useStyles2(getStyles, sender);
  const settings = useMemo(() => getSettings(model), [model]).useState();
  const time = useMemo(() => timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), [timestamp]);
  const commonBubbleProps = useMemo(
    () => ({ colors, containerClassName: styles.container, sender, time }),
    [colors, styles.container, sender, time]
  );

  const renderText = (content: string, key?: string | number) => (
    <Bubble {...commonBubbleProps} key={key}>
      <Text settings={settings} content={content} key={key} />
    </Bubble>
  );

  const renderTool = (content: MessageContentComplex, key: string | number) =>
    settings.showTools ? (
      <Bubble {...commonBubbleProps} key={key}>
        <Tool content={content} />
      </Bubble>
    ) : null;

  return (
    <div className={styles.container}>
      <div className={styles.messages}>
        {typeof content === 'string' ? (
          renderText(content)
        ) : Array.isArray(content) ? (
          content.map((currentContent, idx) => {
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
          })
        ) : (
          <Bubble {...commonBubbleProps} hideTime>
            <Loader colors={colors} />
          </Bubble>
        )}
      </div>
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
