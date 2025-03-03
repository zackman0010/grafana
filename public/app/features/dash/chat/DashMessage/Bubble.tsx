import { css } from '@emotion/css';
import { ReactNode } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

import { DashSettingsState } from '../DashSettings';
import { getColors } from '../utils';

import { DashMessageState } from './DashMessage';

interface Props {
  children: ReactNode;
  codeOverflow: DashSettingsState['codeOverflow'];
  selected: boolean;
  sender: DashMessageState['sender'];
  time: string;

  hideTime?: boolean;
}

export const Bubble = ({ children, codeOverflow, selected, sender, time, hideTime }: Props) => {
  const styles = useStyles2(getStyles, codeOverflow, selected, sender);

  return (
    <div className={styles.container}>
      {children}
      {!hideTime && <div className={styles.time}>{time}</div>}
    </div>
  );
};

const getStyles = (
  theme: GrafanaTheme2,
  codeOverflow: DashSettingsState['codeOverflow'],
  selected: boolean,
  sender: DashMessageState['sender']
) => {
  const { color, borderColor } = getColors(sender);

  return {
    container: css({
      maxWidth: '75%',
      padding: theme.spacing(1),
      border: `1px solid ${borderColor}`,
      borderRadius: theme.spacing(1),
      borderBottomRightRadius: sender === 'user' ? 0 : theme.spacing(1),
      borderBottomLeftRadius: sender === 'ai' ? 0 : theme.spacing(1),
      color: theme.colors.getContrastText(color),
      background: color,
      boxShadow: selected ? `0px 0px 16px ${borderColor}` : '0px 1px 2px rgba(1, 4, 9, 0.75)',
      position: 'relative',

      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        transition: 'all 0.2s ease',
      },

      '&:hover': {
        boxShadow: selected ? `0px 0px 16px ${borderColor}` : `0px 2px 4px ${borderColor}`,
      },

      '& :is(ol, ul)': {
        paddingLeft: theme.spacing(2),
      },

      '& strong': {
        fontWeight: 'bold',
      },

      '& code': {
        wordBreak: 'break-all',
        display: codeOverflow === 'wrap' ? 'initial' : 'block',
        overflow: 'auto',
        textOverflow: 'unset',
        whiteSpace: codeOverflow === 'wrap' ? 'initial' : 'nowrap',
      },
    }),
    time: css({
      marginTop: theme.spacing(1),
      textAlign: 'right',
      ...theme.typography.bodySmall,
    }),
  };
};
