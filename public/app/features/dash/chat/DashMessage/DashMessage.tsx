import { css, keyframes } from '@emotion/css';
import { MessageContent } from '@langchain/core/messages';
import { useEffect, useRef } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { SceneComponentProps, SceneObject, SceneObjectBase, SceneObjectState } from '@grafana/scenes';
import { useStyles2 } from '@grafana/ui';
import { getFocusStyles } from '@grafana/ui/src/themes/mixins';

import { CodeOverflow, Sender, SerializedDashMessage, ToolContent } from '../types';
import { getSettings } from '../utils';

import { ActionMessage } from './ActionMessage';
import { Image } from './Image';
import { Panel } from './Panel';
import { Text } from './Text';
import { Tool } from './Tool';

interface DashMessageState extends SceneObjectState {
  type?: string;
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
    const children: SceneObject[] = [];

    if (state.type === 'artifact') {
      const c = state.content as any;
      children.push(new Panel({
        panel: c.panel,
        timeRange: c.timeRange,
        collapsed: c.collapsed ?? true,
        expanded: false
      }));
    } else if (state.type === 'action' && typeof state.content === 'object' && !Array.isArray(state.content)) {
      // Handle action message
      const actionContent = state.content as any;
      children.push(
        new ActionMessage({
          content: actionContent.text,
          options: actionContent.options,
          actionId: actionContent.actionId,
        })
      );
    } else if (typeof state.content === 'string') {
      children.push(new Text({ content: state.content }));
    } else if (Array.isArray(state.content)) {
      state.content.forEach((content) => {
        switch (content.type) {
          case 'text':
            children.push(new Text({ content: content.text }));
            break;

          case 'tool_use':
            children.push(new Tool({ content: content as ToolContent }));
            break;

          case 'image_url':
            children.push(new Image({ url: content.image_url }));
            break;

          default:
            break;
        }
      });
    }

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

  public setToolError(id: string | undefined, error: string) {
    if (!id) {
      return;
    }

    this.state.children.forEach((child) => {
      if (child instanceof Tool && child.state.content.id === id) {
        child.setError(error);
      }
    });
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
    // If the content is an array (contains tools), we need to update the content with the current tool states
    let content = this.state.content;

    if (Array.isArray(this.state.content)) {
      content = this.state.content.map((item) => {
        if (item.type === 'tool_use') {
          // Find the corresponding tool in children
          const tool = this.state.children.find(
            (child) => child instanceof Tool && child.state.content.id === item.id
          ) as Tool | undefined;

          // If we found the tool, include its current output and error in the content
          if (tool) {
            return {
              ...item,
              output: tool.state.content.output,
              error: tool.state.content.error,
            };
          }
        }
        return item;
      });
    } else if (this.state.type === 'action') {
      // For action messages, ensure we preserve the actionId
      const actionChild = this.state.children.find(child => child instanceof ActionMessage) as ActionMessage | undefined;
      if (actionChild) {
        content = {
          text: actionChild.state.content,
          options: actionChild.state.options,
          actionId: actionChild.state.actionId,
        } as unknown as MessageContent;
      }
    }

    return {
      content,
      sender: this.state.sender,
    };
  }
}

function DashMessageRenderer({ model }: SceneComponentProps<DashMessage>) {
  const { children, editedMessage, editing, isError, sender, selected } = model.useState();
  const { codeOverflow, showTools } = getSettings(model).useState();
  const styles = useStyles2(getStyles, codeOverflow, isError, selected, sender);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selected]);

  // Separate tools from other children
  const tools = children.filter((child) => child instanceof Tool);
  const otherChildren = children.filter((child) => !(child instanceof Tool));

  // For action messages, use the same styling as AI messages
  const containerStyle = styles.container;

  return (
    <>
      <div className={containerStyle} ref={containerRef}>
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
          otherChildren.map((child) => <child.Component model={child} key={child.state.key} />)
        )}
      </div>
      {showTools && tools.length > 0 && (
        <div className={styles.toolsContainer}>
          {tools.map((tool) => (
            <tool.Component model={tool} key={tool.state.key} />
          ))}
        </div>
      )}
    </>
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
    padding: sender === 'user' ? theme.spacing(2) : theme.spacing(0.5),
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),

    ...(sender === 'user' && {
      marginTop: theme.spacing(1),
      fontWeight: theme.typography.fontWeightBold,
      '& p': {
        color: theme.colors.text.primary,
      },
    }),

    outline: selected ? 'none' : 'none',
    background:
      sender === 'ai' || sender === 'action'
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
      overflow: 'auto',
      textOverflow: 'unset',
      whiteSpace: codeOverflow === 'wrap' ? 'initial' : 'nowrap',
    },
  }),

  toolsContainer: css({
    label: 'dash-message-tools-container',
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  }),

  editInput: css({
    label: 'dash-message-edit-input',
    background: 'none',
  }),
});
