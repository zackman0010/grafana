import { css } from '@emotion/css';

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

  try {
    jsonContent = JSON.parse(content);
    message = jsonContent.message;
  } catch (e) {
    // Ignore
  }

  return (
    <Bubble codeOverflow={codeOverflow} selected={selected} sender={sender}>
      <div className={styles.container} dangerouslySetInnerHTML={{ __html: renderMarkdown(message) }} />
    </Bubble>
  );
}

const getStyles = (theme: GrafanaTheme2, codeOverflow: DashSettingsState['codeOverflow'], muted?: boolean) => ({
  container: css({
    ...theme.typography.body,
    ...(muted && {
      color: theme.colors.text.secondary,
    }),
  }),
});
