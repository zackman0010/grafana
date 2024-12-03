// copy pasted this from the Loki data source, it's not a separate package so here we are
import { DataSourceJsonData } from '@grafana/schema';

export interface LokiOptions extends DataSourceJsonData {
  maxLines?: string;
  derivedFields?: DerivedFieldConfig[];
  alertmanager?: string;
  keepCookies?: string[];
  predefinedOperations?: string;
}

export type DerivedFieldConfig = {
  matcherRegex: string;
  name: string;
  url?: string;
  urlDisplayLabel?: string;
  datasourceUid?: string;
  matcherType?: 'label' | 'regex';
  targetBlank?: boolean;
};
