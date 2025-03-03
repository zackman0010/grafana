import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';

import { DashMessage } from './DashMessage/DashMessage';

export interface DashIndicatorsState extends SceneObjectState {
  loading: boolean;
  loadingIndicator: DashMessage;
  typing: boolean;
  typingIndicator: DashMessage;
}

export class DashIndicators extends SceneObjectBase<DashIndicatorsState> {
  public static Component = DashIndicatorsRenderer;

  public constructor() {
    super({
      loading: false,
      loadingIndicator: new DashMessage({
        sender: 'ai',
        content: '',
        indicator: true,
        timestamp: new Date(),
      }),
      typing: false,
      typingIndicator: new DashMessage({
        sender: 'user',
        content: '',
        indicator: true,
        timestamp: new Date(),
      }),
    });
  }

  public setLoading(loading: boolean) {
    if (loading !== this.state.loading) {
      this.setState({ loading });
    }
  }

  public setTyping(typing: boolean) {
    if (typing !== this.state.typing) {
      this.setState({ typing });
    }
  }
}

function DashIndicatorsRenderer({ model }: SceneComponentProps<DashIndicators>) {
  const { loading, loadingIndicator, typing, typingIndicator } = model.useState();

  return (
    <>
      {loading && <loadingIndicator.Component model={loadingIndicator} />}
      {typing && <typingIndicator.Component model={typingIndicator} />}
    </>
  );
}
