import { css, keyframes } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

export const Loader = () => {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.container}>
      <span className={styles.bar}></span>
      <span className={styles.bar}></span>
      <span className={styles.bar}></span>
      <span className={styles.bar}></span>
      <span className={styles.bar}></span>
      <span className={styles.particle}></span>
      <span className={styles.particle}></span>
      <span className={styles.particle}></span>
      <span className={styles.particle}></span>
      <span className={styles.particle}></span>
    </div>
  );
};

const getPulse = (theme: GrafanaTheme2, startHeight: number, maxHeight: number) =>
  keyframes({
    '0%': {
      height: theme.spacing(startHeight),
      opacity: 0.7,
    },
    '25%': {
      height: theme.spacing(maxHeight),
      opacity: 1,
    },
    '50%': {
      height: theme.spacing(startHeight * 0.8),
      opacity: 0.8,
    },
    '75%': {
      height: theme.spacing(maxHeight * 0.9),
      opacity: 0.9,
    },
    '100%': {
      height: theme.spacing(startHeight),
      opacity: 0.7,
    },
  });

const getSparkle = (theme: GrafanaTheme2) =>
  keyframes({
    '0%': {
      transform: 'translate(0, 0) scale(1)',
      opacity: 0,
    },
    '20%': {
      opacity: 1,
    },
    '100%': {
      transform: 'translate(var(--tx), var(--ty)) scale(0)',
      opacity: 0,
    },
  });

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    label: 'dash-messages-loader',
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(0.25),
    padding: theme.spacing(0.5, 0.5, 0, 0.5),
    margin: theme.spacing(2, 0),
    height: theme.spacing(2),
    alignItems: 'flex-end',
    position: 'relative',
    width: 'fit-content',
  }),
  bar: css({
    label: 'dash-messages-loader-bar',
    width: theme.spacing(0.5),
    backgroundColor: theme.colors.text.primary,
    borderRadius: theme.shape.radius.default,
    display: 'inline-block',
    transformOrigin: 'bottom',
    height: theme.spacing(0.5),
    opacity: 0.7,

    [theme.transitions.handleMotion('no-preference', 'reduce')]: {
      animationName: getPulse(theme, 0.5, 1.5),
      animationDuration: '1.2s',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'ease-in-out',
    },

    '&:nth-child(1)': {
      height: theme.spacing(0.8),
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        animationDelay: '0.1s',
        animationName: getPulse(theme, 0.8, 1.8),
        animationDuration: '1.4s',
      },
    },

    '&:nth-child(2)': {
      height: theme.spacing(0.6),
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        animationDelay: '0.3s',
        animationName: getPulse(theme, 0.6, 1.6),
        animationDuration: '1.1s',
      },
    },

    '&:nth-child(3)': {
      height: theme.spacing(0.7),
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        animationDelay: '0.5s',
        animationName: getPulse(theme, 0.7, 1.7),
        animationDuration: '1.3s',
      },
    },

    '&:nth-child(4)': {
      height: theme.spacing(0.5),
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        animationDelay: '0.7s',
        animationName: getPulse(theme, 0.5, 1.5),
        animationDuration: '1.2s',
      },
    },

    '&:nth-child(5)': {
      height: theme.spacing(0.9),
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        animationDelay: '0.9s',
        animationName: getPulse(theme, 0.9, 1.9),
        animationDuration: '1.5s',
      },
    },
  }),
  particle: css({
    label: 'dash-messages-loader-particle',
    position: 'absolute',
    width: theme.spacing(0.2),
    height: theme.spacing(0.2),
    backgroundColor: theme.colors.text.primary,
    borderRadius: theme.shape.radius.circle,
    opacity: 0,
    '--tx': '0px',
    '--ty': '0px',

    [theme.transitions.handleMotion('no-preference', 'reduce')]: {
      animationName: getSparkle(theme),
      animationDuration: '1s',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'ease-out',
    },

    '&:nth-child(6)': {
      top: '60%',
      left: '5%',
      '--tx': '8px',
      '--ty': '-20px',
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        animationDelay: '0.2s',
      },
    },

    '&:nth-child(7)': {
      top: '50%',
      left: '25%',
      '--tx': '-6px',
      '--ty': '-25px',
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        animationDelay: '0.4s',
      },
    },

    '&:nth-child(8)': {
      top: '55%',
      left: '45%',
      '--tx': '10px',
      '--ty': '-18px',
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        animationDelay: '0.6s',
      },
    },

    '&:nth-child(9)': {
      top: '45%',
      left: '65%',
      '--tx': '-8px',
      '--ty': '-22px',
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        animationDelay: '0.8s',
      },
    },

    '&:nth-child(10)': {
      top: '50%',
      left: '85%',
      '--tx': '6px',
      '--ty': '-28px',
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        animationDelay: '1s',
      },
    },
  }),
});
