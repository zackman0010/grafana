import { css, cx } from '@emotion/css';
import { MouseEvent } from 'react';
import tinycolor2 from 'tinycolor2';

import { GrafanaTheme2, IconName } from '@grafana/data';
import { Icon, Tooltip, useStyles2 } from '@grafana/ui';

interface Props {
  icon: IconName;
  label: string;
  checked: boolean;
  checkedIcon?: IconName;
  disabled?: boolean;
  variant: 'blue' | 'yellow' | 'gray';
  'data-testId'?: string;
  onClick: (evt: MouseEvent<HTMLDivElement>) => void;
}

export const ToolbarSwitch = ({
  icon,
  label,
  checked,
  checkedIcon,
  disabled,
  onClick,
  variant,
  'data-testId': dataTestId,
}: Props) => {
  const styles = useStyles2(getStyles);

  return (
    <Tooltip content={label}>
      <div
        aria-label={label}
        role="button"
        className={cx({
          [variant]: true,
          [styles.container]: true,
          [styles.containerChecked]: checked,
          [styles.containerDisabled]: disabled,
        })}
        data-testid={dataTestId}
        onClick={disabled ? undefined : onClick}
      >
        <div className={cx(styles.box, checked && styles.boxChecked)}>
          <Icon name={checked && checkedIcon ? checkedIcon : icon} size="xs" />
        </div>
      </div>
    </Tooltip>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    border: `1px solid ${theme.components.input.borderColor}`,
    padding: theme.spacing(0.25),
    backgroundColor: theme.components.input.background,
    borderRadius: theme.shape.radius.default,
    width: theme.spacing(5.5),
    height: theme.spacing(3),
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',

    [theme.transitions.handleMotion('no-preference', 'reduce')]: {
      transition: 'all 0.2s ease-in-out',
    },

    '&:hover': {
      borderColor: theme.components.input.borderHover,
    },
  }),
  containerChecked: css({
    '&.blue': {
      backgroundColor: theme.colors.primary.main,
      border: `1px solid ${theme.colors.primary.main}`,

      '&:hover': {
        backgroundColor: theme.colors.primary.shade,
        borderColor: theme.colors.primary.shade,
      },
    },

    '&.yellow': {
      backgroundColor: theme.colors.warning.main,
      borderColor: theme.colors.warning.border,

      '&:hover': {
        backgroundColor: theme.colors.warning.shade,
        borderColor: theme.colors.warning.shade,
      },
    },

    '&.gray': {
      backgroundColor: theme.colors.secondary.main,
      borderColor: theme.colors.secondary.border,

      '&:hover': {
        backgroundColor: theme.colors.secondary.shade,
        borderColor: theme.colors.secondary.shade,
      },
    },
  }),
  containerDisabled: css({
    cursor: 'initial',
    background: theme.colors.action.disabledBackground,
    borderColor: theme.colors.border.weak,
  }),
  box: css({
    background: theme.colors.background.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: theme.spacing(2.5),
    height: theme.spacing(2.5),
    borderRadius: theme.shape.radius.default,
    transform: 'translateX(0)',
    position: 'relative',

    [theme.transitions.handleMotion('no-preference', 'reduce')]: {
      transition: 'all 0.2s ease-in-out',
    },

    '&:after': {
      content: "''",
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: theme.shape.radius.default,
      background: theme.colors.secondary.main,
      border: `1px solid ${theme.colors.secondary.border}`,
    },
  }),
  boxChecked: css({
    transform: `translateX(calc(100% - ${theme.spacing(0.25)}))`,
  }),
});
