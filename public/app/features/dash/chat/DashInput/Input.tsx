import { css } from '@emotion/css';
import ReactTextareaAutocomplete from '@webscopeio/react-textarea-autocomplete';
import { forwardRef, useCallback } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2, TextArea } from '@grafana/ui';

import { dataProvider, getProviderTriggers } from '../../agent/tools/context/autocomplete';

import '@webscopeio/react-textarea-autocomplete/style.css';

interface Props {
  listening: boolean;
  loading: boolean;
  message: string;
  onCancelRequest: () => Promise<void>;
  onEnterSelectMode: () => void;
  onSendMessage: () => void;
  onUpdateMessage: (value: string) => void;
  onInterruptAndSend: () => Promise<void>;
}

export const Input = forwardRef<HTMLTextAreaElement, Props>(
  (
    {
      listening,
      loading,
      message,
      onCancelRequest,
      onEnterSelectMode,
      onSendMessage,
      onUpdateMessage,
      onInterruptAndSend,
    },
    ref
  ) => {
    const styles = useStyles2(getStyles);

    const adjustHeight = useCallback((textarea: HTMLTextAreaElement) => {
      if (!textarea) {
        return;
      }
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }, []);

    const handleTextAreaChange = useCallback(
      (evt: any) => {
        onUpdateMessage(evt.target.value ?? '');
        adjustHeight(evt.target);
      },
      [onUpdateMessage, adjustHeight]
    );

    return (
      <ReactTextareaAutocomplete<string>
        autoFocus
        minChar={0}
        value={message}
        readOnly={listening}
        placeholder={listening ? 'Listening...' : 'Ask questions, go places, make changes, anything.'}
        textAreaComponent={TextArea}
        containerClassName={styles.input}
        itemClassName={styles.autoCompleteListItem}
        listClassName={styles.autoCompleteList}
        loadingComponent={() => <span>Connecting to the mothership</span>}
        trigger={{
          ...getProviderTriggers(Item),
          '@': {
            dataProvider,
            component: Item,
            output: (item, trigger = '') => ({ text: trigger + item.toString(), caretPosition: 'end' }),
            afterWhitespace: false,
          },
        }}
        innerRef={(actualRef) => {
          if (ref) {
            if (typeof ref !== 'function') {
              ref.current = actualRef;
            } else {
              ref(actualRef);
            }
          }
          if (actualRef) {
            adjustHeight(actualRef);
          }
        }}
        onChange={handleTextAreaChange}
        onKeyDown={(evt: any) => {
          switch (evt.key) {
            case 'Enter':
              if (!evt.shiftKey) {
                evt.preventDefault();
                evt.stopPropagation();
                if (loading) {
                  onInterruptAndSend();
                } else {
                  onSendMessage();
                  if (!listening) {
                    onUpdateMessage('');
                  } else {
                    evt.target.select();
                  }
                }
              }
              break;

            case 'ArrowUp':
              evt.preventDefault();
              evt.stopPropagation();
              onEnterSelectMode();
              break;

            case 'Escape':
              if (loading) {
                evt.preventDefault();
                evt.stopPropagation();
                onCancelRequest();
              }
              break;
          }
        }}
      />
    );
  }
);

const Item = ({ entity }: { entity: string }) => <div>{entity}</div>;

const getStyles = (theme: GrafanaTheme2) => ({
  input: css({
    label: 'dash-input',
    flexGrow: 1,
    fontSize: theme.typography.fontSize,
    '& textarea': {
      resize: 'none',
      minHeight: theme.spacing(4),
      maxHeight: '200px',
      height: 'auto',
      overflow: 'hidden',
      padding: `${theme.spacing(0.75)} ${theme.spacing(1)}`,
      border: 'none',
      background: 'transparent',
    },
  }),
  autoCompleteList: css({
    label: 'dash-input-list',
    background: theme.colors.background.primary,
    border: 'none',

    '& .rta__entity': {
      background: theme.colors.background.primary,
      color: theme.colors.text.primary,
      padding: theme.spacing(0.5, 1),
      fontSize: theme.typography.bodySmall.fontSize,
    },

    '& .rta__entity--selected': {
      background: theme.colors.background.secondary,
    },
  }),
  autoCompleteListItem: css({
    label: 'dash-input-list-item',
    border: `1px solid ${theme.colors.border.weak}`,
    background: theme.colors.background.secondary,

    '&:not(:last-child)': {
      borderBottom: 'none',
    },
  }),
});
