import { css } from '@emotion/css';
import { useEffect } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';

import { useDashAgent } from '../agent';

import { DashIndicators } from './DashIndicators';
import { DashInput } from './DashInput';
import { DashMessages } from './DashMessages';
import { DashSettings, DashSettingsState } from './DashSettings';

export interface DashChatState extends SceneObjectState {
  indicators: DashIndicators;
  input: DashInput;
  messages: DashMessages;
  settings: DashSettings;
  opened: boolean;
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
      opened: false,
    });

    this.activate();
    this.state.indicators.activate();
    this.state.settings.activate();
  }

  public updateDashAgent([messages, loading, askMessage]: ReturnType<typeof useDashAgent>) {
    this.state.input.updateAskMessage(askMessage);
    this.state.indicators.setLoading(loading);
    this.state.messages.updateMessages(messages);
  }

  public setOpened(opened: boolean) {
    if (opened !== this.state.opened) {
      this.setState({ opened });
    }
  }
}

function DashChatRenderer({ model }: SceneComponentProps<DashChat>) {
  const { input, messages, settings } = model.useState();
  const { mode } = settings.useState();
  const styles = useStyles2(getStyles, mode);

  const dashAgent = useDashAgent();
  useEffect(() => model.updateDashAgent(dashAgent), [dashAgent, model]);

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <messages.Component model={messages} />
        <input.Component model={input} />
      </div>
      <settings.Component model={settings} />
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2, mode: DashSettingsState['mode']) => ({
  container: css({
    height: '100%',
    width: '100%',
    backgroundColor: theme.colors.background.primary,
    borderRadius: mode === 'floating' ? theme.shape.radius.default : '0',
    boxShadow: mode === 'floating' ? '0 8px 30px rgba(0, 0, 0, 0.3)' : 'none',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: `1px solid ${theme.colors.border.weak}`,
    ...(mode === 'sidebar' && {
      borderTop: 'none',
      borderBottom: 'none',
    }),
  }),
  top: css({
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    flex: 1,
  }),
});

export const dashChat = new DashChat();
