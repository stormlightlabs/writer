/**
 * Oxocarbon Dark Theme for CodeMirror 6
 *
 * Based on IBM's Carbon Design System color palette.
 * A deep, accessible dark theme with vibrant accent colors.
 *
 * @see https://carbondesignsystem.com/guidelines/color/overview/
 */

import { type Colors, createTheme, type ThemeOptions } from "./shared";

const colors: Colors = {
  background: "#161616",
  surface: "#262626",
  text: "#f2f4f8",
  textMuted: "#dde1e6",
  textDisabled: "#525252",
  border: "#393939",
  blue: "#33b1ff",
  cyan: "#3ddbd9",
  green: "#42be65",
  magenta: "#ee5396",
  orange: "#ff6f00",
  purple: "#be95ff",
  red: "#ff7eb6",
  teal: "#08bdba",
  yellow: "#ff6f00",
  white: "#ffffff",
  black: "#000000",
};

const options: ThemeOptions = {
  dark: true,
  selectionBg: "rgba(51, 177, 255, 0.2)",
  selectionBgFocused: "rgba(51, 177, 255, 0.3)",
  activeLineBg: "rgba(57, 57, 57, 0.5)",
  tooltipShadowOpacity: 0.5,
  searchMatchOpacity: 0.3,
  searchMatchSelectedOpacity: 0.5,
  highlightOpacity: 0.3,
  placeholderColor: "textMuted",
};

export const oxocarbonDark = createTheme(colors, options);
