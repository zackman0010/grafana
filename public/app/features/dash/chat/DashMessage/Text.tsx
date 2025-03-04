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

function TextRenderer({ model }: SceneComponentProps<Text>) {
  const { content, muted } = model.useState();
  const { codeOverflow } = getSettings(model).useState();
  const { selected, sender } = getMessage(model).useState();
  const styles = useStyles2(getStyles, codeOverflow, muted);

  let jsonContent: any = undefined;
  let message = content;

  // Process all JSON tags in the content
  while (true) {
    // Find json tags anywhere in the content
    const jsonStartIndex = message.indexOf('<json>');
    const jsonEndIndex = message.indexOf('</json>');

    if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex <= jsonStartIndex) {
      break;
    }

    // Extract content between tags and normalize it
    const jsonStr = message
      .slice(jsonStartIndex + 6, jsonEndIndex) // Remove <json> and </json>
      .trim();

    try {
      jsonContent = JSON.parse(jsonStr);
      if (jsonContent && typeof jsonContent === 'object') {
        if ('message' in jsonContent) {
          // Replace the JSON section with the message
          message = message.slice(0, jsonStartIndex) + jsonContent.message + message.slice(jsonEndIndex + 7);
        } else {
          // If we have valid JSON but no message, just remove the tags
          message = message.slice(0, jsonStartIndex) + message.slice(jsonEndIndex + 7);
        }
      } else {
        // If we have valid JSON but it's not an object, just remove the tags
        message = message.slice(0, jsonStartIndex) + message.slice(jsonEndIndex + 7);
      }
    } catch (e) {
      // If JSON parsing fails, preserve any content after the tags
      const beforeJson = message.slice(0, jsonStartIndex);
      const afterJson = message.slice(jsonEndIndex + 7);
      message = beforeJson + afterJson;
    }
  }

  // If no <json> tags were found, try parsing as regular JSON
  if (message === content) {
    try {
      jsonContent = JSON.parse(content);
      if (jsonContent && typeof jsonContent === 'object' && 'message' in jsonContent) {
        message = jsonContent.message;
      }
    } catch (e) {
      // If parsing fails, use the original content
      message = content;
    }
  }

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
