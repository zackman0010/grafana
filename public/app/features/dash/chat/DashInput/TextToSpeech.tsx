import { SceneObjectBase, SceneObjectState } from '@grafana/scenes';

export interface TextToSpeechState extends SceneObjectState {
  speaking: boolean;
  canSpeak: boolean;
}

export class TextToSpeech extends SceneObjectBase<TextToSpeechState> {
  private _utterance: SpeechSynthesisUtterance | null = null;
  private _defaultVoice: SpeechSynthesisVoice | null = null;

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

      // Try to find the preferred voice
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
    } catch (error) {
      // Silently handle errors
    }
  }

  public speak(text: string) {
    this.checkCanSpeak();
    if (!this.state.canSpeak) {
      return;
    }

    if (!this.state.speaking) {
      try {
        this._utterance = new SpeechSynthesisUtterance(text);

        // Set the voice if available
        if (this._defaultVoice) {
          this._utterance.voice = this._defaultVoice;
        }

        this._utterance.onstart = () => {
          this.setState({ speaking: true });
        };

        this._utterance.onend = () => {
          this.setState({ speaking: false });
        };

        this._utterance.onerror = (event) => {
          this.setState({ speaking: false });
        };

        window.speechSynthesis.speak(this._utterance);
      } catch (error) {
        // Silently handle errors
      }
    }
  }

  public stop() {
    if (this._utterance) {
      window.speechSynthesis.cancel();
      this._utterance = null;
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
