import AutoSizer from 'react-virtualized-auto-sizer';

import { createTheme, isValidTheme } from '@grafana/data';
import themeSchema from '@grafana/data/src/themes/schema.json';
import { ThemeChangedEvent } from '@grafana/runtime';
import { CodeEditor, useTheme2 } from '@grafana/ui';
import appEvents from 'app/core/app_events';

export function ThemeEditor() {
  const {
    colors: {
      // typescript thinks whiteBase/blackBase can't be here, but it definitely is
      // TODO investigate whether we actually want it in the theme or not
      // @ts-expect-error
      whiteBase,
      // @ts-expect-error
      blackBase,
      ...colors
    },
    spacing,
    shape,
    typography,
    name,
  } = useTheme2();
  const onThemeChanged = (themeInput: string) => {
    try {
      const parsedThemeInput = JSON.parse(themeInput);
      if (isValidTheme(parsedThemeInput)) {
        const updatedTheme = createTheme(parsedThemeInput);

        appEvents.publish(new ThemeChangedEvent(updatedTheme));
      }
    } catch (error) {
      // do nothing for now - monaco will show syntax errors anyway
    }
  };

  const minimalTheme = {
    name,
    colors,
    spacing: {
      gridSize: spacing.gridSize,
    },
    shape: {
      borderRadius: parseInt(shape.radius.default.slice(0, -2), 10),
    },
    typography: {
      fontFamily: typography.fontFamily,
      fontFamilyMonospace: typography.fontFamilyMonospace,
      fontSize: typography.fontSize,
      fontWeightLight: typography.fontWeightLight,
      fontWeightRegular: typography.fontWeightRegular,
      fontWeightMedium: typography.fontWeightMedium,
      fontWeightBold: typography.fontWeightBold,
    },
  };

  return (
    <AutoSizer disableWidth>
      {({ height }) => (
        <CodeEditor
          width="100%"
          height={height}
          onBeforeEditorMount={(monaco) => {
            monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
              validate: true,
              schemas: [
                {
                  uri: 'theme-schema',
                  fileMatch: ['*'],
                  schema: themeSchema,
                },
              ],
            });
          }}
          value={JSON.stringify(minimalTheme, undefined, 2)}
          language="json"
          showMiniMap={true}
          showLineNumbers={true}
          onBlur={onThemeChanged}
        />
      )}
    </AutoSizer>
  );
}

export default ThemeEditor;
