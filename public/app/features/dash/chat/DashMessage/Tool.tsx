import { css } from '@emotion/css';
import { MessageContentComplex } from '@langchain/core/messages';
import { useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { Collapse, getTagColor, JSONFormatter, useStyles2 } from '@grafana/ui';

import { DashMessageState } from './DashMessage';
import { Time } from './Time';

interface Props {
  colors: ReturnType<typeof getTagColor>;
  containerClassName: string;
  content: MessageContentComplex;
  sender: DashMessageState['sender'];
  time: string;
}

export const Tool = ({ colors, containerClassName, content, sender, time }: Props) => {
  const styles = useStyles2(getStyles, colors, containerClassName, sender);
  const [opened, setOpened] = useState(false);

  const name = 'name' in content ? String(content.name) : 'Unknown tool';

  return (
    <div className={styles.container}>
      <Collapse label={name} collapsible isOpen={opened} onToggle={setOpened}>
        <JSONFormatter json={content} />
      </Collapse>
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
  content: css({ ...theme.typography.body }),
});
