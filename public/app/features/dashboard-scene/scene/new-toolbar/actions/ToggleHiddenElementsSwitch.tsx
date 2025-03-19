import { selectors } from '@grafana/e2e-selectors';
import { t } from 'app/core/internationalization';

import { ToolbarSwitch } from '../ToolbarSwitch';
import { ToolbarActionProps } from '../types';

export const ToggleHiddenElementsSwitch = ({ dashboard }: ToolbarActionProps) => (
  <ToolbarSwitch
    icon={dashboard.state.showHiddenElements ? 'eye' : 'eye-slash'}
    label={t('dashboard.toolbar.new.toggle-hidden-elements', 'Hide hidden elements')}
    checked={!dashboard.state.showHiddenElements}
    variant="blue"
    data-testid={selectors.components.PageToolbar.itemButton('toggle_hidden_elements')}
    onClick={(evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      dashboard.onToggleHiddenElements();
    }}
  />
);
