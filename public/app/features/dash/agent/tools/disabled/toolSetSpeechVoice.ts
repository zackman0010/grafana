import { DynamicTool } from '@langchain/core/tools';

export const toolSetSpeechVoice = new DynamicTool({
  name: 'set_speech_voice',
  description: 'Set the selected speech voice (write to localStorage)',
  func: async (input: string) => {
    if (!input) {
      return JSON.stringify({ error: 'Input is required' });
    }

    try {
      const voiceName = input.trim();
      localStorage.setItem('grafana.dash.exp.speechVoice', voiceName);
      return JSON.stringify({ success: true, voiceName });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to set speech voice' });
    }
  },
  metadata: {
    explainer: () => {
      return `change speech voice`;
    },
  },
});
