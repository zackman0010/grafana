import { css } from '@emotion/css';

import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { TabContent, useStyles2 } from '@grafana/ui';

import { DashInput } from './DashInput';
import { DashMessages } from './DashMessages';
import { SerializedDashChatInstance } from './types';

interface DashChatInstanceState extends SceneObjectState {
  input: DashInput;
  messages: DashMessages;
  timestamp: Date;
}

export class DashChatInstance extends SceneObjectBase<DashChatInstanceState> {
  public static Component = DashChatInstanceRenderer;

  public constructor(state: Partial<DashChatInstanceState>) {
    super({
      input: state.input ?? new DashInput({}),
      messages: state.messages ?? new DashMessages({}),
      timestamp: state.timestamp ?? new Date(),
    });
  }

  public toJSON(): SerializedDashChatInstance {
    return {
      messages: this.state.messages.toJSON(),
      timestamp: this.state.timestamp.getTime(),
    };
  }
}

function DashChatInstanceRenderer({ model }: SceneComponentProps<DashChatInstance>) {
  const styles = useStyles2(getStyles);
  const { messages, input } = model.useState();

  return (
    <TabContent className={styles.container}>
      <messages.Component model={messages} />
      <input.Component model={input} />
    </TabContent>
  );
}

const getStyles = () => ({
  container: css({
    label: 'dash-chat-instance-container',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    flex: 1,
  }),
});
