import { GrafanaTheme2, NavModelItem } from '@grafana/data';
export const getTopBarHeight = (theme: GrafanaTheme2) => 5 * theme.spacing.gridSize;

export interface ToolbarUpdateProps {
  pageNav?: NavModelItem;
  actions?: React.ReactNode;
}
