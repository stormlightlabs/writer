/**
 * Style check CodeMirror extension.
 *
 * Real-time prose polish that flags weak patterns (fillers, redundancies, clichés)
 * with virtual strikethrough decorations.
 *
 * Non-destructive - decorations are editor-only and not part of the document.
 *
 * Dictionary sources:
 * - Fillers: https://github.com/wooorm/fillers (MIT)
 * - Hedges: https://github.com/wooorm/hedges (MIT)
 * - Weasels: https://github.com/wooorm/weasels (MIT)
 * - Redundancies: https://github.com/retextjs/retext-simplify (MIT)
 * - Clichés: https://github.com/dundalek/no-cliches (MIT)
 */

import { PatternCategory } from "$types";
import { RangeSetBuilder } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import styleDictionaries from "./data/style-dictionaries.json";
import type { Pattern } from "./pattern-matcher";
import { PatternMatcher } from "./pattern-matcher";

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
  customPatterns: Pattern[];
  onMatchesChange?: (matches: StyleMatch[]) => void;
};

const DEFAULT_CONFIG: StyleCheckConfig = {
  enabled: true,
  categories: { filler: true, redundancy: true, cliche: true },
  customPatterns: [],
};

type DictionaryEntry = {
  label: string;
  enabled: boolean;
  patterns: Array<{ text: string; replacement: string | null; source?: string }>;
};

function loadBuiltinPatterns(): Pattern[] {
  const patterns: Pattern[] = [];

  for (const [category, dict] of Object.entries(styleDictionaries)) {
    if (category.startsWith("_")) continue;
    const cat = category as PatternCategory;
    const entry = dict as DictionaryEntry;
    for (const pattern of entry.patterns) {
      patterns.push({ text: pattern.text, category: cat, replacement: pattern.replacement ?? undefined });
    }
  }

  return patterns;
}

function createMatcher(config: StyleCheckConfig): PatternMatcher {
  const patterns = loadBuiltinPatterns().filter((p) => config.categories[p.category]);
  patterns.push(...config.customPatterns);

  return new PatternMatcher(patterns);
}

function scanViewport(
  view: EditorView,
  matcher: PatternMatcher,
): { matches: StyleMatch[]; decorations: DecorationSet } {
  const matches: StyleMatch[] = [];
  const builder = new RangeSetBuilder<Decoration>();

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    const scannedMatches = matcher.scan(text);

    for (const match of scannedMatches) {
      const matchFrom = from + match.start;
      const matchTo = from + match.end;

      const line = view.state.doc.lineAt(matchFrom);
      const column = matchFrom - line.from;

      matches.push({
        from: matchFrom,
        to: matchTo,
        text: match.pattern.text,
        category: match.pattern.category,
        replacement: match.pattern.replacement,
        line: line.number,
        column,
      });

      builder.add(
        matchFrom,
        matchTo,
        Decoration.mark({
          class: `style-flag style-${match.pattern.category}`,
          attributes: {
            "data-category": match.pattern.category,
            ...(match.pattern.replacement && { "data-replacement": match.pattern.replacement }),
          },
        }),
      );
    }
  }

  return { matches, decorations: builder.finish() };
}

function createStyleCheckPlugin(config: StyleCheckConfig) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      matcher: PatternMatcher;
      matches: StyleMatch[] = [];

      constructor(private view: EditorView) {
        this.matcher = createMatcher(config);

        if (config.enabled) {
          const result = scanViewport(view, this.matcher);
          this.decorations = result.decorations;
          this.matches = result.matches;
          config.onMatchesChange?.(this.matches);
        }
      }

      update(update: ViewUpdate) {
        if (!config.enabled) {
          this.decorations = Decoration.none;
          if (this.matches.length > 0) {
            this.matches = [];
            config.onMatchesChange?.(this.matches);
          }
          return;
        }

        if (update.docChanged || update.viewportChanged) {
          const result = scanViewport(this.view, this.matcher);
          this.decorations = result.decorations;
          this.matches = result.matches;
          config.onMatchesChange?.(this.matches);
        }
      }

      getMatches(): StyleMatch[] {
        return this.matches;
      }
    },
    { decorations: (v) => v.decorations },
  );
}

export function styleCheck(config: Partial<StyleCheckConfig> = {}): Extension {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  return createStyleCheckPlugin(fullConfig);
}

export const styleCheckTheme = EditorView.theme({
  ".style-flag": {
    textDecoration: "line-through",
    textDecorationThickness: "1.5px",
    cursor: "help",
    transition: "opacity 0.15s ease-in-out",
  },
  ".style-filler": { textDecorationColor: "#f97316" },
  ".style-redundancy": { textDecorationColor: "#eab308" },
  ".style-cliche": { textDecorationColor: "#ef4444" },
});

export function getStyleMatches(view: EditorView): StyleMatch[] {
  const plugin = view.plugin(createStyleCheckPlugin(DEFAULT_CONFIG));
  return plugin?.getMatches() ?? [];
}
