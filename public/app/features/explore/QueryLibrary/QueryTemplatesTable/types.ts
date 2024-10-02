import { DataQuery, DataSourceRef } from '@grafana/schema';
import { UserDTO } from 'app/types';

export type QueryTemplateRow = {
  index: string;
  datasourceName?: string;
  description?: string;
  query?: DataQuery;
  queryText?: string;
  datasourceRef?: DataSourceRef | null;
  datasourceType?: string;
  createdAtTimestamp?: number;
  user?: UserDTO;
  uid?: string;
};
