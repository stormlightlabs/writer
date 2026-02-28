/**
 * Oxocarbon Light Theme for CodeMirror 6
 *
 * Based on IBM's Carbon Design System color palette.
 * A clean, accessible light theme with vibrant accent colors.
 *
 * @see https://carbondesignsystem.com/guidelines/color/overview/
 */

import { type Colors, createTheme, type ThemeOptions } from "./shared";

const colors: Colors = {
  background: "#f2f4f8",
  surface: "#dde1e6",
  text: "#272d35",
  textMuted: "#525f70",
  textDisabled: "#68788d",
  border: "#bec6cf",
  blue: "#0f62fe",
  cyan: "#673ab7",
  green: "#42be65",
  magenta: "#ee5396",
  orange: "#ff6f00",
  purple: "#be95ff",
  red: "#ff7eb6",
  teal: "#673ab7",
  yellow: "#ff6f00",
  white: "#f2f4f8",
  black: "#000000",
};

const options: ThemeOptions = {
  dark: false,
  selectionBg: "rgba(15, 98, 254, 0.15)",
  selectionBgFocused: "rgba(15, 98, 254, 0.2)",
  activeLineBg: "rgba(190, 198, 207, 0.45)",
  tooltipShadowOpacity: 0.15,
  searchMatchOpacity: 0.35,
  searchMatchSelectedOpacity: 0.55,
  highlightOpacity: 0.35,
  placeholderColor: "textDisabled",
};

export const oxocarbonLight = createTheme(colors, options);
