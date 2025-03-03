import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';

import { getMessage, getSettings } from '../utils';

import { Bubble } from './Bubble';

export interface ToolState extends SceneObjectState {
  content: {
    type: string;
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
  opened: boolean;
}

export class Tool extends SceneObjectBase<ToolState> {
  public static Component = ToolRenderer;

  public constructor(state: Omit<ToolState, 'opened'>) {
    super({
      opened: false,
      ...state,
    });
  }

  public toggleOpened() {
    this.setState({ opened: !this.state.opened });
  }
}

function ToolRenderer({ model }: SceneComponentProps<Tool>) {
  const { content } = model.useState();
  const { codeOverflow, showTools } = getSettings(model).useState();
  const { selected, sender, time } = getMessage(model).useState();

  if (!showTools) {
    return null;
  }

  return (
    <Bubble codeOverflow={codeOverflow} selected={selected} sender={sender} time={time}>
      <p>
        Using tool <b>{content.name} with the following input:</b>
      </p>
      <ul>
        {Object.entries(content.input).map(([key, value]) => (
          <li key={key}>
            <b>{key}:</b> {String(value)}
          </li>
        ))}
      </ul>
    </Bubble>
  );
}
