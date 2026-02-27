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

import { StyleMarkerStyle } from "$types";
import { RangeSetBuilder, Text } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, hoverTooltip, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { CATEGORY_LABELS, DEFAULT_CONFIG, DICTIONARY_CATEGORY_MAP } from "./constants";
import styleDictionaries from "./data/style-dictionaries.json";
import type { Pattern } from "./pattern-matcher";
import { PatternMatcher } from "./pattern-matcher";
import type { DictionaryEntry, StyleCheckConfig, StyleMatch } from "./types";

function loadBuiltinPatterns(): Pattern[] {
  const patterns: Pattern[] = [];

  for (const [dictionaryCategory, dict] of Object.entries(styleDictionaries)) {
    if (dictionaryCategory.startsWith("_")) continue;
    const cat = DICTIONARY_CATEGORY_MAP[dictionaryCategory];
    if (!cat) {
      continue;
    }
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

export function collectStyleMatches(doc: Text, matcher: PatternMatcher): StyleMatch[] {
  const text = doc.toString();
  const scannedMatches = matcher.scan(text);
  const matches: StyleMatch[] = [];
  const seenMatches = new Set<string>();

  for (const match of scannedMatches) {
    const matchFrom = match.start;
    const matchTo = match.end;
    const dedupeKey = `${matchFrom}:${matchTo}:${match.pattern.category}:${match.pattern.replacement ?? ""}`;
    if (seenMatches.has(dedupeKey)) {
      continue;
    }
    seenMatches.add(dedupeKey);

    const line = doc.lineAt(matchFrom);
    const column = matchFrom - line.from;

    matches.push({
      from: matchFrom,
      to: matchTo,
      text: text.slice(matchFrom, matchTo),
      category: match.pattern.category,
      replacement: match.pattern.replacement,
      line: line.number,
      column,
    });
  }

  matches.sort((left, right) =>
    left.from - right.from || left.to - right.to || left.category.localeCompare(right.category)
  );

  return matches;
}

function buildDecorations(matches: StyleMatch[], markerStyle: StyleMarkerStyle): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  for (const match of matches) {
    builder.add(
      match.from,
      match.to,
      Decoration.mark({
        class: `style-flag style-${match.category} style-marker-${markerStyle}`,
        attributes: {
          "data-category": match.category,
          "data-marker-style": markerStyle,
          ...(match.replacement && { "data-replacement": match.replacement }),
        },
      }),
    );
  }

  return builder.finish();
}

function runStyleScan(
  view: EditorView,
  matcher: PatternMatcher,
  markerStyle: StyleMarkerStyle,
): { matches: StyleMatch[]; decorations: DecorationSet } {
  const matches = collectStyleMatches(view.state.doc, matcher);
  const decorations = buildDecorations(matches, markerStyle);
  return { matches, decorations };
}

export function resolveStyleMatchAtPosition(matches: StyleMatch[], position: number, side: number): StyleMatch | null {
  const normalizedPosition = side < 0 && position > 0 ? position - 1 : position;
  for (const match of matches) {
    if (match.from > normalizedPosition) {
      break;
    }
    if (normalizedPosition >= match.from && normalizedPosition < match.to) {
      return match;
    }
  }
  return null;
}

function createTooltipContent(match: StyleMatch): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "cm-style-check-tooltip-content";

  const title = document.createElement("div");
  title.className = "cm-style-check-tooltip-title";
  title.textContent = CATEGORY_LABELS[match.category];
  container.append(title);

  const flagged = document.createElement("div");
  flagged.className = "cm-style-check-tooltip-flagged";
  flagged.textContent = `Flagged: "${match.text}"`;
  container.append(flagged);

  if (match.replacement) {
    const suggestion = document.createElement("div");
    suggestion.className = "cm-style-check-tooltip-suggestion";
    suggestion.textContent = `Suggestion: ${match.replacement}`;
    container.append(suggestion);
  }

  return container;
}

function createStyleCheckTooltip(stylePlugin: ReturnType<typeof createStyleCheckPlugin>): Extension {
  return hoverTooltip((view, pos, side) => {
    const plugin = view.plugin(stylePlugin);
    if (!plugin || plugin.matches.length === 0) {
      return null;
    }

    const match = resolveStyleMatchAtPosition(plugin.matches, pos, side);
    if (!match) {
      return null;
    }

    return {
      pos: match.from,
      end: match.to,
      above: true,
      create: () => ({ dom: createTooltipContent(match) }),
      class: "cm-style-check-tooltip",
    };
  });
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
          const result = runStyleScan(view, this.matcher, config.markerStyle);
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

        if (update.docChanged) {
          const result = runStyleScan(this.view, this.matcher, config.markerStyle);
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
  const stylePlugin = createStyleCheckPlugin(fullConfig);
  return [stylePlugin, createStyleCheckTooltip(stylePlugin)];
}

export const styleCheckTheme = EditorView.theme({
  ".style-flag": { cursor: "help", transition: "opacity 0.15s ease-in-out" },
  ".style-marker-strikethrough": { textDecorationLine: "line-through", textDecorationThickness: "1.5px" },
  ".style-marker-underline": {
    textDecorationLine: "underline",
    textDecorationThickness: "1.5px",
    textUnderlineOffset: "0.18em",
  },
  ".style-marker-highlight": { textDecorationLine: "none", borderRadius: "2px", padding: "0 1px" },
  ".style-filler": { textDecorationColor: "#f97316" },
  ".style-redundancy": { textDecorationColor: "#eab308" },
  ".style-cliche": { textDecorationColor: "#ef4444" },
  ".style-marker-highlight.style-filler": { backgroundColor: "#f9731633" },
  ".style-marker-highlight.style-redundancy": { backgroundColor: "#eab30833" },
  ".style-marker-highlight.style-cliche": { backgroundColor: "#ef444433" },
  ".cm-tooltip.cm-style-check-tooltip": { maxWidth: "320px", padding: "8px 10px" },
  ".cm-style-check-tooltip-content": { display: "flex", flexDirection: "column", gap: "4px" },
  ".cm-style-check-tooltip-title": { fontWeight: "600", fontSize: "12px" },
  ".cm-style-check-tooltip-flagged": { fontSize: "12px", opacity: "0.9" },
  ".cm-style-check-tooltip-suggestion": { fontSize: "12px", opacity: "0.9" },
});

export function getStyleMatches(view: EditorView): StyleMatch[] {
  const matcher = createMatcher(DEFAULT_CONFIG);
  return collectStyleMatches(view.state.doc, matcher);
}
