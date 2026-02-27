import { PosLegendItem, StyleCheckConfig } from "./types";

export const CATEGORY_LABELS = { filler: "Fillers & Weak Language", redundancy: "Redundancies", cliche: "Clichés" };

export const CATEGORY_COLORS = { filler: "#f97316", redundancy: "#eab308", cliche: "#ef4444" };

export const POS_LEGEND_ITEMS: readonly PosLegendItem[] = [
  {
    label: "Noun",
    className: "cm-pos-noun",
    color: "#ef4444",
    swatchClassName: "bg-[#ef4444]",
    tags: ["NOUN", "PROPN"],
  },
  { label: "Verb", className: "cm-pos-verb", color: "#3b82f6", swatchClassName: "bg-[#3b82f6]", tags: ["VERB", "AUX"] },
  {
    label: "Adjective",
    className: "cm-pos-adjective",
    color: "#a87132",
    swatchClassName: "bg-[#a87132]",
    tags: ["ADJ"],
  },
  { label: "Adverb", className: "cm-pos-adverb", color: "#8b5cf6", swatchClassName: "bg-[#8b5cf6]", tags: ["ADV"] },
  {
    label: "Conjunction",
    className: "cm-pos-conjunction",
    color: "#22c55e",
    swatchClassName: "bg-[#22c55e]",
    tags: ["CONJ", "CCONJ", "SCONJ"],
  },
] as const;

export const POS_CLASS_MAP = POS_LEGEND_ITEMS.reduce<Record<string, string>>((acc, item) => {
  for (const tag of item.tags) {
    acc[tag] = item.className;
  }
  return acc;
}, {});

export const POS_HIGHLIGHT_LEGEND = POS_LEGEND_ITEMS.map(({ label, className, color, swatchClassName }) => ({
  label,
  className,
  color,
  swatchClassName,
}));

export const POS_THEME = POS_LEGEND_ITEMS.reduce<Record<string, { color: string }>>((acc, item) => {
  acc[`.${item.className}`] = { color: item.color };
  return acc;
}, {});

export const DEFAULT_CONFIG: StyleCheckConfig = {
  enabled: true,
  categories: { filler: true, redundancy: true, cliche: true },
  customPatterns: [],
  markerStyle: "highlight",
};
