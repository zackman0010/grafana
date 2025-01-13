import { useEffect, useState } from 'react';
import * as React from 'react';
import { SkeletonTheme } from 'react-loading-skeleton';

import { GrafanaTheme2, ThemeContext } from '@grafana/data';
import { ThemeChangedEvent, config } from '@grafana/runtime';

import { appEvents } from '../core';

import 'react-loading-skeleton/dist/skeleton.css';

export const VARIABLE_PREFIX = '--gf-theme';

export const ThemeProvider = ({ children, value }: { children: React.ReactNode; value: GrafanaTheme2 }) => {
  const [theme, setTheme] = useState(value);

  useEffect(() => {
    const sub = appEvents.subscribe(ThemeChangedEvent, (event) => {
      // config.theme2 = event.payload;
      // setTheme(event.payload);
      setThemeVariables(event.payload.colors, VARIABLE_PREFIX);
    });

    return () => sub.unsubscribe();
  }, []);

  return (
    <ThemeContext.Provider value={theme}>
      <SkeletonTheme
        baseColor={theme.colors.emphasize(theme.colors.background.secondary)}
        highlightColor={theme.colors.emphasize(theme.colors.background.secondary, 0.1)}
        borderRadius={theme.shape.radius.default}
      >
        {children}
      </SkeletonTheme>
    </ThemeContext.Provider>
  );
};

export const provideTheme = <P extends {}>(component: React.ComponentType<P>, theme: GrafanaTheme2) => {
  return function ThemeProviderWrapper(props: P) {
    return <ThemeProvider value={theme}>{React.createElement(component, { ...props })}</ThemeProvider>;
  };
};

export function setThemeVariables(themeColors: GrafanaTheme2['colors'], prefix: string, element?: HTMLElement) {
  if (!element) {
    element = document.documentElement;
  }

  for (const [key, value] of Object.entries(themeColors)) {
    if (typeof value === 'string' || typeof value === 'number') {
      element.style.setProperty(`${prefix}-${key}`, `${value}`);
      if (value === 'color') {
        element.style.setProperty('color', `${value}`);
      }
    } else {
      setThemeVariables(themeColors[key], `${prefix}-${key}`, element);
    }
  }
}

export function clearThemeVariables(prefix: string, element?: HTMLElement) {
  if (!element) {
    element = document.documentElement;
  }

  element.style.cssText = '';

  // for (const key of element.style) {
  //   if (key.startsWith(prefix)) {
  //     element.style.removeProperty(key);
  //   }
  // }
}
