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
  private _initializationPromise: Promise<void> | null = null;
  private static _globalVoiceInitialized = false;
  private static _globalDefaultVoice: SpeechSynthesisVoice | null = null;
  private _storageListener: ((this: Window, ev: StorageEvent) => void) | null = null;

  public constructor(state: TextToSpeechState) {
    super({
      ...state,
      speaking: false,
      canSpeak: localStorage.getItem('grafana.dash.exp.canSpeak') === 'true',
    });

    console.log('🎤 TextToSpeech constructed, canSpeak:', this.state.canSpeak);

    // Add storage event listener to sync state across instances
    this._storageListener = (event: StorageEvent) => {
      if (event.key === 'grafana.dash.exp.canSpeak') {
        const canSpeak = event.newValue === 'true';
        console.log('🎤 Storage event: canSpeak changed to', canSpeak);
        this.setState({ canSpeak });

        // Initialize voice if needed
        if (canSpeak && !this._voiceInitialized) {
          this._initializeVoice().catch((error) => {
            console.error('🎤 Error initializing voice after storage event:', error);
          });
        }
      } else if (event.key === 'grafana.dash.exp.speechVoice') {
        const voiceName = event.newValue;
        console.log('🎤 Storage event: voice changed to', voiceName);
        if (voiceName) {
          this.setVoice(voiceName).catch((error) => {
            console.error('🎤 Error setting voice after storage event:', error);
          });
        }
      }
    };

    window.addEventListener('storage', this._storageListener);

    // Add cleanup on deactivation
    this.addActivationHandler(() => {
      return () => {
        if (this._storageListener) {
          window.removeEventListener('storage', this._storageListener);
          this._storageListener = null;
        }
      };
    });
  }

  private async _initializeVoice() {
    // If already initializing, wait for that to complete
    if (this._initializationPromise) {
      await this._initializationPromise;
      return;
    }

    // If already initialized either locally or globally, no need to continue
    if (this._voiceInitialized || TextToSpeech._globalVoiceInitialized) {
      console.log('🎤 Voice already initialized');
      return;
    }

    // Don't initialize if speech is disabled
    if (!this.state.canSpeak) {
      console.log('🎤 Skipping voice initialization - speech is disabled');
      return;
    }

    console.log('🎤 Starting voice initialization...');
    try {
      // First try to get voices directly
      let voices = window.speechSynthesis.getVoices();
      console.log(
        '🎤 Initial voices:',
        voices.length ? `${voices.length} voices available` : 'No voices available yet'
      );

      // If no voices are available, wait for them to load
      if (!voices.length) {
        console.log('🎤 Waiting for voices to load...');
        voices = await new Promise<SpeechSynthesisVoice[]>((resolve, reject) => {
          let timeoutHandle: number;

          const handleVoicesLoaded = () => {
            const loadedVoices = window.speechSynthesis.getVoices();
            if (loadedVoices.length > 0) {
              window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesLoaded);
              window.clearTimeout(timeoutHandle);
              console.log('🎤 Voices loaded:', loadedVoices.length);
              resolve(loadedVoices);
            }
          };

          // Check if voices are already available
          const currentVoices = window.speechSynthesis.getVoices();
          if (currentVoices.length > 0) {
            console.log('🎤 Voices already available:', currentVoices.length);
            resolve(currentVoices);
            return;
          }

          window.speechSynthesis.addEventListener('voiceschanged', handleVoicesLoaded);

          // Set a timeout in case voices never load
          timeoutHandle = window.setTimeout(() => {
            window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesLoaded);
            const timeoutVoices = window.speechSynthesis.getVoices();
            console.log('🎤 Voice loading timed out, available voices:', timeoutVoices.length);
            if (timeoutVoices.length > 0) {
              resolve(timeoutVoices);
            } else {
              reject(new Error('No voices available after timeout'));
            }
          }, 2000);
        });
      }

      if (!voices.length) {
        throw new Error('No speech synthesis voices available after initialization');
      }

      // Try to find the preferred voice from localStorage first
      const savedVoiceName = localStorage.getItem('grafana.dash.exp.speechVoice');
      console.log('🎤 Saved voice name:', savedVoiceName);

      if (savedVoiceName) {
        const savedVoice = voices.find((v) => v.name === savedVoiceName);
        if (savedVoice) {
          this._defaultVoice = savedVoice;
          TextToSpeech._globalDefaultVoice = savedVoice;
          this._voiceInitialized = true;
          TextToSpeech._globalVoiceInitialized = true;
          console.log('🎤 Using saved voice:', savedVoice.name);
          return;
        }
        console.log('🎤 Saved voice not found, falling back to defaults');
      }

      // If no saved voice or saved voice not found, try to find the preferred voice
      const preferredVoice = voices.find((v) => v.name === 'Google UK English Female');
      if (preferredVoice) {
        this._defaultVoice = preferredVoice;
        TextToSpeech._globalDefaultVoice = preferredVoice;
        localStorage.setItem('grafana.dash.exp.speechVoice', preferredVoice.name);
        console.log('🎤 Using preferred voice:', preferredVoice.name);
      } else {
        // Fallback to first English female voice, or first English voice, or first voice
        this._defaultVoice =
          voices.find((v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];

        if (this._defaultVoice) {
          TextToSpeech._globalDefaultVoice = this._defaultVoice;
          localStorage.setItem('grafana.dash.exp.speechVoice', this._defaultVoice.name);
          console.log('🎤 Using fallback voice:', this._defaultVoice.name);
        }
      }

      this._voiceInitialized = true;
      TextToSpeech._globalVoiceInitialized = true;
    } catch (error) {
      console.error('🎤 Error initializing voice:', error);
      // Reset initialization state so it can be retried
      this._voiceInitialized = false;
      TextToSpeech._globalVoiceInitialized = false;
      this._defaultVoice = null;
      TextToSpeech._globalDefaultVoice = null;
      throw error;
    } finally {
      this._initializationPromise = null;
    }
  }

  public async setCanSpeak(canSpeak: boolean) {
    console.log('🎤 Setting canSpeak:', canSpeak);

    // Update localStorage first
    localStorage.setItem('grafana.dash.exp.canSpeak', String(canSpeak));

    // Update state
    this.setState({ canSpeak });
    console.log('🎤 Speech enabled:', canSpeak);

    if (canSpeak) {
      try {
        // Initialize voice when enabling speech
        if (!this._voiceInitialized) {
          console.log('🎤 Initializing voice before enabling speech...');

          // Use the global voice if available
          if (TextToSpeech._globalVoiceInitialized && TextToSpeech._globalDefaultVoice) {
            this._defaultVoice = TextToSpeech._globalDefaultVoice;
            this._voiceInitialized = true;
            console.log('🎤 Using existing voice:', this._defaultVoice.name);
          } else {
            this._initializationPromise = this._initializeVoice();
            await this._initializationPromise;
          }
        }

        if (!this._voiceInitialized || !this._defaultVoice) {
          console.error('🎤 Failed to initialize voice, cannot enable speech');
          return;
        }

        // Test the speech synthesis with a silent utterance
        const utterance = new SpeechSynthesisUtterance('');
        utterance.voice = this._defaultVoice;
        utterance.volume = 0; // Make it silent

        await new Promise<void>((resolve, reject) => {
          utterance.onend = () => {
            console.log('🎤 Speech synthesis test completed');
            resolve();
          };
          utterance.onerror = (event) => {
            console.error('🎤 Speech synthesis test failed:', event);
            reject(event);
          };
          window.speechSynthesis.speak(utterance);

          // Resolve after a short timeout if the event doesn't fire
          setTimeout(() => {
            console.log('🎤 Speech synthesis test timeout - assuming success');
            resolve();
          }, 100);
        });

        console.log('🎤 Speech synthesis test successful');
      } catch (error) {
        console.error('🎤 Error enabling speech:', error);
        return;
      }
    } else {
      // When disabling speech, we'll keep the voice initialized but update state
      console.log('🎤 Disabling speech but keeping voice initialized');
    }

    // Dispatch a storage event to notify other instances
    try {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'grafana.dash.exp.canSpeak',
          newValue: String(canSpeak),
          oldValue: String(!canSpeak),
          storageArea: localStorage,
        })
      );
    } catch (error) {
      console.warn('🎤 Could not dispatch storage event:', error);
    }
  }

  public async setVoice(voiceName: string) {
    console.log('🎤 Setting voice:', voiceName);

    // If we don't have voices loaded yet, initialize them
    if (!this._voiceInitialized) {
      await this._initializeVoice();
    }

    // Get all available voices
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) => v.name === voiceName);

    if (voice) {
      this._defaultVoice = voice;
      TextToSpeech._globalDefaultVoice = voice;
      localStorage.setItem('grafana.dash.exp.speechVoice', voiceName);
      console.log('🎤 Voice set to:', voiceName);
    } else {
      console.warn('🎤 Voice not found:', voiceName);
    }
  }

  public async speak(text: string) {
    console.log('🎤 AI Response:', text);
    console.log('🎤 Attempting to speak:', {
      initialized: this._voiceInitialized,
      canSpeak: this.state.canSpeak,
      textLength: text.length,
      voice: this._defaultVoice?.name,
    });

    // First check if we can speak
    this.checkCanSpeak();
    if (!this.state.canSpeak) {
      console.log('🎤 Speech is disabled, not speaking');
      return;
    }

    // Then ensure voice is initialized
    if (!this._voiceInitialized) {
      console.log('🎤 Voice not initialized, initializing now...');
      await this._initializeVoice();

      if (!this._voiceInitialized || !this._defaultVoice) {
        console.error('🎤 Failed to initialize voice, cannot speak');
        return;
      }
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
        console.log('🎤 Using voice:', this._defaultVoice.name);
      } else {
        console.warn('🎤 No default voice set');
      }

      utterance.onstart = () => {
        this._isSpeaking = true;
        this.setState({ speaking: true });
        console.log('🎤 Speech started');
      };

      utterance.onend = () => {
        this._isSpeaking = false;
        this.setState({ speaking: false });
        console.log('🎤 Speech ended');
      };

      utterance.onerror = (event) => {
        this._isSpeaking = false;
        this.setState({ speaking: false });
        console.error('🎤 Speech error:', event);
      };

      utterance.onpause = () => {
        console.log('🎤 Speech paused');
      };

      utterance.onresume = () => {
        console.log('🎤 Speech resumed');
      };

      this._utterance = utterance;
      window.speechSynthesis.speak(utterance);
      console.log('🎤 Speech started with text length:', text.length);

      // Add a timeout to check if speech actually started
      setTimeout(() => {
        if (!this._isSpeaking) {
          console.warn('🎤 Speech did not start, retrying...');
          this.stop();
          window.speechSynthesis.speak(utterance);
        }
      }, 1000);
    } catch (error) {
      this._isSpeaking = false;
      this.setState({ speaking: false });
      console.error('🎤 Error during speech:', error);
    }
  }

  public stop() {
    if (this._utterance) {
      console.log('🎤 Stopping speech');
      window.speechSynthesis.cancel();
      this._utterance = null;
      this._isSpeaking = false;
      this.setState({ speaking: false });
    }
  }

  private checkCanSpeak() {
    const canSpeak = localStorage.getItem('grafana.dash.exp.canSpeak') === 'true';
    if (canSpeak !== this.state.canSpeak) {
      console.log('🎤 Updating canSpeak state:', canSpeak);
      this.setState({ canSpeak });
    }
  }
}
