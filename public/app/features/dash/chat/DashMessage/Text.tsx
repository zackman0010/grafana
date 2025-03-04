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

  // First check if content is wrapped in <json> tags
  const jsonMatch = content.match(/<json>([\s\S]*?)<\/json>/);
  if (jsonMatch) {
    try {
      jsonContent = JSON.parse(jsonMatch[1]);
      message = jsonContent.message;
    } catch (e) {
      // If JSON parsing fails, try parsing as regular JSON
      try {
        jsonContent = JSON.parse(content);
        message = jsonContent.message;
      } catch (e) {
        // If all parsing fails, use the original content
        message = content;
      }
    }
  } else {
    // If no <json> tags, try parsing as regular JSON
    try {
      jsonContent = JSON.parse(content);
      message = jsonContent.message;
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
