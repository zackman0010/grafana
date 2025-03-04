import { css } from '@emotion/css';
import { ReactNode } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

import { CodeOverflow, Sender } from '../types';
import { getColors } from '../utils';

import { DashMessageState } from './DashMessage';

interface Props {
  children: ReactNode;
  codeOverflow: CodeOverflow;
  selected: boolean;
  sender: DashMessageState['sender'];
}

export const Bubble = ({ children, codeOverflow, selected, sender }: Props) => {
  const styles = useStyles2(getStyles, codeOverflow, selected, sender);

  return (
    <div className={styles.container} data-testid="chat-message-bubble">
      {children}
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2, codeOverflow: CodeOverflow, selected: boolean, sender: Sender) => {
  const { color, borderColor } = getColors(sender, theme);

  return {
    container: css({
      label: 'chat-message-bubble',
      width: '100%',
      border: sender === 'user' ? `0.5px solid ${borderColor}80` : 'none',
      borderRadius: theme.spacing(0.25),
      color: theme.colors.text.primary,
      background: color,
      position: 'relative',
      textAlign: 'left',
      padding: theme.spacing(1),

      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        transition: 'all 0.2s ease',
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
  };
};
