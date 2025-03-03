import { css, keyframes } from '@emotion/css';
import { ReactNode, useEffect, useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

import { DashMessageState } from './DashMessage';
import { Icon } from './Icon';

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
      {children}
      <Icon sender={sender} />
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
    flexDirection: sender === 'ai' ? 'row-reverse' : 'row',
    alignItems: 'flex-end',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1.5),
    justifyContent: sender === 'ai' ? 'flex-end' : 'flex-start',

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
});
