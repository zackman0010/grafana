import { css } from '@emotion/css';
import { useState, useEffect } from 'react';

import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';

import { toolsByName } from './index';

interface ToolExplainerProps {
  toolName: string;
  isRunning: boolean;
  error?: string;
}

export function ToolExplainer({ toolName, isRunning, error }: ToolExplainerProps) {
  const styles = useStyles2(getStyles);
  const [dotIndex, setDotIndex] = useState(0);
  const dots = ['.', '..', '...'];

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        setDotIndex((prevIndex) => (prevIndex + 1) % dots.length);
      }, 500);

      return () => clearInterval(interval);
    }
    return () => {};
  }, [isRunning, dots.length]);

  const tool = toolsByName[toolName];
  if (!tool) {
    return toolName;
  }

  if (!tool.metadata?.explainer || typeof tool.metadata.explainer !== 'function') {
    return toolName;
  }

  let explainer = tool.metadata.explainer();
  if (!isRunning) {
    if (error) {
      return `Failed ${explainer.toLowerCase()}.`;
    }
    return `${explainer}`;
  } else {
    // animate the three dots from . to .. to ...
    return (
      <>
        {explainer}
        <span className={styles.dot}>{dots[dotIndex]}</span>
      </>
    );
  }
}

const getStyles = (theme: GrafanaTheme2) => ({
  dot: css({
    // eslint-disable-next-line @grafana/no-unreduced-motion
    animation: `${theme.transitions.easing.easeInOut} 1.5s infinite`,
  }),
});
