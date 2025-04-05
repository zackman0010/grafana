import { TypedVariableModel } from '@grafana/data';

import { getPreloadedState } from '../../../packages/grafana-frontend/src/features/variables/state/helpers';
import { VariablesState } from '../../../packages/grafana-frontend/src/features/variables/state/types';
import { StoreState } from '../../../packages/grafana-frontend/src/types';

export const convertToStoreState = (key: string, models: TypedVariableModel[]): StoreState => {
  const variables = models.reduce<VariablesState>((byName, variable) => {
    byName[variable.name] = variable;
    return byName;
  }, {});
  return {
    ...getPreloadedState(key, { variables }),
  } as StoreState;
};
