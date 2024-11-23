import { css, cx } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { ScrollContainer, useStyles2 } from '@grafana/ui';

import { useSnappingSplitter } from '../panel-edit/splitter/useSnappingSplitter';
import { DashboardScene } from '../scene/DashboardScene';

interface Props {
  dashboard: DashboardScene;
  children: React.ReactNode;
}

export function DashboardEditWrapper({ dashboard, children }: Props) {
  const styles = useStyles2(getStyles);

  const { containerProps, primaryProps, secondaryProps, splitterProps, splitterState, onToggleCollapse } =
    useSnappingSplitter({
      direction: 'row',
      dragPosition: 'end',
      initialSize: 0.75,
      paneOptions: {
        collapseBelowPixels: 250,
        snapOpenToPixels: 400,
      },
    });

  return (
    <div
      {...containerProps}
      className={cx(containerProps.className, styles.pageContainer)}
      onClick={dashboard.state.editPane.onClick}
    >
      <div {...primaryProps} className={cx(primaryProps.className, styles.body)}>
        {children}
      </div>
      <div {...splitterProps} />
      <div {...secondaryProps} className={cx(secondaryProps.className, styles.optionsPane)}>
        <dashboard.state.editPane.Component model={dashboard.state.editPane} />
      </div>
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    pageContainer: css({
      overflow: 'hidden',
      flex: '1 1 0',
      //   position: 'absolute',
      //   width: '100%',
      //   height: '100%',
    }),
    body: css({
      display: 'flex',
      flexGrow: 1,
      flexDirection: 'column',
    }),
    optionsPane: css({
      flexDirection: 'column',
      borderLeft: `1px solid ${theme.colors.border.weak}`,
      background: theme.colors.background.primary,
    }),
  };
}
