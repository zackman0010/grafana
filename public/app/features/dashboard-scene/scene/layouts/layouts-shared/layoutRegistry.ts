import { Registry } from '@grafana/data';

import { LayoutRegistryItem } from '../../types/LayoutRegistryItem';
import { DefaultGridLayoutManager } from '../layout-default/DefaultGridLayoutManager';
import { ResponsiveGridLayoutManager } from '../layout-responsive-grid/ResponsiveGridLayoutManager';
import { RowsLayoutManager } from '../layout-rows/RowsLayoutManager';

export const layoutRegistry: Registry<LayoutRegistryItem> = new Registry<LayoutRegistryItem>(() => {
  return [DefaultGridLayoutManager.descriptor, ResponsiveGridLayoutManager.descriptor, RowsLayoutManager.descriptor];
});
