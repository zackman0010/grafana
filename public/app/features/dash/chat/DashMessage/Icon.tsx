import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { Icon, getTagColor, useStyles2 } from '@grafana/ui';

import { DashMessageState } from './DashMessage';

interface Props {
  colors: ReturnType<typeof getTagColor>;
  containerClassName: string;
  sender: DashMessageState['sender'];
}

export const MessageIcon = ({ colors, containerClassName, sender }: Props) => {
  const styles = useStyles2(getStyles, colors, containerClassName);

  if (sender === 'system') {
    return null;
  }

  return <Icon name={sender === 'ai' ? 'ai' : 'user'} className={styles.icon} />;
};

const getStyles = (_theme: GrafanaTheme2, colors: ReturnType<typeof getTagColor>, containerClassName: string) => ({
  icon: css({
    color: colors.color,
    stroke: colors.borderColor,
    visibility: 'hidden',

    [`.${containerClassName}:not(:has(+ .${containerClassName})) &`]: css({
      visibility: 'visible',
    }),
  }),
});
