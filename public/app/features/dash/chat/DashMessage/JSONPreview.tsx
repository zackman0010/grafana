import { css } from '@emotion/css';
import { useState } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { Modal, useStyles2 } from '@grafana/ui';

export interface JSONPreviewProps {
  value: unknown;
  label: string;
  maxLines?: number;
}

export function JSONPreview({ value, label, maxLines = 2 }: JSONPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const styles = useStyles2(getJsonValueStyles);

  // Format for preview: compact but with line breaks
  const previewReplacer = (key: string, value: unknown) => {
    if (typeof value === 'string') {
      return value; // Don't add quotes to strings
    }
    return value;
  };

  // Format for modal: pretty printed with quotes
  const modalReplacer = (key: string, value: unknown) => {
    if (typeof value === 'string') {
      return value; // Keep quotes for strings in modal view
    }
    return value;
  };

  // Use small indentation for preview but keep structure
  const previewString = JSON.stringify(value, previewReplacer, 1).replace(/"/g, ''); // Remove quotes

  const modalString = JSON.stringify(value, modalReplacer, 2);

  return (
    <>
      <div className={styles.container} onClick={() => setIsModalOpen(true)}>
        <pre className={styles.preview}>{previewString}</pre>
      </div>

      <Modal isOpen={isModalOpen} title={label} onDismiss={() => setIsModalOpen(false)} closeOnBackdropClick>
        <pre className={styles.fullValue}>{modalString}</pre>
      </Modal>
    </>
  );
}

const getJsonValueStyles = (theme: GrafanaTheme2) => ({
  container: css({
    label: 'json-value-container',
    cursor: 'pointer',
    maxWidth: '300px',
    maxHeight: '212px',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.shape.radius.default,
    boxShadow: `0 1px 3px ${theme.colors.background.secondary}`,
    '&:hover': {
      '&::after': {
        content: '"Click to expand"',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: theme.colors.background.primary,
        fontSize: '0.7em',
        color: theme.colors.text.secondary,
        textAlign: 'center',
        padding: theme.spacing(0.25),
      },
    },
  }),
  preview: css({
    label: 'json-value-preview',
    margin: 0,
    fontSize: '0.65em',
    lineHeight: 1.2,
    fontFamily: theme.typography.fontFamilyMonospace,
    whiteSpace: 'pre-wrap',
    overflow: 'hidden',
    color: theme.colors.text.secondary,
    letterSpacing: '0.02em',
    height: '100%',
    width: '100%',
    '&::-webkit-scrollbar': {
      width: '4px',
      height: '4px',
    },
    '&::-webkit-scrollbar-track': {
      background: theme.colors.background.primary,
      borderRadius: theme.shape.radius.default,
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.colors.border.weak,
      borderRadius: theme.shape.radius.default,
      '&:hover': {
        background: theme.colors.border.medium,
      },
    },
  }),
  fullValue: css({
    label: 'json-value-full',
    margin: 0,
    fontSize: '0.9em',
    fontFamily: theme.typography.fontFamilyMonospace,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '70vh',
    overflow: 'auto',
    padding: theme.spacing(2),
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.shape.radius.default,
  }),
});
