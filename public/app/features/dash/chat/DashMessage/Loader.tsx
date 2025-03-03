import { css, keyframes } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

import { getColors } from '../utils';

import { Bubble } from './Bubble';
import { MessageContainer } from './MessageContainer';

export const Loader = () => {
  const styles = useStyles2(getStyles);

  return (
    <MessageContainer selected={false} sender="ai">
      <Bubble codeOverflow="wrap" selected={false} sender="ai">
        <div className={styles.container}>
          <span className={styles.point}></span>
          <span className={styles.point}></span>
          <span className={styles.point}></span>
        </div>
      </Bubble>
    </MessageContainer>
  );
};

const getBounce = (offset: string) =>
  keyframes({
    '0%': {
      transform: 'translateY(0)',
    },
    '30%': {
      transform: `translateY(-${offset})`,
    },
    '60%': {
      transform: 'translateY(0)',
    },
    '100%': {
      transform: 'translateY(0)',
    },
  });

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(0.25),
    padding: theme.spacing(0.5, 0.5, 0, 0.5),
  }),
  point: css({
    height: theme.spacing(0.5),
    width: theme.spacing(0.5),
    backgroundColor: theme.colors.getContrastText(getColors('ai', theme).color),
    borderRadius: theme.shape.radius.circle,
    display: 'inline-block',

    [theme.transitions.handleMotion('no-preference', 'reduce')]: {
      animationName: getBounce(theme.spacing(0.5)),
      animationDuration: '1s',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'ease-in-out',
    },

    '&:nth-child(1)': {
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        animationDelay: '0s',
      },
    },

    '&:nth-child(2)': {
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        animationDelay: '0.2s',
      },
    },

    '&:nth-child(3)': {
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        animationDelay: '0.4s',
      },
    },
  }),
});
