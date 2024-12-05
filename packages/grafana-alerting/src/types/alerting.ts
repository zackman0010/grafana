import {
  ReducerID,
  type AlertState,
  type DataQuery,
  type DataSourceInstanceSettings,
  type SelectableValue,
} from '@grafana/data';
import { type PromOptions } from '@grafana/prometheus';
import { config } from '@grafana/runtime';

import {
  Annotations,
  GrafanaAlertState,
  GrafanaAlertStateWithReason,
  Labels,
  mapStateWithReasonToBaseState,
  PromAlertingRuleState,
  PromRuleType,
  RulerRuleDTO,
  RulerRuleGroupDTO,
} from './alerting.dto';
import { LokiOptions } from './loki';

export type Alert = {
  activeAt: string;
  annotations: { [key: string]: string };
  labels: { [key: string]: string };
  state: Exclude<PromAlertingRuleState | GrafanaAlertStateWithReason, PromAlertingRuleState.Inactive>;
  value: string;
};

export function hasAlertState(alert: Alert, state: PromAlertingRuleState | GrafanaAlertState): boolean {
  return mapStateWithReasonToBaseState(alert.state) === state;
}

// Prometheus API uses "err" but grafana API uses "error" *sigh*
export type RuleHealth = 'nodata' | 'error' | 'err' | string;

interface RuleBase {
  health: RuleHealth;
  name: string;
  query: string;
  lastEvaluation?: string;
  evaluationTime?: number;
  lastError?: string;
}

export interface AlertingRule extends RuleBase {
  alerts?: Alert[];
  labels?: {
    [key: string]: string;
  };
  annotations?: {
    [key: string]: string;
  };
  state: PromAlertingRuleState;
  type: PromRuleType.Alerting;

  /**
   * Pending period in seconds, aka for. 0 or undefined means no pending period
   */
  duration?: number;
  totals?: Partial<Record<Lowercase<GrafanaAlertState>, number>>;
  totalsFiltered?: Partial<Record<Lowercase<GrafanaAlertState>, number>>;
  activeAt?: string; // ISO timestamp
}

export interface RecordingRule extends RuleBase {
  type: PromRuleType.Recording;

  labels?: {
    [key: string]: string;
  };
}

export type Rule = AlertingRule | RecordingRule;

export type BaseRuleGroup = { name: string };

type TotalsWithoutAlerting = Exclude<AlertInstanceTotalState, AlertInstanceTotalState.Alerting>;
enum FiringTotal {
  Firing = 'firing',
}
export interface RuleGroup {
  name: string;
  interval: number;
  rules: Rule[];
  // totals only exist for Grafana Managed rules
  totals?: Partial<Record<TotalsWithoutAlerting | FiringTotal, number>>;
}

export interface RuleNamespace {
  dataSourceName: string;
  name: string;
  groups: RuleGroup[];
}

export interface RulesSourceResult {
  dataSourceName: string;
  error?: unknown;
  namespaces?: RuleNamespace[];
}

export type RulesSource = DataSourceInstanceSettings<PromOptions | LokiOptions> | 'grafana';

// combined prom and ruler result
export interface CombinedRule {
  name: string;
  query: string;
  labels: Labels;
  annotations: Annotations;
  promRule?: Rule;
  rulerRule?: RulerRuleDTO;
  group: CombinedRuleGroup;
  namespace: CombinedRuleNamespace;
  instanceTotals: AlertInstanceTotals;
  filteredInstanceTotals: AlertInstanceTotals;
}

// export type AlertInstanceState = PromAlertingRuleState | 'nodata' | 'error';
export enum AlertInstanceTotalState {
  Alerting = 'alerting',
  Pending = 'pending',
  Normal = 'inactive',
  NoData = 'nodata',
  Error = 'error',
}

export type AlertInstanceTotals = Partial<Record<AlertInstanceTotalState, number>>;

// AlertGroupTotals also contain the amount of recording and paused rules
export type AlertGroupTotals = Partial<Record<AlertInstanceTotalState | 'paused' | 'recording', number>>;

export interface CombinedRuleGroup {
  name: string;
  interval?: string;
  source_tenants?: string[];
  rules: CombinedRule[];
  totals: AlertGroupTotals;
}

export interface CombinedRuleNamespace {
  rulesSource: RulesSource;
  name: string;
  groups: CombinedRuleGroup[];
  uid?: string; //available only in grafana rules
}

export interface RuleWithLocation<T = RulerRuleDTO> {
  ruleSourceName: string;
  namespace: string;
  namespace_uid?: string; // Grafana folder UID
  group: RulerRuleGroupDTO;
  rule: T;
}

// identifier for where we can find a RuleGroup
export interface RuleGroupIdentifier {
  dataSourceName: string;
  /** ⚠️ use the Grafana folder UID for Grafana-managed rules */
  namespaceName: string;
  groupName: string;
}

export type CombinedRuleWithLocation = CombinedRule & RuleGroupIdentifier;

export interface PromRuleWithLocation {
  rule: AlertingRule;
  dataSourceName: string;
  namespaceName: string;
  groupName: string;
}

export interface CloudRuleIdentifier {
  ruleSourceName: string;
  namespace: string;
  groupName: string;
  ruleName: string;
  rulerRuleHash: string;
}
export interface GrafanaRuleIdentifier {
  ruleSourceName: 'grafana';
  uid: string;
}

// Rule read directly from Prometheus without existing in the ruler API
export interface PrometheusRuleIdentifier {
  ruleSourceName: string;
  namespace: string;
  groupName: string;
  ruleName: string;
  ruleHash: string;
}

export type RuleIdentifier = EditableRuleIdentifier | PrometheusRuleIdentifier;

/**
 * This type is a union of all rule identifiers that should have a ruler API
 *
 * We do not support PrometheusRuleIdentifier because vanilla Prometheus has no ruler API
 */
export type EditableRuleIdentifier = CloudRuleIdentifier | GrafanaRuleIdentifier;

export interface FilterState {
  queryString?: string;
  dataSource?: string;
  alertState?: string;
  groupBy?: string[];
  ruleType?: string;
}

export interface SilenceFilterState {
  queryString?: string;
  silenceState?: string;
}

interface EvalMatch {
  metric: string;
  tags?: Record<string, string>;
  value: number;
}

export interface StateHistoryItemData {
  noData?: boolean;
  evalMatches?: EvalMatch[];
}

export interface StateHistoryItem {
  id: number;
  alertId: number;
  alertName: string;
  dashboardId: number;
  panelId: number;
  userId: number;
  newState: AlertState;
  prevState: AlertState;
  created: number;
  updated: number;
  time: number;
  timeEnd: number;
  text: string;
  tags: string[];
  login: string;
  email: string;
  avatarUrl: string;
  data: StateHistoryItemData;
}

export interface RulerDataSourceConfig {
  dataSourceName: string;
  apiVersion: 'legacy' | 'config';
}

export interface PromBasedDataSource {
  name: string;
  id: string | number;
  rulerConfig?: RulerDataSourceConfig;
}

export interface PaginationProps {
  itemsPerPage: number;
}

/**
 * MATCHES a constant in DataSourceWithBackend
 */
export const ExpressionDatasourceUID = '__expr__';

export enum ExpressionQueryType {
  math = 'math',
  reduce = 'reduce',
  resample = 'resample',
  classic = 'classic_conditions',
  threshold = 'threshold',
  sql = 'sql',
}

export const getExpressionLabel = (type: ExpressionQueryType) => {
  switch (type) {
    case ExpressionQueryType.math:
      return 'Math';
    case ExpressionQueryType.reduce:
      return 'Reduce';
    case ExpressionQueryType.resample:
      return 'Resample';
    case ExpressionQueryType.classic:
      return 'Classic condition (legacy)';
    case ExpressionQueryType.threshold:
      return 'Threshold';
    case ExpressionQueryType.sql:
      return 'SQL';
  }
};

export const expressionTypes: Array<SelectableValue<ExpressionQueryType>> = [
  {
    value: ExpressionQueryType.math,
    label: 'Math',
    description: 'Free-form math formulas on time series or number data.',
  },
  {
    value: ExpressionQueryType.reduce,
    label: 'Reduce',
    description:
      'Takes one or more time series returned from a query or an expression and turns each series into a single number.',
  },
  {
    value: ExpressionQueryType.resample,
    label: 'Resample',
    description: 'Changes the time stamps in each time series to have a consistent time interval.',
  },
  {
    value: ExpressionQueryType.classic,
    label: 'Classic condition (legacy)',
    description:
      'Takes one or more time series returned from a query or an expression and checks if any of the series match the condition. Disables multi-dimensional alerts for this rule.',
  },
  {
    value: ExpressionQueryType.threshold,
    label: 'Threshold',
    description:
      'Takes one or more time series returned from a query or an expression and checks if any of the series match the threshold condition.',
  },
  {
    value: ExpressionQueryType.sql,
    label: 'SQL',
    description: 'Transform data using SQL. Supports Aggregate/Analytics functions from DuckDB',
  },
].filter((expr) => {
  if (expr.value === ExpressionQueryType.sql) {
    return config.featureToggles?.sqlExpressions;
  }
  return true;
});

export const reducerTypes: Array<SelectableValue<string>> = [
  { value: ReducerID.min, label: 'Min', description: 'Get the minimum value' },
  { value: ReducerID.max, label: 'Max', description: 'Get the maximum value' },
  { value: ReducerID.mean, label: 'Mean', description: 'Get the average value' },
  { value: ReducerID.median, label: 'Median', description: 'Get the median value' },
  { value: ReducerID.sum, label: 'Sum', description: 'Get the sum of all values' },
  { value: ReducerID.count, label: 'Count', description: 'Get the number of values' },
  { value: ReducerID.last, label: 'Last', description: 'Get the last value' },
];

export enum ReducerMode {
  Strict = '', // backend API wants an empty string to support "strict" mode
  ReplaceNonNumbers = 'replaceNN',
  DropNonNumbers = 'dropNN',
}

export const reducerModes: Array<SelectableValue<ReducerMode>> = [
  {
    value: ReducerMode.Strict,
    label: 'Strict',
    description: 'Result can be NaN if series contains non-numeric data',
  },
  {
    value: ReducerMode.DropNonNumbers,
    label: 'Drop Non-numeric Values',
    description: 'Drop NaN, +/-Inf and null from input series before reducing',
  },
  {
    value: ReducerMode.ReplaceNonNumbers,
    label: 'Replace Non-numeric Values',
    description: 'Replace NaN, +/-Inf and null with a constant value before reducing',
  },
];

export const downsamplingTypes: Array<SelectableValue<string>> = [
  { value: ReducerID.last, label: 'Last', description: 'Fill with the last value' },
  { value: ReducerID.min, label: 'Min', description: 'Fill with the minimum value' },
  { value: ReducerID.max, label: 'Max', description: 'Fill with the maximum value' },
  { value: ReducerID.mean, label: 'Mean', description: 'Fill with the average value' },
  { value: ReducerID.sum, label: 'Sum', description: 'Fill with the sum of all values' },
];

export const upsamplingTypes: Array<SelectableValue<string>> = [
  { value: 'pad', label: 'pad', description: 'fill with the last known value' },
  { value: 'backfilling', label: 'backfilling', description: 'fill with the next known value' },
  { value: 'fillna', label: 'fillna', description: 'Fill with NaNs' },
];

export enum EvalFunction {
  'IsAbove' = 'gt',
  'IsBelow' = 'lt',
  'IsOutsideRange' = 'outside_range',
  'IsWithinRange' = 'within_range',
  'HasNoValue' = 'no_value',
}

export const thresholdFunctions: Array<SelectableValue<EvalFunction>> = [
  { value: EvalFunction.IsAbove, label: 'Is above' },
  { value: EvalFunction.IsBelow, label: 'Is below' },
  { value: EvalFunction.IsWithinRange, label: 'Is within range' },
  { value: EvalFunction.IsOutsideRange, label: 'Is outside range' },
];

/**
 * For now this is a single object to cover all the types.... would likely
 * want to split this up by type as the complexity increases
 */
export interface ExpressionQuery extends DataQuery {
  type: ExpressionQueryType;
  reducer?: string;
  expression?: string;
  window?: string;
  downsampler?: string;
  upsampler?: string;
  conditions?: ClassicCondition[];
  settings?: ExpressionQuerySettings;
}

export interface ThresholdExpressionQuery extends ExpressionQuery {
  conditions: ClassicCondition[];
}
export interface ExpressionQuerySettings {
  mode?: ReducerMode;
  replaceWithValue?: number;
}

export interface ClassicCondition {
  evaluator: {
    params: number[];
    type: EvalFunction;
  };
  unloadEvaluator?: {
    params: number[];
    type: EvalFunction;
  };
  operator?: {
    type: string;
  };
  query: {
    params: string[];
  };
  reducer: {
    params: [];
    type: ReducerType;
  };
  type: 'query';
}

export type ReducerType =
  | 'avg'
  | 'min'
  | 'max'
  | 'sum'
  | 'count'
  | 'last'
  | 'median'
  | 'diff'
  | 'diff_abs'
  | 'percent_diff'
  | 'percent_diff_abs'
  | 'count_non_null';
