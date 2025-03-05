import { css, keyframes } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

export const DotsLoader = () => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      <span className={styles.point}></span>
      <span className={styles.point}></span>
      <span className={styles.point}></span>
    </div>
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
    label: 'dash-messages-dotsloader',
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(0.25),
    padding: theme.spacing(0.5, 0.5, 0, 0.5),
    margin: theme.spacing(2, 0),
  }),
  point: css({
    label: 'dash-messages-dotsloader-point',
    height: theme.spacing(0.5),
    width: theme.spacing(0.5),
    backgroundColor: theme.colors.text.maxContrast,
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
