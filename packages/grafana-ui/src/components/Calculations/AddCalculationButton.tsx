import { css } from '@emotion/css';
import { memo, useState } from 'react';

import { useTheme2 } from '../../themes';
import { Button } from '../Button';
import { Modal } from '../Modal/Modal';

import { CalculationEditorModalContent } from './CalculationEditorModalContent';

const TOP_BAR_LEVEL_HEIGHT = 40; // TODO import from AppChrome/types.ts

export const AddCalculationButton = memo(() => {
  const theme = useTheme2();
  const noqlStyles = () => {
    return {
      pageToolbar: css({
        height: TOP_BAR_LEVEL_HEIGHT,
        display: 'flex',
        padding: theme.spacing(0, 0, 1, 0),
        alignItems: 'center',
        borderBottom: `1px solid ${theme.colors.border.weak}`,
      }),
      actions: css({
        label: 'Table-actions',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'nowrap',
        justifyContent: 'flex-end',
        paddingLeft: theme.spacing(1),
        flexGrow: 1,
        gap: theme.spacing(1),
        minWidth: 0,

        '.body-drawer-open &': {
          display: 'none',
        },
      }),
    };
  };

  const [isEditing, setIsEditing] = useState(false);

  const onCalculationAdd = () => {
    // let update = cloneDeep(linksSafe);
    // setEditIndex(update.length);
    setIsEditing(true);
  };

  const onAddCalculationCancel = () => {
    setIsEditing(false);
  };

  return (
    <>
      {isEditing && (
        <Modal title="New calculation" isOpen={true} closeOnBackdropClick={false} onDismiss={onAddCalculationCancel}>
          <CalculationEditorModalContent
            // index={editIndex}
            // link={isNew ? { title: '', url: '' } : linksSafe[editIndex]}
            link={{ name: '', expression: '' }}
            // data={data}
            // onSave={onDataLinkChange}
            // onCancel={onDataLinkCancel}
            // getSuggestions={getSuggestions}
          />
        </Modal>
      )}
      <div className={noqlStyles().pageToolbar}>
        <div className={noqlStyles().actions}>
          <Button onClick={onCalculationAdd} fullWidth={false} size="sm">
            Add calculation
          </Button>
        </div>
      </div>
    </>
  );
});

AddCalculationButton.displayName = 'AddCalculationButton';
