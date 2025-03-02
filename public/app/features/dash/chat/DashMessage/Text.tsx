import { css } from '@emotion/css';

import { GrafanaTheme2, renderMarkdown } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

import { DashSettingsState } from '../DashSettings';

interface Props {
  content: string;
  settings: DashSettingsState;
}

export const Text = ({ content, settings }: Props) => {
  const styles = useStyles2(getStyles, settings);

  let jsonContent: any = undefined;
  let message = content;

  try {
    jsonContent = JSON.parse(content);
    message = jsonContent.message;
  } catch (e) {
    // Ignore
  }

  return <div className={styles.container} dangerouslySetInnerHTML={{ __html: renderMarkdown(message) }} />;
};

const getStyles = (theme: GrafanaTheme2, { codeOverflow }: DashSettingsState) => ({
  container: css({
    ...theme.typography.body,

    '& :is(ol, ul)': {
      paddingLeft: theme.spacing(2),
    },

    '& strong': {
      fontWeight: 'bold',
    },

    '& code': {
      wordBreak: 'break-all',
      display: codeOverflow === 'wrap' ? 'initial' : 'block',
      overflow: codeOverflow === 'ellipsis' ? 'hidden' : 'scroll',
      textOverflow: codeOverflow === 'ellipsis' ? 'ellipsis' : 'unset',
      whiteSpace: codeOverflow === 'wrap' ? 'initial' : 'nowrap',
    },
  }),
});
