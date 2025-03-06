import { SceneObjectBase, SceneObjectState } from '@grafana/scenes';

export interface TextToSpeechState extends SceneObjectState {
  speaking: boolean;
  canSpeak: boolean;
}

export class TextToSpeech extends SceneObjectBase<TextToSpeechState> {
  private _utterance: SpeechSynthesisUtterance | null = null;
  private _defaultVoice: SpeechSynthesisVoice | null = null;
  private _voiceInitialized = false;

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
        console.error('No voices available after loading attempt');
        return;
      }

      // Try to find the preferred voice from localStorage first
      const savedVoiceName = localStorage.getItem('grafana.dash.exp.speechVoice');
      if (savedVoiceName) {
        const savedVoice = voices.find((v) => v.name === savedVoiceName);
        if (savedVoice) {
          this._defaultVoice = savedVoice;
          this._voiceInitialized = true;
          console.log('Using saved voice:', savedVoice.name);
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
      console.log('Selected voice:', this._defaultVoice?.name);
    } catch (error) {
      console.error('Error initializing voice:', error);
    }
  }

  public speak(text: string) {
    this.checkCanSpeak();
    console.log('Attempting to speak:', { canSpeak: this.state.canSpeak, speaking: this.state.speaking, text });

    if (!this.state.canSpeak) {
      console.log('Speech is disabled');
      return;
    }

    if (!this.state.speaking) {
      try {
        // Cancel any existing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0; // Normal speed
        utterance.pitch = 1.0; // Normal pitch
        utterance.volume = 1.0; // Full volume

        // Set the voice if available
        if (this._defaultVoice) {
          utterance.voice = this._defaultVoice;
          console.log('Using voice:', this._defaultVoice.name);
        } else {
          console.log('No voice selected, using default');
        }

        utterance.onstart = () => {
          console.log('Speech started');
          this.setState({ speaking: true });
        };

        utterance.onend = () => {
          console.log('Speech ended');
          this.setState({ speaking: false });
        };

        utterance.onerror = (event) => {
          console.error('Speech error:', event);
          this.setState({ speaking: false });
        };

        utterance.onpause = () => {
          console.log('Speech paused');
        };

        utterance.onresume = () => {
          console.log('Speech resumed');
        };

        this._utterance = utterance;
        console.log('Starting speech synthesis');
        window.speechSynthesis.speak(utterance);

        // Add a timeout to check if speech actually started
        setTimeout(() => {
          if (!this.state.speaking) {
            console.log('Speech did not start within timeout, retrying...');
            this.stop();
            window.speechSynthesis.speak(utterance);
          }
        }, 1000);
      } catch (error) {
        console.error('Error in speak method:', error);
        this.setState({ speaking: false });
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
    console.log('Setting canSpeak to:', canSpeak);
    localStorage.setItem('grafana.dash.exp.canSpeak', String(canSpeak));
    this.setState({ canSpeak });
  }

  private checkCanSpeak() {
    const canSpeak = localStorage.getItem('grafana.dash.exp.canSpeak') === 'true';
    if (canSpeak !== this.state.canSpeak) {
      console.log('Updating canSpeak state:', canSpeak);
      this.setState({ canSpeak });
    }
  }
}
