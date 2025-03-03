import { css } from '@emotion/css';
import {
  FloatingArrow,
  FloatingFocusManager,
  arrow,
  autoUpdate,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { Resizable } from 're-resizable';
import { useRef } from 'react';
import { CSSTransition } from 'react-transition-group';

import { GrafanaTheme2 } from '@grafana/data';
import { Portal, ToolbarButton, useStyles2, useTheme2 } from '@grafana/ui';
import { dashChat } from 'app/features/dash/chat/DashChat';

export const DashButton = () => {
  const transitionRef = useRef(null);
  const theme = useTheme2();
  const { opened, settings } = dashChat.useState();
  const { mode } = settings.useState();

  const arrowRef = useRef(null);
  const { context, refs, floatingStyles } = useFloating({
    open: opened,
    placement: 'bottom-end',
    onOpenChange: (opened) => dashChat.setOpened(opened),
    whileElementsMounted: autoUpdate,
    middleware: [arrow({ element: arrowRef }), offset({ mainAxis: 8, crossAxis: 0 }), shift()],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context, { outsidePress: false });
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, click]);
  const animationStyles = useStyles2(getStyles);

  return (
    <>
      <ToolbarButton iconOnly icon="ai" aria-label="Dash" ref={refs.setReference} {...getReferenceProps()} />

      {opened && mode === 'floating' && (
        <Portal>
          <FloatingFocusManager context={context}>
            <div ref={refs.setFloating} style={floatingStyles}>
              <FloatingArrow ref={arrowRef} context={context} fill={theme.colors.border.strong} />
              <CSSTransition
                nodeRef={transitionRef}
                appear={true}
                in={true}
                timeout={{ appear: 150, exit: 0, enter: 0 }}
                classNames={animationStyles}
              >
                <div ref={transitionRef}>
                  <Resizable {...getFloatingProps()} defaultSize={{ height: '500px', width: '600px' }}>
                    <dashChat.Component model={dashChat} />
                  </Resizable>
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
