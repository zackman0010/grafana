import { DashboardModel } from '../../../packages/grafana-frontend/src/features/dashboard/state/DashboardModel';
import { DashboardMeta } from '../../../packages/grafana-frontend/src/types/dashboard';

export const getDashboardModel = (json: any, meta: DashboardMeta = {}) => {
  const getVariablesFromState = () => json.templating.list;
  return new DashboardModel(json, meta, { getVariablesFromState });
};
