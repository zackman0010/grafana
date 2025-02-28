import { useMemo, useState } from 'react';

import { ClickOutsideWrapper, ToolbarButton, Tooltip } from '@grafana/ui';
import { DashChat } from 'app/features/dash/chat/DashChat';

export const DashButton = () => {
  const dashChat = useMemo(() => new DashChat(), []);
  const [isOpened, setIsOpened] = useState(false);

  return (
    <Tooltip
      placement="bottom-end"
      show={isOpened}
      maxWidth={600}
      content={
        <ClickOutsideWrapper
          includeButtonPress={false}
          onClick={() => {
            if (isOpened) {
              setIsOpened(false);
            }
          }}
        >
          <dashChat.Component model={dashChat} />
        </ClickOutsideWrapper>
      }
    >
      <ToolbarButton
        iconOnly
        icon="ai"
        aria-label="Dash"
        onClick={(evt) => {
          evt.preventDefault();
          evt.stopPropagation();
          setIsOpened(true);
        }}
      />
    </Tooltip>
  );
};
