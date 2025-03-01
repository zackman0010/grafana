import { css } from '@emotion/css';

import { GrafanaTheme2, renderMarkdown } from '@grafana/data';
import { getTagColor, useStyles2 } from '@grafana/ui';

import { DashMessageState } from './DashMessage';
import { Time } from './Time';

interface Props {
  colors: ReturnType<typeof getTagColor>;
  containerClassName: string;
  content: string;
  sender: DashMessageState['sender'];
  time: string;
}

export const Text = ({ colors, containerClassName, content, sender, time }: Props) => {
  const styles = useStyles2(getStyles, colors, containerClassName, sender);

  let jsonContent: any = undefined;
  let message = content;

  try {
    jsonContent = JSON.parse(content);
    message = jsonContent.message;
  } catch (e) {
    // Ignore
  }

  return (
    <div className={styles.container}>
      <div className={styles.content} dangerouslySetInnerHTML={{ __html: renderMarkdown(message) }} />
      <Time time={time} />
    </div>
  );
};

const getStyles = (
  theme: GrafanaTheme2,
  colors: ReturnType<typeof getTagColor>,
  containerClassName: string,
  sender: DashMessageState['sender']
) => ({
  container: css({
    maxWidth: '75%',
    padding: theme.spacing(1),
    border: `1px solid ${colors.borderColor}`,
    borderRadius: theme.spacing(1),
    borderBottomRightRadius: sender === 'user' ? 0 : theme.spacing(1),
    borderBottomLeftRadius: sender === 'ai' ? 0 : theme.spacing(1),
    color: theme.colors.getContrastText(colors.color),
    background: colors.color,
    boxShadow: theme.shadows.z1,
    position: 'relative',

    [theme.transitions.handleMotion('no-preference', 'reduce')]: {
      transition: 'all 0.2s ease',
    },

    [`.${containerClassName}:has(:hover) &`]: css({
      boxShadow: theme.shadows.z2,
    }),
  }),
  content: css({
    ...theme.typography.body,

    '& :is(ol, ul)': css({
      paddingLeft: theme.spacing(2),
    }),

    '& strong': css({
      fontWeight: 'bold',
    }),
  }),
});
