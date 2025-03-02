import { css } from '@emotion/css';
import { useEffect } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { IconButton, useStyles2 } from '@grafana/ui';

import { useDashAgent } from '../agent';

import { DashIndicators } from './DashIndicators';
import { DashInput } from './DashInput';
import { DashMessages } from './DashMessages';
import { DashSettings } from './DashSettings';

export interface DashChatState extends SceneObjectState {
  indicators: DashIndicators;
  input: DashInput;
  messages: DashMessages;
  settings: DashSettings;
  page: 'chat' | 'settings';
}

export class DashChat extends SceneObjectBase<DashChatState> {
  public static Component = DashChatRenderer;

  public get renderBeforeActivation(): boolean {
    return true;
  }

  public constructor() {
    super({
      indicators: new DashIndicators(),
      input: new DashInput(),
      messages: new DashMessages(),
      settings: new DashSettings(),
      page: 'chat',
    });
  }

  public updateDashAgent([messages, loading, askMessage]: ReturnType<typeof useDashAgent>) {
    this.state.input.updateAskMessage(askMessage);
    this.state.indicators.setLoading(loading);
    this.state.messages.updateMessages(messages);
  }

  public changePage(page: DashChatState['page']) {
    this.setState({ page });
  }
}

function DashChatRenderer({ model }: SceneComponentProps<DashChat>) {
  const styles = useStyles2(getStyles);
  const { input, messages, settings, page } = model.useState();
  const dashAgent = useDashAgent();

  useEffect(() => model.updateDashAgent(dashAgent), [dashAgent, model]);

  const isChatPage = page === 'chat';

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        {isChatPage ? (
          <>
            <messages.Component model={messages} />
            <input.Component model={input} />
          </>
        ) : (
          <settings.Component model={settings} />
        )}
      </div>
      <div className={styles.buttons}>
        {isChatPage ? (
          <IconButton name="cog" size="xs" aria-label="Settings" onClick={() => model.changePage('settings')} />
        ) : (
          <IconButton name="hipchat" size="xs" aria-label="Chat" onClick={() => model.changePage('chat')} />
        )}
      </div>
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    height: '100%',
    width: '100%',
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.shape.radius.default,
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: `1px solid ${theme.colors.border.weak}`,
  }),
  top: css({
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    flex: 1,
  }),
  buttons: css({
    backgroundColor: theme.colors.background.canvas,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: theme.spacing(1),
    borderTop: `1px solid ${theme.colors.border.strong}`,
  }),
});
