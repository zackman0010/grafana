import { DynamicTool } from '@langchain/core/tools';

export const toolSetSpeakingOff = new DynamicTool({
  name: 'set_speaking_off',
  description: "Disable the agent's ability to speak.",
  func: async () => {
    try {
      localStorage.setItem('grafana.dash.exp.canSpeak', 'false');
      return JSON.stringify({ success: true, canSpeak: false });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to disable speech' });
    }
  },
  metadata: {
    explainer: () => {
      return `disable speech`;
    },
  },
});
