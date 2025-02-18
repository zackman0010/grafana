import { NavModelItem } from '@grafana/data';
import { config } from '@grafana/runtime';

export const TOP_BAR_LEVEL_HEIGHT = config.featureToggles.unifiedNavbars ? 48 : 40;

export interface ToolbarUpdateProps {
  pageNav?: NavModelItem;
  actions?: React.ReactNode;
}

export interface HistoryEntryView {
  name: string;
  description: string;
  url: string;
  time: number;
}

export interface HistoryEntrySparkline {
  values: number[];
  range: {
    min: number;
    max: number;
    delta: number;
  };
}

export interface HistoryEntry {
  name: string;
  time: number;
  breadcrumbs: NavModelItem[];
  url: string;
  views: HistoryEntryView[];
  sparklineData?: HistoryEntrySparkline;
}
