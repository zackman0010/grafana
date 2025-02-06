import tinycolor from 'tinycolor2';

import { BigValueColorMode } from '@grafana/schema';

export const getBackgroundColor = (colorMode: BigValueColorMode, valueColor: string, isDark: boolean): string => {
  const themeFactor = isDark ? 1 : -0.7;
  let backgroundColor = 'transparent';
  switch (colorMode) {
    case BigValueColorMode.Background:
      const bgColor2 = tinycolor(valueColor)
        .darken(15 * themeFactor)
        .spin(8)
        .toRgbString();
      const bgColor3 = tinycolor(valueColor)
        .darken(5 * themeFactor)
        .spin(-8)
        .toRgbString();
      backgroundColor = `linear-gradient(120deg, ${bgColor2}, ${bgColor3})`;
      break;
    case BigValueColorMode.BackgroundSolid:
      backgroundColor = tinycolor(valueColor).toString();
      break;
  }
  return backgroundColor;
};
