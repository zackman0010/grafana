import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';

import { useStyles2 } from '../../themes';
import { getOffsetRadius } from '../../themes/mixins';

interface DemoBoxProps {
  referenceBorderRadius: number;
  referenceBorderWidth: number;
  offset: number;
  offsetBorderWidth: number;
}

export const OffsetBorderRadiusContainer = ({
  referenceBorderRadius,
  referenceBorderWidth,
  offset,
  offsetBorderWidth,
}: DemoBoxProps) => {
  const styles = useStyles2(getStyles, referenceBorderRadius, referenceBorderWidth, offset, offsetBorderWidth);
  return (
    <div className={styles.baseContainer}>
      <div className={styles.offsetContainer} />
    </div>
  );
};

const getStyles = (
  theme: GrafanaTheme2,
  referenceBorderRadius: number,
  referenceBorderWidth: number,
  offset: number,
  offsetBorderWidth: number
) => ({
  baseContainer: css({
    border: `${referenceBorderWidth}px solid ${theme.colors.border.weak}`,
    borderRadius: referenceBorderRadius,
    display: 'flex',
    height: '40px',
    position: 'relative',
    width: '300px',
  }),
  offsetContainer: css({
    border: `${offsetBorderWidth}px solid ${theme.colors.border.strong}`,
    borderRadius: getOffsetRadius(theme, { offset, referenceBorderRadius, referenceBorderWidth }),
    flex: 1,
    inset: -offset,
    position: 'absolute',
  }),
});
