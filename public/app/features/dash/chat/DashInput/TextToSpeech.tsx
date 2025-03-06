import { SceneObjectBase, SceneObjectState } from '@grafana/scenes';

export interface TextToSpeechState extends SceneObjectState {
  speaking: boolean;
  canSpeak: boolean;
}

export class TextToSpeech extends SceneObjectBase<TextToSpeechState> {
  private _utterance: SpeechSynthesisUtterance | null = null;
  private _defaultVoice: SpeechSynthesisVoice | null = null;
  private _voiceInitialized = false;
  private _isSpeaking = false;

  public constructor(state: TextToSpeechState) {
    super({
      ...state,
      speaking: false,
      canSpeak: localStorage.getItem('grafana.dash.exp.canSpeak') === 'true',
    });

    // Initialize voice selection
    this._initializeVoice();
  }

  private async _initializeVoice() {
    if (this._voiceInitialized) {
      return;
    }

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
        return;
      }

      // Try to find the preferred voice from localStorage first
      const savedVoiceName = localStorage.getItem('grafana.dash.exp.speechVoice');
      if (savedVoiceName) {
        const savedVoice = voices.find((v) => v.name === savedVoiceName);
        if (savedVoice) {
          this._defaultVoice = savedVoice;
          this._voiceInitialized = true;
          return;
        }
      }

      // If no saved voice or saved voice not found, try to find the preferred voice
      const preferredVoice = voices.find((v) => v.name === 'Google UK English Female');
      if (preferredVoice) {
        this._defaultVoice = preferredVoice;
        localStorage.setItem('grafana.dash.exp.speechVoice', preferredVoice.name);
      } else {
        // Fallback to first English female voice, or first English voice, or first voice
        this._defaultVoice =
          voices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];

        if (this._defaultVoice) {
          localStorage.setItem('grafana.dash.exp.speechVoice', this._defaultVoice.name);
        }
      }

      this._voiceInitialized = true;
    } catch (error) {
      // Silently handle errors
    }
  }

  public speak(text: string) {
    this.checkCanSpeak();
    if (!this.state.canSpeak) {
      return;
    }

    // Stop any current speech before starting new speech
    this.stop();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0; // Normal speed
      utterance.pitch = 1.0; // Normal pitch
      utterance.volume = 1.0; // Full volume

      // Set the voice if available
      if (this._defaultVoice) {
        utterance.voice = this._defaultVoice;
      }

      utterance.onstart = () => {
        this._isSpeaking = true;
        this.setState({ speaking: true });
      };

      utterance.onend = () => {
        this._isSpeaking = false;
        this.setState({ speaking: false });
      };

      utterance.onerror = () => {
        this._isSpeaking = false;
        this.setState({ speaking: false });
      };

      utterance.onpause = () => {
        // Handle pause if needed
      };

      utterance.onresume = () => {
        // Handle resume if needed
      };

      this._utterance = utterance;
      window.speechSynthesis.speak(utterance);

      // Add a timeout to check if speech actually started
      setTimeout(() => {
        if (!this._isSpeaking) {
          this.stop();
          window.speechSynthesis.speak(utterance);
        }
      }, 1000);
    } catch (error) {
      this._isSpeaking = false;
      this.setState({ speaking: false });
    }
  }

  public stop() {
    if (this._utterance) {
      window.speechSynthesis.cancel();
      this._utterance = null;
      this._isSpeaking = false;
      this.setState({ speaking: false });
    }
  }

  public setCanSpeak(canSpeak: boolean) {
    localStorage.setItem('grafana.dash.exp.canSpeak', String(canSpeak));
    this.setState({ canSpeak });
  }

  private checkCanSpeak() {
    const canSpeak = localStorage.getItem('grafana.dash.exp.canSpeak') === 'true';
    if (canSpeak !== this.state.canSpeak) {
      this.setState({ canSpeak });
    }
  }
}
