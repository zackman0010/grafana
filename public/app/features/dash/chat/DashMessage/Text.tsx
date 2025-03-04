import { css, cx } from '@emotion/css';

import { GrafanaTheme2, renderMarkdown } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { CodeOverflow } from '../types';
import { getMessage, getSettings } from '../utils';

import { Bubble } from './Bubble';

interface TextState extends SceneObjectState {
  content: string;
  muted?: boolean;
}

export class Text extends SceneObjectBase<TextState> {
  public static Component = TextRenderer;
}

function processMessageContent(content: string): string {
  // Find json tags anywhere in the content
  const jsonStartIndex = content.indexOf('<json>');
  const jsonEndIndex = content.indexOf('</json>');

  // If no json tags found, return the content as is
  if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex <= jsonStartIndex) {
    return content;
  }

  // Extract content between tags and normalize it
  const jsonStr = content
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
    return content.replace(/<\/?json>/g, '').trim();
  }
}

function TextRenderer({ model }: SceneComponentProps<Text>) {
  const { content, muted } = model.useState();
  const { codeOverflow } = getSettings(model).useState();
  const { selected, sender } = getMessage(model).useState();
  const styles = useStyles2(getStyles, codeOverflow, muted);

  const message = processMessageContent(content);

  return (
    <Bubble codeOverflow={codeOverflow} selected={selected} sender={sender}>
      <div
        className={cx(styles.container, 'markdown-html', sender === 'system' && 'welcome-message')}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(message) }}
      />
    </Bubble>
  );
}

const getStyles = (theme: GrafanaTheme2, codeOverflow: CodeOverflow, muted?: boolean) => ({
  container: css({
    ...theme.typography.body,
    ...(muted && {
      color: theme.colors.text.secondary,
    }),
    'ul, ol': {
      margin: theme.spacing(1, 0),
      paddingLeft: theme.spacing(3),
    },
    'h1, h2, h3, h4, h5, h6': {
      marginTop: theme.spacing(2),
      fontSize: '0.9em',
      fontWeight: theme.typography.fontWeightMedium,
    },
    '&.welcome-message': {
      fontSize: theme.typography.h6.fontSize,
      fontWeight: theme.typography.h6.fontWeight,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing(3),
      maxWidth: '600px',
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    p: {
      marginBottom: theme.spacing(1),
    },
  }),
});
