import { css, cx } from '@emotion/css';
import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom-v5-compat';

import { GrafanaTheme2, PageLayoutType } from '@grafana/data';
import { useChromeHeaderHeight } from '@grafana/runtime';
import { SceneComponentProps } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';
import { EntityNotFound } from 'app/core/components/PageNotFound/EntityNotFound';
import { getNavModel } from 'app/core/selectors/navModel';
import DashboardEmpty from 'app/features/dashboard/dashgrid/DashboardEmpty';
import { useSelector } from 'app/types';

import { DashboardEditWrapper } from '../edit-pane/DashboardEditWrapper';

import { DashboardScene } from './DashboardScene';
import { NavToolbarActions } from './NavToolbarActions';
import { PanelSearchLayout } from './PanelSearchLayout';
import { DashboardAngularDeprecationBanner } from './angular/DashboardAngularDeprecationBanner';

export function DashboardSceneRenderer({ model }: SceneComponentProps<DashboardScene>) {
  const {
    controls,
    overlay,
    editview,
    editPanel,
    isEmpty,
    meta,
    viewPanelScene,
    panelSearch,
    panelsPerRow,
    isEditing,
  } = model.useState();
  const headerHeight = useChromeHeaderHeight();
  const styles = useStyles2(getStyles, headerHeight ?? 0);
  const location = useLocation();
  const navIndex = useSelector((state) => state.navIndex);
  const pageNav = model.getPageNav(location, navIndex);
  const bodyToRender = model.getBodyToRender();
  const navModel = getNavModel(navIndex, 'dashboards/browse');
  const hasControls = controls?.hasControls();
  const isSettingsOpen = editview !== undefined;

  // Remember scroll pos when going into view panel, edit panel or settings
  useMemo(() => {
    if (viewPanelScene || isSettingsOpen || editPanel) {
      model.rememberScrollPos();
    }
  }, [isSettingsOpen, editPanel, viewPanelScene, model]);

  // Restore scroll pos when coming back
  useEffect(() => {
    if (!viewPanelScene && !isSettingsOpen && !editPanel) {
      model.restoreScrollPos();
    }
  }, [isSettingsOpen, editPanel, viewPanelScene, model]);

  if (editview) {
    return (
      <>
        <editview.Component model={editview} />
        {overlay && <overlay.Component model={overlay} />}
      </>
    );
  }

  function renderBody() {
    if (meta.dashboardNotFound) {
      return <EntityNotFound entity="Dashboard" key="dashboard-not-found" />;
    }

    if (panelSearch || panelsPerRow) {
      return <PanelSearchLayout panelSearch={panelSearch} panelsPerRow={panelsPerRow} dashboard={model} />;
    }

    return (
      <>
        <DashboardAngularDeprecationBanner dashboard={model} key="angular-deprecation-banner" />
        {isEmpty && (
          <DashboardEmpty dashboard={model} canCreate={!!model.state.meta.canEdit} key="dashboard-empty-state" />
        )}
        <div
          className={cx(styles.body, !hasControls && styles.bodyWithoutControls, isEditing && styles.bodyEditing)}
          key="dashboard-panels"
        >
          <bodyToRender.Component model={bodyToRender} />
        </div>
      </>
    );
  }

  function renderCanvas() {
    return (
      <DashboardEditWrapper dashboard={model} isEditing={isEditing}>
        <NavToolbarActions dashboard={model} />
        {controls && (
          <div className={cx(styles.controlsWrapper, !isEditing && styles.controlsWrapperSticky)}>
            <controls.Component model={controls} />
          </div>
        )}
        <div className={cx(styles.canvasContent, isEditing && styles.canvasEditing)}>{renderBody()}</div>
      </DashboardEditWrapper>
    );
  }

  return (
    <Page navModel={navModel} pageNav={pageNav} layout={PageLayoutType.Custom}>
      {editPanel && <editPanel.Component model={editPanel} />}
      {!editPanel && renderCanvas()}
      {overlay && <overlay.Component model={overlay} />}
    </Page>
  );
}

function getStyles(theme: GrafanaTheme2, headerHeight: number) {
  return {
    controlsWrapper: css({
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 0,
      padding: theme.spacing(2),
      ':empty': {
        display: 'none',
      },
    }),
    controlsWrapperSticky: css({
      [theme.breakpoints.up('md')]: {
        position: 'sticky',
        zIndex: theme.zIndex.activePanel,
        background: theme.colors.background.canvas,
        top: headerHeight,
      },
    }),
    canvasContent: css({
      label: 'canvas-content',
      display: 'flex',
      flexDirection: 'column',
      padding: theme.spacing(0.5, 2),
      flexBasis: '100%',
      flexGrow: 1,
      minWidth: 0,
      overflow: 'auto',
      scrollbarWidth: 'thin',
    }),
    canvasEditing: css({
      overflow: 'auto',
    }),
    body: css({
      label: 'body',
      flexGrow: 1,
      display: 'flex',
      gap: '8px',
      paddingBottom: theme.spacing(2),
      boxSizing: 'border-box',
    }),
    bodyWithoutControls: css({
      paddingTop: theme.spacing(2),
    }),
    bodyEditing: css({
      position: 'absolute',
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    }),
  };
}
