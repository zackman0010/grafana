import { DynamicTool } from '@langchain/core/tools';

export const toolSetSpeakingOn = new DynamicTool({
  name: 'set_speaking_on',
  description: "Enable the agent's ability to speak. This will set the voice to `Google UK English Female` by default.",
  func: async () => {
    try {
      localStorage.setItem('grafana.dash.exp.canSpeak', 'true');
      return JSON.stringify({ success: true, canSpeak: true });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to enable speech' });
    }
  },
  metadata: {
    explainer: () => {
      return `enable speech`;
    },
  },
});
