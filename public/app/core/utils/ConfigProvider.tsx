import { useEffect, useState } from 'react';
import * as React from 'react';
import { SkeletonTheme } from 'react-loading-skeleton';

import { GrafanaTheme2, ThemeContext } from '@grafana/data';
import { ShowThemeEditorEvent, ThemeChangedEvent, config } from '@grafana/runtime';
import 'react-loading-skeleton/dist/skeleton.css';
import { Drawer } from '@grafana/ui';

import { appEvents } from '../core';

import ThemeEditor from './ThemeEditor';

export const ThemeProvider = ({ children, value }: { children: React.ReactNode; value: GrafanaTheme2 }) => {
  const [theme, setTheme] = useState(value);
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const isDevEnv = config.buildInfo.env === 'development';

  useEffect(() => {
    const subs = [
      appEvents.subscribe(ThemeChangedEvent, (event) => {
        config.theme2 = event.payload;
        setTheme(event.payload);
      }),
      appEvents.subscribe(ShowThemeEditorEvent, () => {
        setShowThemeEditor(true);
      }),
    ];

    return () => {
      for (const sub of subs) {
        sub.unsubscribe();
      }
    };
  }, []);

  return (
    <ThemeContext.Provider value={theme}>
      <SkeletonTheme
        baseColor={theme.colors.emphasize(theme.colors.background.secondary)}
        highlightColor={theme.colors.emphasize(theme.colors.background.secondary, 0.1)}
        borderRadius={theme.shape.radius.default}
      >
        {children}
        {isDevEnv && showThemeEditor && (
          <Drawer title="Theme editor" onClose={() => setShowThemeEditor(false)}>
            <ThemeEditor />
          </Drawer>
        )}
      </SkeletonTheme>
    </ThemeContext.Provider>
  );
};

export const provideTheme = <P extends {}>(component: React.ComponentType<P>, theme: GrafanaTheme2) => {
  return function ThemeProviderWrapper(props: P) {
    return <ThemeProvider value={theme}>{React.createElement(component, { ...props })}</ThemeProvider>;
  };
};
