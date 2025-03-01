import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

interface Props {
  time: string;
}

export const Time = ({ time }: Props) => {
  const styles = useStyles2(getStyles);

  return <div className={styles.container}>{time}</div>;
};

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    marginTop: theme.spacing(1),
    textAlign: 'right',
    ...theme.typography.bodySmall,
  }),
});
