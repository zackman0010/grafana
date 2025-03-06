import { css, cx } from '@emotion/css';
import { useMemo } from 'react';

import { GrafanaTheme2, renderMarkdown } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { getMessage } from '../utils';

interface TextState extends SceneObjectState {
  content: string;
}

export class Text extends SceneObjectBase<TextState> {
  public static Component = TextRenderer;
}

function processMessageContent(content: string): string {
  // Remove time tags
  const contentWithoutTimeTag = content.replace(/<time>.*?<\/time>/s, '').trim();

  // Find json tags anywhere in the content
  const jsonStartIndex = contentWithoutTimeTag.indexOf('<json>');
  const jsonEndIndex = contentWithoutTimeTag.indexOf('</json>');

  // If no json tags found, return the content as is
  if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex <= jsonStartIndex) {
    return contentWithoutTimeTag;
  }

  // Extract content between tags and normalize it
  const jsonStr = contentWithoutTimeTag
    .slice(jsonStartIndex + 6, jsonEndIndex) // Remove <json> and </json>
    .trim();

  try {
    // Parse the JSON content
    const jsonContent = JSON.parse(jsonStr);

    // If we have a valid object with a message property, return the message
    if (jsonContent && typeof jsonContent === 'object' && 'message' in jsonContent) {
      return jsonContent.message;
    }

    // If we have a valid object but no message, return the stringified content
    return JSON.stringify(jsonContent);
  } catch (e) {
    // If JSON parsing fails, try to extract just the message content using regex
    const messageMatch = jsonStr.match(/"message"\s*:\s*"([^"]+)"/);
    if (messageMatch) {
      return messageMatch[1].replace(/\\n/g, '\n');
    }

    // If all else fails, return the original content without the json tags
    return contentWithoutTimeTag.replace(/<\/?json>/g, '').trim();
  }
}

function TextRenderer({ model }: SceneComponentProps<Text>) {
  const { content } = model.useState();
  const { sender } = getMessage(model).useState();
  const { muted } = getMessage(model).useState();
  const styles = useStyles2(getStyles, muted);

  const message = useMemo(() => processMessageContent(content), [content]);

  return (
    <div
      className={cx(
        styles.container,
        'markdown-html',
        sender === 'system' && styles.systemMessage,
        sender === 'user' && 'user-message'
      )}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(message) }}
    />
  );
}

const getStyles = (theme: GrafanaTheme2, muted: boolean) => ({
  container: css({
    label: 'dash-message-text-container',

    ...theme.typography.body,

    ...(muted && {
      color: theme.colors.text.secondary,
    }),

    'ul, ol': {
      margin: theme.spacing(1, 0),
      paddingLeft: theme.spacing(3),
    },

    li: {
      marginBottom: theme.spacing(0.5),
    },

    'li p': {
      marginBottom: 0,
    },

    'h1, h2, h3, h4, h5, h6': {
      marginTop: theme.spacing(2),
      fontSize: '0.9em',
      fontWeight: theme.typography.fontWeightMedium,
    },

    '&:not(.user-message) p': {
      margin: theme.spacing(1, 0),
    },

    code: {
      label: 'dash-message-text-code',
      border: 'none',
      padding: 0,
      fontSize: '1.1em',
      fontFamily: theme.typography.fontFamilyMonospace,
      lineHeight: 1.3,
      overflow: 'auto',
      color: theme.colors.text.secondary,
      opacity: 0.9,
    },

    pre: {
      label: 'dash-message-text-pre',
      padding: theme.spacing(0.5, 1),
      overflow: 'auto',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      wordBreak: 'break-all',
      maxWidth: '100%',
      maxHeight: '120px',
      code: {
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        wordBreak: 'break-all',
        maxWidth: '100%',
      },
    },
  }),
  systemMessage: css({
    label: 'dash-message-text-system-message',
    fontSize: theme.typography.h6.fontSize,
    fontWeight: theme.typography.h6.fontWeight,
    color: theme.colors.text.secondary,
    maxWidth: '600px',
    marginLeft: 'auto',
    marginRight: 'auto',
    wordWrap: 'break-word',
    wordBreak: 'break-all',
    '& code': {
      background: 'transparent',
      border: 'none',
      margin: 0,
    },
  }),
});
