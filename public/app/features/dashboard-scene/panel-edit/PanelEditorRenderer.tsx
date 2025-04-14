import { css, cx } from '@emotion/css';
import { useEffect } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { SceneComponentProps, VizPanel } from '@grafana/scenes';
import { Button, Spinner, ToolbarButton, useStyles2 } from '@grafana/ui';
import { t } from 'app/core/internationalization';

import { useEditPaneCollapsed } from '../edit-pane/shared';
import { NavToolbarActions } from '../scene/NavToolbarActions';
import { UnlinkModal } from '../scene/UnlinkModal';
import { getDashboardSceneFor, getLibraryPanelBehavior } from '../utils/utils';

import { PanelEditor } from './PanelEditor';
import { SaveLibraryVizPanelModal } from './SaveLibraryVizPanelModal';
import { useSnappingSplitter } from './splitter/useSnappingSplitter';

export function PanelEditorRenderer({ model }: SceneComponentProps<PanelEditor>) {
  const dashboard = getDashboardSceneFor(model);
  const { optionsPane } = model.useState();
  const styles = useStyles2(getStyles);
  const [isCollapsed, setIsCollapsed] = useEditPaneCollapsed();

  const { containerProps, primaryProps, secondaryProps, splitterProps, splitterState, onToggleCollapse } =
    useSnappingSplitter({
      direction: 'row',
      dragPosition: 'end',
      initialSize: 330,
      usePixels: true,
      collapsed: isCollapsed,
      collapseBelowPixels: 250,
    });

  useEffect(() => {
    setIsCollapsed(splitterState.collapsed);
  }, [splitterState.collapsed, setIsCollapsed]);

  return (
    <>
      <NavToolbarActions dashboard={dashboard} />
      <div
        {...containerProps}
        className={cx(containerProps.className, styles.content)}
        data-testid={selectors.components.PanelEditor.General.content}
      >
        <div {...primaryProps} className={cx(primaryProps.className, styles.body)}>
          <VizAndDataPane model={model} />
        </div>
        <div {...splitterProps} />
        <div {...secondaryProps} className={cx(secondaryProps.className, styles.optionsPane)}>
          {splitterState.collapsed && (
            <div className={styles.expandOptionsWrapper}>
              <ToolbarButton
                tooltip={t('dashboard-scene.panel-editor-renderer.tooltip-open-options-pane', 'Open options pane')}
                icon={'arrow-to-right'}
                onClick={onToggleCollapse}
                variant="canvas"
                className={styles.rotate180}
                aria-label={t(
                  'dashboard-scene.panel-editor-renderer.aria-label-open-options-pane',
                  'Open options pane'
                )}
              />
            </div>
          )}
          {!splitterState.collapsed && optionsPane && <optionsPane.Component model={optionsPane} />}
          {!splitterState.collapsed && !optionsPane && <Spinner />}
        </div>
      </div>
    </>
  );
}

function VizAndDataPane({ model }: SceneComponentProps<PanelEditor>) {
  const dashboard = getDashboardSceneFor(model);
  const { dataPane, showLibraryPanelSaveModal, showLibraryPanelUnlinkModal, tableView } = model.useState();
  const panel = model.getPanel();
  const libraryPanel = getLibraryPanelBehavior(panel);
  const { controls } = dashboard.useState();
  const styles = useStyles2(getStyles);

  // Main splitter for viz + table / data pane
  const { containerProps, primaryProps, secondaryProps, splitterProps, splitterState, onToggleCollapse } =
    useSnappingSplitter({
      direction: 'column',
      dragPosition: 'start',
      initialSize: 0.5,
      collapseBelowPixels: 150,
    });

  // Nested splitter for viz / table
  const {
    containerProps: vizContainerProps,
    primaryProps: vizPrimaryProps,
    secondaryProps: vizSecondaryProps,
    splitterProps: vizSplitterProps,
    splitterState: vizSplitterState,
    onToggleCollapse: onToggleVizSplit,
  } = useSnappingSplitter({
    direction: 'column',
    dragPosition: 'start',
    initialSize: 0.7,
    collapseBelowPixels: 100,
    collapsed: !tableView,
  });

  containerProps.className = cx(containerProps.className, styles.container);
  vizContainerProps.className = cx(vizContainerProps.className, styles.vizContainer);

  if (!dataPane) {
    primaryProps.style.flexGrow = 1;
  }

  return (
    <div className={cx(styles.pageContainer, controls && styles.pageContainerWithControls)}>
      {controls && (
        <div className={styles.controlsWrapper}>
          <controls.Component model={controls} />
        </div>
      )}
      <div {...containerProps}>
        <div {...primaryProps}>
          <div {...vizContainerProps}>
            <div {...vizPrimaryProps}>
              <div className={styles.vizWrapper}>
                <panel.Component model={panel} />
              </div>
            </div>
            {tableView && (
              <>
                <div {...vizSplitterProps} />
                <div {...vizSecondaryProps} className={styles.tableWrapper}>
                  {vizSplitterState.collapsed && (
                    <div className={styles.expandTablePane}>
                      <Button
                        tooltip={t('dashboard-scene.viz-and-data-pane.tooltip-open-table-pane', 'Show data table')}
                        icon={'table'}
                        onClick={onToggleVizSplit}
                        variant="secondary"
                        size="sm"
                        className={styles.openTablePaneButton}
                        aria-label={t(
                          'dashboard-scene.viz-and-data-pane.aria-label-open-table-pane',
                          'Show data table'
                        )}
                      />
                    </div>
                  )}
                  {!vizSplitterState.collapsed && tableView && <tableView.Component model={tableView} />}
                </div>
              </>
            )}
          </div>
        </div>
        {showLibraryPanelSaveModal && libraryPanel && (
          <SaveLibraryVizPanelModal
            libraryPanel={libraryPanel}
            onDismiss={model.onDismissLibraryPanelSaveModal}
            onConfirm={model.onConfirmSaveLibraryPanel}
            onDiscard={model.onDiscard}
          ></SaveLibraryVizPanelModal>
        )}
        {showLibraryPanelUnlinkModal && libraryPanel && (
          <UnlinkModal
            onDismiss={model.onDismissUnlinkLibraryPanelModal}
            onConfirm={model.onConfirmUnlinkLibraryPanel}
            isOpen
          />
        )}
        {dataPane && (
          <>
            <div {...splitterProps} />
            <div {...secondaryProps}>
              {splitterState.collapsed && (
                <div className={styles.expandDataPane}>
                  <Button
                    tooltip={t('dashboard-scene.viz-and-data-pane.tooltip-open-query-pane', 'Open query pane')}
                    icon={'arrow-to-right'}
                    onClick={onToggleCollapse}
                    variant="secondary"
                    size="sm"
                    className={styles.openDataPaneButton}
                    aria-label={t('dashboard-scene.viz-and-data-pane.aria-label-open-query-pane', 'Open query pane')}
                  />
                </div>
              )}
              {!splitterState.collapsed && <dataPane.Component model={dataPane} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    pageContainer: css({
      display: 'grid',
      gridTemplateAreas: `
        "panels"`,
      gridTemplateColumns: `1fr`,
      gridTemplateRows: '1fr',
      height: '100%',
    }),
    pageContainerWithControls: css({
      gridTemplateAreas: `
        "controls"
        "panels"`,
      gridTemplateRows: 'auto 1fr',
    }),
    container: css({
      gridArea: 'panels',
      height: '100%',
    }),
    canvasContent: css({
      label: 'canvas-content',
      display: 'flex',
      flexDirection: 'column',
      flexBasis: '100%',
      flexGrow: 1,
      minHeight: 0,
      width: '100%',
    }),
    content: css({
      position: 'absolute',
      width: '100%',
      height: '100%',
    }),
    body: css({
      label: 'body',
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    }),
    optionsPane: css({
      flexDirection: 'column',
      borderLeft: `1px solid ${theme.colors.border.weak}`,
      background: theme.colors.background.primary,
      marginTop: theme.spacing(2),
      borderTop: `1px solid ${theme.colors.border.weak}`,
      borderTopLeftRadius: theme.shape.radius.default,
    }),
    expandOptionsWrapper: css({
      display: 'flex',
      flexDirection: 'column',
      padding: theme.spacing(2, 1),
    }),
    expandDataPane: css({
      display: 'flex',
      flexDirection: 'row',
      padding: theme.spacing(1),
      borderTop: `1px solid ${theme.colors.border.weak}`,
      borderRight: `1px solid ${theme.colors.border.weak}`,
      background: theme.colors.background.primary,
      flexGrow: 1,
      justifyContent: 'space-around',
    }),
    rotate180: css({
      rotate: '180deg',
    }),
    controlsWrapper: css({
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 0,
      gridArea: 'controls',
    }),
    openDataPaneButton: css({
      width: theme.spacing(8),
      justifyContent: 'center',
      svg: {
        rotate: '-90deg',
      },
    }),
    vizContainer: css({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
    }),
    tableWrapper: css({
      borderTop: `1px solid ${theme.colors.border.weak}`,
      background: theme.colors.background.primary,
    }),
    expandTablePane: css({
      display: 'flex',
      flexDirection: 'row',
      padding: theme.spacing(1),
      borderTop: `1px solid ${theme.colors.border.weak}`,
      borderRight: `1px solid ${theme.colors.border.weak}`,
      background: theme.colors.background.primary,
      flexGrow: 1,
      justifyContent: 'space-around',
    }),
    openTablePaneButton: css({
      width: theme.spacing(8),
      justifyContent: 'center',
    }),
    vizWrapper: css({
      height: '100%',
      width: '100%',
      paddingLeft: theme.spacing(2),
    }),
  };
}
