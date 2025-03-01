import { css, keyframes } from '@emotion/css';
import { MessageContent } from '@langchain/core/messages';
import { useMemo } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { getTagColor, useStyles2 } from '@grafana/ui';

import { MessageIcon } from './Icon';
import { Image } from './Image';
import { Text } from './Text';
import { Tool } from './Tool';

export interface DashMessageState extends SceneObjectState {
  content: MessageContent;
  sender: 'user' | 'ai' | 'system';
  timestamp: Date;
}

export class DashMessage extends SceneObjectBase<DashMessageState> {
  public static Component = DashMessageRenderer;
}

function DashMessageRenderer({ model }: SceneComponentProps<DashMessage>) {
  const { content, sender, timestamp } = model.useState();
  const styles = useStyles2(getStyles, sender);

  const time = useMemo(() => timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), [timestamp]);
  const colors = useMemo(() => getTagColor(sender === 'user' ? 7 : sender === 'ai' ? 11 : 8), [sender]);

  return (
    <div className={styles.container}>
      <div className={styles.messages}>
        {typeof content === 'string' ? (
          <Text colors={colors} containerClassName={styles.container} content={content} sender={sender} time={time} />
        ) : (
          content.map((currentContent, idx) => {
            switch (currentContent.type) {
              case 'text':
                return (
                  <Text
                    colors={colors}
                    containerClassName={styles.container}
                    content={currentContent.text}
                    sender={sender}
                    time={time}
                    key={idx}
                  />
                );

              case 'image_url':
                return <Image url={currentContent.image_url} key={idx} />;

              case 'tool_use':
                return (
                  <Tool
                    colors={colors}
                    containerClassName={styles.container}
                    content={currentContent}
                    sender={sender}
                    time={time}
                    key={idx}
                  />
                );

              default:
                return (
                  <Text
                    colors={colors}
                    containerClassName={styles.container}
                    content={`I don't know what to do with this: ${JSON.stringify(currentContent)}`}
                    sender={sender}
                    time={time}
                    key={idx}
                  />
                );
            }
          })
        )}
      </div>
      <MessageIcon colors={colors} sender={sender} containerClassName={styles.container} />
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

    [theme.transitions.handleMotion('no-preference', 'reduce')]: {
      animationName: fadeIn,
      animationDuration: '0.3s',
      animationTimingFunction: 'ease-in-out',
      transition: 'all 0.2s ease',
    },

    '&:first-child': css({
      marginTop: 0,
    }),

    '& + &': css({
      marginTop: theme.spacing(0.5),
    }),
  }),
  messages: css({
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    alignItems: sender === 'user' ? 'flex-end' : sender === 'ai' ? 'flex-start' : 'center',
  }),
});
