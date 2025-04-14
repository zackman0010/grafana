import { selectors } from '@grafana/e2e-selectors';
import { InlineSwitch } from '@grafana/ui';
import { t } from 'app/core/internationalization';

import { PanelEditor } from './PanelEditor';

export interface Props {
  panelEditor: PanelEditor;
}

export function PanelEditControls({ panelEditor }: Props) {
  // Table view is now controlled by a collapsable section
  return <></>;
}
