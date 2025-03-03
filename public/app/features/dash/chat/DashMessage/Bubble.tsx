import { css } from '@emotion/css';
import { ReactNode } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { getTagColor, useStyles2 } from '@grafana/ui';

import { DashMessageState } from './DashMessage';

interface Props {
  children: ReactNode;
  colors: ReturnType<typeof getTagColor>;
  selected: boolean;
  sender: DashMessageState['sender'];
  time: string;

  hideTime?: boolean;
}

export const Bubble = ({ children, colors, selected, sender, time, hideTime }: Props) => {
  const styles = useStyles2(getStyles, colors, selected, sender);

  return (
    <div className={styles.container}>
      {children}
      {!hideTime && <div className={styles.time}>{time}</div>}
    </div>
  );
};

const getStyles = (
  theme: GrafanaTheme2,
  colors: ReturnType<typeof getTagColor>,
  selected: boolean,
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
    boxShadow: selected ? `0px 0px 16px ${colors.borderColor}` : '0px 1px 2px rgba(1, 4, 9, 0.75)',
    position: 'relative',

    [theme.transitions.handleMotion('no-preference', 'reduce')]: {
      transition: 'all 0.2s ease',
    },

    '&:hover': {
      boxShadow: selected ? `0px 0px 16px ${colors.borderColor}` : `0px 2px 4px ${colors.borderColor}`,
    },
  }),
  time: css({
    marginTop: theme.spacing(1),
    textAlign: 'right',
    ...theme.typography.bodySmall,
  }),
});
