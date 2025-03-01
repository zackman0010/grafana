import { css } from '@emotion/css';
import {
  FloatingFocusManager,
  autoUpdate,
  flip,
  offset as floatingUIOffset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { useMemo, useRef, useState } from 'react';
import { CSSTransition } from 'react-transition-group';

import { GrafanaTheme2 } from '@grafana/data';
import { Portal, ToolbarButton, useStyles2 } from '@grafana/ui';
import { DashChat } from 'app/features/dash/chat/DashChat';

export const DashButton = () => {
  const dashChat = useMemo(() => new DashChat(), []);
  const [isOpened, setIsOpened] = useState(false);
  const transitionRef = useRef(null);

  const { context, refs, floatingStyles } = useFloating({
    open: isOpened,
    placement: 'bottom',
    onOpenChange: setIsOpened,
    whileElementsMounted: autoUpdate,
    middleware: [
      floatingUIOffset({
        mainAxis: 8,
        crossAxis: 0,
      }),
      flip({
        fallbackAxisSideDirection: 'end',
        crossAxis: false,
        boundary: document.body,
      }),
      shift(),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context, { outsidePress: false });
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, click]);
  const animationStyles = useStyles2(getStyles);

  return (
    <>
      <ToolbarButton iconOnly icon="ai" aria-label="Dash" ref={refs.setReference} {...getReferenceProps()} />

      {isOpened && (
        <Portal>
          <FloatingFocusManager context={context}>
            <div ref={refs.setFloating} style={floatingStyles}>
              <CSSTransition
                nodeRef={transitionRef}
                appear={true}
                in={true}
                timeout={{ appear: 150, exit: 0, enter: 0 }}
                classNames={animationStyles}
              >
                <div ref={transitionRef}>
                  <div {...getFloatingProps()}>
                    <dashChat.Component model={dashChat} />
                  </div>
                </div>
              </CSSTransition>
            </div>
          </FloatingFocusManager>
        </Portal>
      )}
    </>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    appear: css({
      opacity: '0',
      position: 'relative',
      transformOrigin: 'top',
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        transform: 'scaleY(0.5)',
      },
    }),
    appearActive: css({
      opacity: '1',
      [theme.transitions.handleMotion('no-preference', 'reduce')]: {
        transform: 'scaleY(1)',
        transition: `transform 150ms cubic-bezier(0.2, 0, 0.2, 1), opacity 150ms cubic-bezier(0.2, 0, 0.2, 1)`,
      },
    }),
  };
};
