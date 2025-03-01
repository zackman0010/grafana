import { css, keyframes } from '@emotion/css';
import { MessageContent, MessageContentComplex } from '@langchain/core/messages';
import { useCallback } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { getTagColor, useStyles2 } from '@grafana/ui';

interface DashMessageState extends SceneObjectState {
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

  const renderString = useCallback(
    (content: string, key?: string | number) => (
      <div className={styles.content} key={key?.toString()}>
        {content}
      </div>
    ),
    [styles.content]
  );

  const renderImage = useCallback(
    (imageUrl: string, key?: string | number) => <img src={imageUrl} key={key?.toString()} />,
    []
  );

  const renderTool = useCallback((content: MessageContentComplex, key?: string | number) => null, []);

  return (
    <div className={styles.row}>
      <div className={styles.message}>
        {typeof content === 'string'
          ? renderString(content)
          : content.map((currentContent, idx) => {
              switch (currentContent.type) {
                case 'text':
                  return renderString(currentContent.text, idx);

                case 'image_url':
                  return renderImage(currentContent.image_url, idx);

                case 'tool_use':
                  return renderTool(currentContent, idx);

                default:
                  return renderString(`I don't know what to do with this: ${JSON.stringify(currentContent)}`);
              }
            })}
        <div className={styles.time}>{timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
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
  const colors = getTagColor(sender === 'user' ? 7 : sender === 'ai' ? 11 : 8);

  return {
    row: css({
      marginBottom: theme.spacing(1),
      display: 'flex',
      flexDirection: 'column',
      alignItems: sender === 'user' ? 'flex-end' : sender === 'ai' ? 'flex-start' : 'center',

      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        animationName: fadeIn,
        animationDuration: '0.3s',
        animationTimingFunction: 'ease-in-out',
      },
    }),
    message: css({
      maxWidth: '75%',
      padding: theme.spacing(1),
      borderRadius: theme.shape.radius.default,
      borderBottomRightRadius: sender === 'user' ? 0 : theme.shape.radius.default,
      borderBottomLeftRadius: sender === 'ai' ? 0 : theme.shape.radius.default,
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
      color: theme.colors.text.maxContrast,
      background: colors.color,
      whiteSpace: 'pre-wrap',

      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        transition: 'all 0.2s ease',
      },

      '&:hover': css({
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
      }),
    }),
    content: css({
      ...theme.typography.body,
      whiteSpace: 'pre-wrap',
    }),
    time: css({
      marginTop: theme.spacing(1),
      textAlign: 'right',
      ...theme.typography.bodySmall,
    }),
  };
};
