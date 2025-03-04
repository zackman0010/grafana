import { css, keyframes } from '@emotion/css';
import { MessageContent } from '@langchain/core/messages';
import { useEffect, useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObject, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';
import { getFocusStyles } from '@grafana/ui/src/themes/mixins';

import { CodeOverflow, Sender, SerializedDashMessage, ToolContent } from '../types';
import { getSettings } from '../utils';

import { Image } from './Image';
import { Text } from './Text';
import { Tool } from './Tool';

interface DashMessageState extends SceneObjectState {
  children: SceneObject[];
  content: MessageContent;
  editedMessage: string | undefined;
  editing: boolean;
  isError: boolean;
  muted: boolean;
  sender: Sender;
  selected: boolean;
}

export class DashMessage extends SceneObjectBase<DashMessageState> {
  public static Component = DashMessageRenderer;

  public constructor(
    state: Omit<
      DashMessageState,
      'children' | 'editedMessage' | 'editing' | 'icon' | 'selected' | 'muted' | 'isError'
    > &
      Partial<Pick<DashMessageState, 'selected' | 'muted' | 'isError'>>
  ) {
    const children =
      typeof state.content === 'string'
        ? [new Text({ content: state.content })]
        : state.content.reduce<SceneObject[]>((acc, currentContent) => {
            switch (currentContent.type) {
              case 'text':
                return [...acc, new Text({ content: currentContent.text })];

              case 'tool_use':
                return [...acc, new Tool({ content: currentContent as ToolContent })];

              case 'image_url':
                return [...acc, new Image({ url: currentContent.image_url })];

              default:
                return acc;
            }
          }, []);

    super({
      ...state,
      children,
      editedMessage: undefined,
      editing: false,
      selected: false,
      isError: state.isError ?? false,
      muted: state.muted ?? false,
    });
  }

  public setSelected(selected: boolean) {
    if (selected !== this.state.selected) {
      this.setState({ selected, editing: false, editedMessage: undefined });
    }
  }

  public setEditing(editing: boolean) {
    if (editing !== this.state.editing) {
      this.setState({ editing, editedMessage: editing ? String(this.state.content) : undefined });
    }
  }

  public updateEditedMessage(editedMessage: string) {
    this.setState({ editedMessage });
  }

  public setToolWorking(id: string | undefined, working: boolean) {
    if (!id) {
      return;
    }

    this.state.children.forEach((child) => {
      if (child instanceof Tool && child.state.content.id === id) {
        child.setWorking(working);
      }
    });
  }

  public hasWorkingTools(): boolean {
    return this.state.children.some((child) => child instanceof Tool && child.state.working);
  }

  public toJSON(): SerializedDashMessage {
    return {
      content: this.state.content,
      sender: this.state.sender,
    };
  }
}

function DashMessageRenderer({ model }: SceneComponentProps<DashMessage>) {
  const { children, editedMessage, editing, isError, sender, selected } = model.useState();
  const { codeOverflow } = getSettings(model).useState();
  const styles = useStyles2(getStyles, codeOverflow, isError, selected, sender);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selected]);

  return (
    <div className={styles.container} ref={containerRef}>
      {editing ? (
        <textarea
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          value={editedMessage}
          className={styles.editInput}
          onPointerDown={(evt) => evt.stopPropagation()}
          onChange={(evt) => model.updateEditedMessage(evt.target.value ?? '')}
        />
      ) : (
        children.map((child) => <child.Component model={child} key={child.state.key} />)
      )}
    </div>
  );
}

const fadeIn = keyframes({
  '0%': {
    opacity: 0,
    transform: 'translateY(10px)',
  },
  '100%': {
    opacity: 1,
    transform: 'translateY(0)',
  },
});

const getStyles = (
  theme: GrafanaTheme2,
  codeOverflow: CodeOverflow,
  isError: boolean,
  selected: boolean,
  sender: Sender
) => ({
  container: css({
    label: 'dash-message-container',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: theme.spacing(1),
    padding: theme.spacing(1),
    outline: selected ? 'none' : 'none',
    background:
      sender === 'ai'
        ? theme.colors.background.primary
        : sender === 'system'
          ? 'transparent'
          : theme.colors.background.secondary,

    ...(isError && {
      color: theme.colors.error.text,
      borderLeft: `3px solid ${theme.colors.error.border}`,
      '& p': {
        color: theme.colors.text.disabled,
        margin: 0,
        padding: 0,
      },
    }),

    ...(selected ? getFocusStyles(theme) : {}),

    [theme.transitions.handleMotion('no-preference', 'reduce')]: {
      animationName: fadeIn,
      animationDuration: '0.3s',
      animationTimingFunction: 'ease-in-out',
      transition: 'all 0.2s ease',
    },

    '& p': {
      margin: 0,
    },

    '& :is(ol, ul)': {
      paddingLeft: theme.spacing(2),
    },

    '& strong': {
      fontWeight: 'bold',
    },

    '& code': {
      wordBreak: 'break-all',
      display: codeOverflow === 'wrap' ? 'initial' : 'block',
      overflow: 'auto',
      textOverflow: 'unset',
      whiteSpace: codeOverflow === 'wrap' ? 'initial' : 'nowrap',
    },
  }),
  editInput: css({
    label: 'dash-message-edit-input',
    background: 'none',
  }),
});
