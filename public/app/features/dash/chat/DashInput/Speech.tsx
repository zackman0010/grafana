import { css, keyframes } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { IconButton, Tooltip, useStyles2 } from '@grafana/ui';

import { getInput, getMessages } from '../utils';

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
    if (!this._recognition) {
      return;
    }

    if (this.state.listening) {
      this._recognition.stop();
      this.setState({ listening: false });
    } else {
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
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this._recognition = new SpeechRecognition();
      this._recognition.continuous = true;
      this._recognition.interimResults = false;
      this._recognition.lang = 'en-US';

      this._recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Get the last result from the results array
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript;

        // Update message and send it
        getInput(this).updateMessage(transcript, true);
        getInput(this).sendMessage();
      };

      this._recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        this.setState({ listening: false });
      };
    }
  }
}

function SpeechRenderer({ model }: SceneComponentProps<Speech>) {
  const { listening } = model.useState();
  const styles = useStyles2(getStyles, listening);
  const { loading } = getMessages(model).useState();

  return (
    <Tooltip content={listening ? 'Stop listening' : 'Use dictation'}>
      <IconButton
        size="xl"
        name="record-audio"
        aria-label={listening ? 'Stop voice input' : 'Start voice input'}
        disabled={loading}
        className={styles.icon}
        onClick={() => model.toggleSpeechRecognition()}
      />
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
        label: 'dash-input-speech-icon',
        position: 'relative',
        color: theme.colors.warning.main,

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
          width: '28px',
          height: '28px',
          marginTop: '-14px',
          marginLeft: '-14px',
          backgroundColor: theme.colors.warning.main,
        },

        '&::after': {
          width: '42px',
          height: '42px',
          marginTop: '-21px',
          marginLeft: '-21px',
          background: `radial-gradient(circle, ${theme.colors.warning.main} 0%, transparent 70%)`,

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
        label: 'dash-input-speech-icon',
      }),
});
