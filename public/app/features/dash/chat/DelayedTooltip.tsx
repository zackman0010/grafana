import React, { ComponentProps, useState, useCallback, useRef } from 'react';
import { Tooltip } from '@grafana/ui';

const DEFAULT_DELAY = 500; // 500ms delay before showing tooltip

type DelayedTooltipProps = ComponentProps<typeof Tooltip>;

export const DelayedTooltip: React.FC<DelayedTooltipProps> = (props) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = useCallback(() => {
    tooltipTimer.current = setTimeout(() => {
      setShowTooltip(true);
    }, DEFAULT_DELAY);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (tooltipTimer.current) {
      clearTimeout(tooltipTimer.current);
    }
    setShowTooltip(false);
  }, []);

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <Tooltip {...props} show={showTooltip} />
    </div>
  );
};
