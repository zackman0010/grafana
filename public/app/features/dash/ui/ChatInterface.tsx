import { css } from '@emotion/css';
import React, { useRef, useEffect } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { Button, Icon, TextArea, useStyles2, JSONFormatter } from '@grafana/ui';

import { useAgent } from '../agent/AgentContext';

export interface ChatInterfaceProps {
  placeholder?: string;
  title?: string;
}

export const ChatInterface = ({
  placeholder = 'Type your message here...',
  title = 'AI Assistant',
}: ChatInterfaceProps) => {
  const styles = useStyles2(getStyles);
  const [messages, isLoading, askMessage] = useAgent();
  const [inputValue, setInputValue] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedJsonMessages, setExpandedJsonMessages] = React.useState<Record<string, boolean>>({});

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) {
      return;
    }

    const message = inputValue;
    setInputValue('');
    await askMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleJsonExpand = (messageId: string) => {
    setExpandedJsonMessages((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const renderMessageContent = (message: any) => {
    // Check if content is an object (but not a React element)
    if (
      message.content !== null &&
      typeof message.content === 'object' &&
      !React.isValidElement(message.content)
    ) {
      const isExpanded = expandedJsonMessages[message.id] || false;
      return (
        <div className={styles.jsonContainer}>
          <div className={styles.jsonHeader}>
            <span className={styles.jsonLabel}>JSON Object</span>
            <Button
              variant="secondary"
              size="sm"
              fill="text"
              icon={isExpanded ? 'angle-down' : 'angle-right'}
              onClick={() => toggleJsonExpand(message.id)}
              className={styles.jsonToggle}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
          <div className={styles.jsonFormatterWrapper}>
            <JSONFormatter json={message.content} open={isExpanded ? 999 : 0} />
          </div>
        </div>
      );
    }
    
    // Otherwise render as string
    return <div className={styles.messageText}>{message.content.toString()}</div>;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>{title}</h3>
      </div>
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <Icon name="comments-alt" size="xxl" />
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${message.sender === 'user' ? styles.userMessage : styles.aiMessage}`}
            >
              <div className={styles.messageContent}>
                <div className={styles.messageSender}>
                  <Icon name={message.sender === 'user' ? 'user' : 'grafana'} size="sm" />
                  <span>{message.sender === 'user' ? 'You' : 'AI Assistant'}</span>
                </div>
                {renderMessageContent(message)}
                <div className={styles.messageTime}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className={styles.inputContainer}>
        <TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={styles.input}
          disabled={isLoading}
          rows={2}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
          icon="comment-alt"
          className={styles.sendButton}
        >
          Send
        </Button>
      </div>
      {isLoading && (
        <div className={styles.loadingIndicator}>
          <Icon name="spinner" className={styles.spinner} />
          Processing...
        </div>
      )}
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '400px',
      maxHeight: '600px',
      background: theme.colors.background.primary,
      border: `1px solid ${theme.colors.border.medium}`,
      borderRadius: theme.shape.radius.default,
      overflow: 'hidden',
    }),
    header: css({
      padding: theme.spacing(1, 2),
      borderBottom: `1px solid ${theme.colors.border.medium}`,
      background: theme.colors.background.secondary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      '& h3': {
        margin: 0,
        fontSize: theme.typography.h4.fontSize,
      },
    }),
    messagesContainer: css({
      flex: 1,
      overflowY: 'auto',
      padding: theme.spacing(2),
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(2),
    }),
    message: css({
      maxWidth: '80%',
      padding: theme.spacing(1, 2),
      borderRadius: theme.shape.radius.default,
      wordBreak: 'break-word',
    }),
    userMessage: css({
      alignSelf: 'flex-end',
      background: theme.colors.primary.transparent,
      color: theme.colors.text.primary,
    }),
    aiMessage: css({
      alignSelf: 'flex-start',
      background: theme.colors.background.secondary,
      color: theme.colors.text.primary,
    }),
    messageContent: css({
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(0.5),
    }),
    messageSender: css({
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(0.5),
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.fontWeightMedium,
      color: theme.colors.text.secondary,
    }),
    messageText: css({
      fontSize: theme.typography.size.md,
      whiteSpace: 'pre-wrap',
    }),
    messageTime: css({
      fontSize: theme.typography.size.xs,
      color: theme.colors.text.secondary,
      alignSelf: 'flex-end',
    }),
    inputContainer: css({
      display: 'flex',
      padding: theme.spacing(2),
      borderTop: `1px solid ${theme.colors.border.medium}`,
      background: theme.colors.background.secondary,
      gap: theme.spacing(1),
    }),
    input: css({
      flex: 1,
      resize: 'none',
    }),
    sendButton: css({
      alignSelf: 'flex-end',
    }),
    loadingIndicator: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing(1),
      padding: theme.spacing(1),
      background: theme.colors.background.secondary,
      color: theme.colors.text.secondary,
      fontSize: theme.typography.size.sm,
      borderTop: `1px solid ${theme.colors.border.medium}`,
    }),
    spinner: css({
      '@media (prefers-reduced-motion: no-preference)': {
        animation: 'spin 1s linear infinite',
        '@keyframes spin': {
          '0%': {
            transform: 'rotate(0deg)',
          },
          '100%': {
            transform: 'rotate(360deg)',
          },
        },
      },
    }),
    emptyState: css({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing(2),
      height: '100%',
      color: theme.colors.text.secondary,
      '& p': {
        margin: 0,
      },
    }),
    jsonContainer: css({
      fontSize: theme.typography.size.md,
      maxWidth: '100%',
      overflow: 'hidden',
      border: `1px solid ${theme.colors.border.weak}`,
      borderRadius: theme.shape.radius.default,
      background: theme.colors.background.secondary,
    }),
    jsonHeader: css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing(0.5, 1),
      borderBottom: `1px solid ${theme.colors.border.weak}`,
      background: theme.colors.background.secondary,
    }),
    jsonLabel: css({
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.fontWeightMedium,
      color: theme.colors.text.secondary,
    }),
    jsonToggle: css({
      marginLeft: 'auto',
    }),
    jsonFormatterWrapper: css({
      padding: theme.spacing(1),
      maxHeight: '400px',
      overflow: 'auto',
      background: theme.colors.background.primary,
    }),
  };
};
