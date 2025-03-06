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
      console.log('Initializing voice selection...');
      // First try to get voices directly
      let voices = window.speechSynthesis.getVoices();
      console.log(
        'Initial voices:',
        voices.map((v) => ({ name: v.name, lang: v.lang }))
      );

      // If no voices are available, wait for them to load
      if (!voices.length) {
        console.log('No voices available, waiting for voices to load...');
        voices = await new Promise<SpeechSynthesisVoice[]>((resolve) => {
          const handleVoicesLoaded = () => {
            const loadedVoices = window.speechSynthesis.getVoices();
            console.log(
              'Voices loaded:',
              loadedVoices.map((v) => ({ name: v.name, lang: v.lang }))
            );
            window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesLoaded);
            resolve(loadedVoices);
          };

          window.speechSynthesis.addEventListener('voiceschanged', handleVoicesLoaded);
        });
      }

      if (!voices.length) {
        console.log('No voices available after loading attempt');
        return;
      }

      // Try to find the preferred voice
      const preferredVoice = voices.find((v) => v.name === 'Google UK English Female');
      if (preferredVoice) {
        console.log('Found preferred voice:', preferredVoice.name);
        this._defaultVoice = preferredVoice;
        localStorage.setItem('grafana.dash.exp.speechVoice', preferredVoice.name);
      } else {
        console.log('Preferred voice not found, trying fallbacks...');
        // Fallback to first English female voice, or first English voice, or first voice
        this._defaultVoice =
          voices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];

        if (this._defaultVoice) {
          console.log('Selected fallback voice:', this._defaultVoice.name);
          localStorage.setItem('grafana.dash.exp.speechVoice', this._defaultVoice.name);
        } else {
          console.log('No fallback voice found');
        }
      }
    } catch (error) {
      console.error('Error initializing voice:', error);
    }
  }

  public speak(text: string) {
    this.checkCanSpeak();
    if (!this.state.canSpeak) {
      console.log('Speech disabled');
      return;
    }

    if (!this.state.speaking) {
      try {
        console.log('Creating new utterance with text:', text);
        this._utterance = new SpeechSynthesisUtterance(text);

        // Set the voice if available
        if (this._defaultVoice) {
          console.log('Setting voice to:', this._defaultVoice.name);
          this._utterance.voice = this._defaultVoice;
        } else {
          console.log('No voice selected, using default');
        }

        this._utterance.onstart = () => {
          console.log('Speech started');
          this.setState({ speaking: true });
        };

        this._utterance.onend = () => {
          console.log('Speech ended');
          this.setState({ speaking: false });
        };

        this._utterance.onerror = (event) => {
          console.error('Speech error:', event);
          this.setState({ speaking: false });
        };

        console.log('Starting speech synthesis');
        window.speechSynthesis.speak(this._utterance);
      } catch (error) {
        console.error('Error in speak method:', error);
      }
    } else {
      console.log('Already speaking, ignoring new speech request');
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
