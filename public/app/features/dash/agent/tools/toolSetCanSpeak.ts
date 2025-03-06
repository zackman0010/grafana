import { DynamicTool } from '@langchain/core/tools';

export const toolSetCanSpeak = new DynamicTool({
  name: 'set_can_speak',
  description: 'Set whether the agent can speak (write to localStorage)',
  func: async (input: string) => {
    if (!input) {
      return JSON.stringify({ error: 'Input is required' });
    }

    try {
      const canSpeak = input.toLowerCase() === 'true';
      localStorage.setItem('grafana.dash.exp.canSpeak', String(canSpeak));
      return JSON.stringify({ success: true, canSpeak });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to set canSpeak state' });
    }
  },
  metadata: {
    explainer: () => {
      return `change speaking setting`;
    },
  },
});
