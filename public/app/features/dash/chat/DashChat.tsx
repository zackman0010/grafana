import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { TabContent, useStyles2 } from '@grafana/ui';

import { DashIndicators } from './DashIndicators';
import { DashInput } from './DashInput';
import { DashMessages } from './DashMessages';

export interface DashChatState extends SceneObjectState {
  name: string;
  indicators: DashIndicators;
  input: DashInput;
  messages: DashMessages;
}

export class DashChat extends SceneObjectBase<DashChatState> {
  public static Component = DashChatRenderer;

  public constructor(state: Pick<DashChatState, 'name'>) {
    super({
      ...state,
      indicators: new DashIndicators(),
      input: new DashInput(),
      messages: new DashMessages(),
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

const getStyles = (theme: GrafanaTheme2) => ({
  top: css({
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    flex: 1,
  }),
});
