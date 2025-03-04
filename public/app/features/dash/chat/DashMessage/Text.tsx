import { css, cx } from '@emotion/css';

import { GrafanaTheme2, renderMarkdown } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { DashSettingsState } from '../DashSettings';
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
    // Log the first few characters to check for any hidden characters
    const jsonContent = JSON.parse(jsonStr);
    if (jsonContent && typeof jsonContent === 'object' && 'message' in jsonContent) {
      // Only use the message from the JSON content
      return jsonContent.message;
    }
  } catch (e) {
    // If JSON parsing fails, let's manually clean up the string
    const cleanedStr = jsonStr
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
      .replace(/\n/g, '\\n') // Normalize line feeds
      .replace(/\r/g, '') // Remove carriage returns
      .trim();

    console.warn('Failed to parse JSON content:', e);
    // If JSON parsing fails, return the original content
    return cleanedStr;
  }

  return content;
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

const getStyles = (theme: GrafanaTheme2, codeOverflow: DashSettingsState['codeOverflow'], muted?: boolean) => ({
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
  }),
});
