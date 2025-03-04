import { css } from '@emotion/css';

import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { TabContent, useStyles2 } from '@grafana/ui';

import { DashInput } from './DashInput';
import { DashMessages } from './DashMessages';

export interface DashChatState extends SceneObjectState {
  input: DashInput;
  messages: DashMessages;
  timestamp: Date;
}

export class DashChat extends SceneObjectBase<DashChatState> {
  public static Component = DashChatRenderer;

  public constructor(state: Partial<Omit<DashChatState, 'timestamp'>>) {
    super({
      input: state.input ?? new DashInput({}),
      messages: state.messages ?? new DashMessages({}),
      timestamp: new Date(),
    });
  }
}

function DashChatRenderer({ model }: SceneComponentProps<DashChat>) {
  const styles = useStyles2(getStyles);
  const { messages, input } = model.useState();

  return (
    <TabContent className={styles.top}>
      <messages.Component model={messages} />
      <input.Component model={input} />
    </TabContent>
  );
}

const getStyles = () => ({
  top: css({
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    flex: 1,
  }),
});
