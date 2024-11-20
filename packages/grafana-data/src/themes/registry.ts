import { Registry, RegistryItem } from '../utils/Registry';

import { createColors } from './createColors';
import { createTheme } from './createTheme';
import matrix from './themeDefinitions/matrix.json';
import { GrafanaTheme2 } from './types';

export interface ThemeRegistryItem extends RegistryItem {
  isExtra?: boolean;
  build: () => GrafanaTheme2;
}

/**
 * @internal
 * Only for internal use, never use this from a plugin
 **/
export function getThemeById(id: string): GrafanaTheme2 {
  const theme = themeRegistry.getIfExists(id) ?? themeRegistry.get('dark');
  return theme.build();
}

/**
 * @internal
 * For internal use only
 */
export function getBuiltInThemes(includeExtras?: boolean) {
  return themeRegistry.list().filter((item) => {
    return includeExtras ? true : !item.isExtra;
  });
}

/**
 * There is also a backend list at services/perferences/themes.go
 */
const themeRegistry = new Registry<ThemeRegistryItem>(() => {
  return [
    { id: 'system', name: 'System preference', build: getSystemPreferenceTheme },
    { id: 'dark', name: 'Dark', build: () => createTheme({ colors: { mode: 'dark' } }) },
    { id: 'light', name: 'Light', build: () => createTheme({ colors: { mode: 'light' } }) },
    { id: 'debug', name: 'Debug', build: createDebug, isExtra: true },
    { id: 'matrix', name: 'Matrix', build: createMatrix, isExtra: true },
  ];
});

function getSystemPreferenceTheme() {
  const mediaResult = window.matchMedia('(prefers-color-scheme: dark)');
  const id = mediaResult.matches ? 'dark' : 'light';
  return getThemeById(id);
}

/**
 * a very ugly theme that is useful for debugging and checking if the theme is applied correctly
 * borders are red,
 * backgrounds are blue,
 * text is yellow,
 * and grafana loves you <3
 * (also corners are rounded, action states (hover, focus, selected) are purple)
 */
function createDebug(): GrafanaTheme2 {
  const baseDarkColors = createColors({
    mode: 'dark',
  });

  return createTheme({
    name: 'Debug',
    colors: {
      mode: 'dark',
      background: {
        canvas: '#000033',
        primary: '#000044',
        secondary: '#000055',
      },
      text: {
        primary: '#bbbb00',
        secondary: '#888800',
        disabled: '#444400',
        link: '#dddd00',
        maxContrast: '#ffff00',
      },
      border: {
        weak: '#ff000044',
        medium: '#ff000088',
        strong: '#ff0000ff',
      },
      primary: {
        ...baseDarkColors.primary,
        border: '#ff000088',
        text: '#cccc00',
        contrastText: '#ffff00',
        shade: '#9900dd',
      },
      secondary: {
        ...baseDarkColors.secondary,
        border: '#ff000088',
        text: '#cccc00',
        contrastText: '#ffff00',
        shade: '#9900dd',
      },
      info: {
        ...baseDarkColors.info,
        shade: '#9900dd',
      },
      warning: {
        ...baseDarkColors.warning,
        shade: '#9900dd',
      },
      success: {
        ...baseDarkColors.success,
        shade: '#9900dd',
      },
      error: {
        ...baseDarkColors.error,
        shade: '#9900dd',
      },
      action: {
        hover: '#9900dd',
        focus: '#6600aa',
        selected: '#440088',
      },
    },
    shape: {
      borderRadius: 8,
    },
  });
}

function createMatrix(): GrafanaTheme2 {
  // return createTheme({
  //   name: 'Debug',
  //   colors: {
  //     mode: 'dark',
  //     background: {
  //       canvas: '#000000',
  //       primary: '#000000',
  //       secondary: '#000000',
  //     },
  //     text: {
  //       primary: '#008f11',
  //       secondary: '#008f11',
  //       disabled: '#008f11',
  //       link: '#00ff41',
  //       maxContrast: '#00ff41',
  //     },
  //     border: {
  //       weak: '#008f1144',
  //       medium: '#008f1188',
  //       strong: '#008f11ff',
  //     },
  //   },
  //   shape: {
  //     borderRadius: 0,
  //   },
  // });
  return createTheme(matrix);
}
