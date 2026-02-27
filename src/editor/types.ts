import { PatternCategory, StyleCheckPattern, StyleMarkerStyle } from "$types";

export type PosLegendItem = {
  label: string;
  className: string;
  color: string;
  swatchClassName: string;
  tags: readonly string[];
};

export type PosToken = { out: (itsf?: unknown) => unknown };

export type PosDocument = { tokens: () => { each: (cb: (token: PosToken) => void) => void } };

export type PosNlp = {
  its: { pos: unknown; precedingSpaces: unknown; value: unknown };
  readDoc: (text: string) => PosDocument;
};

export type StyleCategory = PatternCategory;

export type StyleMatch = {
  from: number;
  to: number;
  text: string;
  category: StyleCategory;
  replacement?: string;
  line: number;
  column: number;
};

export type StyleCheckConfig = {
  enabled: boolean;
  categories: { filler: boolean; redundancy: boolean; cliche: boolean };
  customPatterns: StyleCheckPattern[];
  markerStyle: StyleMarkerStyle;
  onMatchesChange?: (matches: StyleMatch[]) => void;
};
