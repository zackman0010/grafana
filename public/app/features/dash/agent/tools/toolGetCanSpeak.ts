import { DynamicTool } from '@langchain/core/tools';

export const toolGetCanSpeak = new DynamicTool({
  name: 'get_can_speak',
  description: 'Get whether the agent can speak (read from localStorage)',
  func: async () => {
    const canSpeak = localStorage.getItem('grafana.dash.exp.canSpeak') === 'true';
    return JSON.stringify({ canSpeak });
  },
  metadata: {
    explainer: () => {
      return `get speaking setting`;
    },
  },
});
