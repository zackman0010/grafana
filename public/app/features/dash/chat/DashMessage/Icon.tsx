import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { Icon as IconUI } from '@grafana/ui';

import { getMessage } from '../utils';

export interface IconState extends SceneObjectState {}

export class Icon extends SceneObjectBase<IconState> {
  public static Component = IconRenderer;
}

function IconRenderer({ model }: SceneComponentProps<Icon>) {
  const { sender } = getMessage(model).useState();

  if (sender === 'system') {
    return null;
  }

  return <IconUI name={sender === 'ai' ? 'ai' : 'user'} />;
}
