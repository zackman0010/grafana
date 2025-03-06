import { DynamicTool } from '@langchain/core/tools';

export const toolGetSpeechVoices = new DynamicTool({
  name: 'get_speech_voices',
  description: 'Get available speech voices from the browser',
  func: async () => {
    try {
      // First try to get voices directly
      let voices = window.speechSynthesis.getVoices();

      // If no voices are available, wait for them to load
      if (!voices.length) {
        voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
          const handleVoicesLoaded = () => {
            const loadedVoices = window.speechSynthesis.getVoices();
            window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesLoaded);
            resolve(loadedVoices);
          };

          window.speechSynthesis.addEventListener('voiceschanged', handleVoicesLoaded);
        });
      }

      if (!voices.length) {
        return JSON.stringify({ error: 'No voices available' });
      }

      return JSON.stringify({ success: true, voices: voices.map((v) => ({ name: v.name, lang: v.lang })) });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to get speech voices' });
    }
  },
  metadata: {
    explainer: () => {
      return `get speech voices`;
    },
  },
});
