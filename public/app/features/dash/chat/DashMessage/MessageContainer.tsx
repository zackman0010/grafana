import { css, keyframes } from '@emotion/css';
import { ReactNode, useEffect, useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

import { DashMessageState } from './DashMessage';

interface Props {
  children: ReactNode;
  selected: boolean;
  sender: DashMessageState['sender'];
}

export const MessageContainer = ({ children, selected, sender }: Props) => {
  const styles = useStyles2(getStyles, sender);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selected]);

  return (
    <div className={styles.container} ref={ref}>
      {sender === 'user' ? <div className={styles.messagePanel}>{children}</div> : children}
    </div>
  );
};

const fadeIn = keyframes({
  '0%': {
    opacity: 0,
    transform: 'translateY(10px)',
  },
  '100%': {
    opacity: 1,
    transform: 'translateY(0)',
  },
});

const getStyles = (theme: GrafanaTheme2, sender: DashMessageState['sender']) => ({
  container: css({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    justifyContent: sender === 'user' ? 'flex-end' : 'flex-start',

    '&:first-child': {
      marginTop: 0,
    },

    [theme.transitions.handleMotion('no-preference', 'reduce')]: {
      animationName: fadeIn,
      animationDuration: '0.3s',
      animationTimingFunction: 'ease-in-out',
      transition: 'all 0.2s ease',
    },
  }),
  messagePanel: css({
    flex: 1,
    maxWidth: '100%',
  }),
});
