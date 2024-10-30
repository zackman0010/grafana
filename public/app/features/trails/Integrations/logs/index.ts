import type { DataSourceSettings } from '@grafana/data';

export type FoundLokiDataSource = Pick<DataSourceSettings, 'name' | 'uid'>;

/**
 * An abstract class that defines the interface for connecting metrics and their related logs.
 * Implementations of this class should provide methods for retrieving Loki data sources associated
 * with a metric. By using this class, the `RelatedLogsScene` can orchestrate the retrieval of logs
 * without needing to know the specifics of how we're associated logs with a given metric.
 */
export abstract class MetricsLogsConnector {
  /**
   * Retrieves the Loki data sources associated with the specified metric.
   */
  abstract getDataSources(selectedMetric: string): Promise<FoundLokiDataSource[]>;

  /**
   * Constructs a Loki query expression for the specified metric and data source.
   */
  abstract getLokiQueryExpr(selectedMetric: string, datasourceUid: string): string;
}
