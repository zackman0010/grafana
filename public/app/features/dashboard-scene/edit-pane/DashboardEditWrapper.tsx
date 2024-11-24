import { css, cx } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { ScrollContainer, ToolbarButton, useStyles2 } from '@grafana/ui';

import { useSnappingSplitter } from '../panel-edit/splitter/useSnappingSplitter';
import { DashboardScene } from '../scene/DashboardScene';

interface Props {
  dashboard: DashboardScene;
  isEditing?: boolean;
  children: React.ReactNode;
}

export function DashboardEditWrapper({ dashboard, isEditing, children }: Props) {
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

  if (!isEditing) {
    primaryProps.style.flexGrow = 1;
  }

  return (
    <div
      {...containerProps}
      className={cx(containerProps.className, styles.pageContainer, isEditing && styles.pageContainerEditing)}
      onClick={dashboard.state.editPane.onClick}
    >
      <div {...primaryProps} className={cx(primaryProps.className, styles.body)}>
        {children}
      </div>
      {isEditing && (
        <>
          <div {...splitterProps} />
          <div {...secondaryProps} className={cx(secondaryProps.className, styles.optionsPane)}>
            {splitterState.collapsed && (
              <div className={styles.expandOptionsWrapper}>
                <ToolbarButton
                  tooltip={'Open options pane'}
                  icon={'arrow-to-right'}
                  onClick={onToggleCollapse}
                  variant="canvas"
                  className={styles.rotate180}
                  aria-label={'Open options pane'}
                />
              </div>
            )}
            {!splitterState.collapsed && <dashboard.state.editPane.Component model={dashboard.state.editPane} />}
          </div>
        </>
      )}
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    pageContainer: css({
      label: 'edit-wrapper-page-container',
      overflow: 'unset',
      //   position: 'absolute',
      //   width: '100%',
      //   height: '100%',
    }),
    pageContainerEditing: css({
      label: 'edit-wrapper-page-container-editing',
      overflow: 'hidden',
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
    rotate180: css({
      rotate: '180deg',
    }),
    expandOptionsWrapper: css({
      display: 'flex',
      flexDirection: 'column',
      padding: theme.spacing(2, 1),
    }),
  };
}
