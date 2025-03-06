import { css, keyframes } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { Tooltip, useStyles2 } from '@grafana/ui';

import { getInput, getMessages } from '../utils';

import { MicIcon } from './MicIcon';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface SpeechState extends SceneObjectState {
  listening: boolean;
}

export class Speech extends SceneObjectBase<SpeechState> {
  public static Component = SpeechRenderer;

  private _recognition: SpeechRecognition | null = null;

  public constructor(state: SpeechState) {
    super(state);

    this.addActivationHandler(() => this._activationHandler());
  }

  private _activationHandler() {
    this._initializeSpeechRecognition();

    return () => {
      if (this._recognition) {
        this._recognition.stop();
      }
    };
  }

  public toggleSpeechRecognition() {
    console.log('Toggling speech recognition, current state:', this.state.listening);
    if (!this._recognition) {
      console.error('Speech recognition not initialized');
      return;
    }

    if (this.state.listening) {
      console.log('Stopping speech recognition...');
      this._recognition.stop();
      this.setState({ listening: false });
    } else {
      console.log('Starting speech recognition...');
      this.setState({ listening: true });
      this._recognition.start();
    }
  }

  public resume() {
    if (this.state.listening && this._recognition) {
      this._recognition.start();
    }
  }

  public pause() {
    if (this.state.listening && this._recognition) {
      this._recognition.stop();
    }
  }

  private _initializeSpeechRecognition() {
    console.log('Initializing speech recognition...');
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      console.log('Speech recognition API available:', SpeechRecognition.name);
      this._recognition = new SpeechRecognition();
      this._recognition.continuous = true;
      this._recognition.interimResults = false;
      this._recognition.lang = 'en-US';

      this._recognition.onresult = (event: SpeechRecognitionEvent) => {
        console.log('Speech recognition result:', event.results);
        // Get the last result from the results array
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript;
        console.log('Final transcript:', transcript);

        // Update message and send it
        getInput(this).updateMessage(transcript, true);
        getInput(this).sendMessage();
      };

      this._recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        this.setState({ listening: false });
      };

      this._recognition.onend = () => {
        console.log('Speech recognition ended');
        if (this.state.listening) {
          console.log('Restarting speech recognition...');
          this._recognition?.start();
        }
      };
    } else {
      console.error('Speech recognition API not available in this browser');
    }
  }
}

function SpeechRenderer({ model }: SceneComponentProps<Speech>) {
  const { listening } = model.useState();
  const styles = useStyles2(getStyles, listening);
  const { loading } = getMessages(model).useState();

  return (
    <Tooltip content={listening ? 'Stop listening' : 'Use dictation'}>
      <button
        aria-label={listening ? 'Stop voice input' : 'Start voice input'}
        disabled={loading}
        className={styles.icon}
        onClick={() => model.toggleSpeechRecognition()}
      >
        <MicIcon />
      </button>
    </Tooltip>
  );
}

const pulse = keyframes({
  '0%': {
    opacity: 0.2,
    transform: 'scale(1)',
  },
  '50%': {
    opacity: 0.4,
    transform: 'scale(1.1)',
  },
  '100%': {
    opacity: 0.2,
    transform: 'scale(1)',
  },
});

const getStyles = (theme: GrafanaTheme2, listening: boolean) => ({
  icon: listening
    ? css({
        label: 'dash-input-speech-icon-1',
        position: 'relative',
        display: 'inline-flex',
        background: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        border: 'none',
        width: 24,
        height: 24,
        color: theme.colors.warning.main,
        margin: 0,
        marginTop: '12px',
        padding: 0,

        '& svg': {
          opacity: 0.4,
        },

        '&::before, &::after': {
          content: '""',
          position: 'absolute',
          top: '50%',
          left: '50%',
          borderRadius: '50%',
          opacity: 0.2,
        },

        '&::before': {
          width: '32px',
          height: '32px',
          marginTop: '-16px',
          marginLeft: '-16px',
          backgroundColor: theme.colors.warning.main,
        },

        '&::after': {
          width: '100px',
          height: '100px',
          marginTop: '-50px',
          marginLeft: '-50px',
          background: `radial-gradient(circle, ${theme.colors.warning.main} 0%, transparent 30%)`,

          [theme.transitions.handleMotion('no-preference', 'reduce')]: {
            animation: `${pulse} 2s ease-in-out infinite`,
          },
        },

        '&:hover': {
          '& svg': {
            opacity: 0.4,
          },

          '&::before, &::after': {
            opacity: 0.2,
          },
        },
      })
    : css({
        label: 'dash-input-speech-icon-1-2',
        background: 'transparent',
        border: 'none',
        width: 24,
        height: 24,
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0,
        margin: 0,
        marginTop: '12px',
        color: theme.colors.secondary.text,
      }),
});
