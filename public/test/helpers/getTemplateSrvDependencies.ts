import { TemplateSrvDependencies } from 'app/features/templating/template_srv';

import {
  getFilteredVariables,
  getVariables,
  getVariableWithName,
} from '../../../packages/grafana-frontend/src/features/variables/state/selectors';
import { StoreState } from '../../../packages/grafana-frontend/src/types';

export const getTemplateSrvDependencies = (state: StoreState): TemplateSrvDependencies => ({
  getFilteredVariables: (filter) => getFilteredVariables(filter, state),
  getVariableWithName: (name) => getVariableWithName(name, state),
  getVariables: () => getVariables(state),
});
