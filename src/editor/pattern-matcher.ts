// oxlint-disable max-classes-per-file
/**
 * Aho-Corasick pattern matcher for efficient multi-pattern text searching.
 *
 * This implementation provides O(n + m) time complexity where n is the text length and m is the number of matches.
 *
 * It handles multi-word phrases and supports case-insensitive matching with word boundary awareness.
 */

export type PatternCategory = "filler" | "redundancy" | "cliche";

export type Pattern = { text: string; category: PatternCategory; replacement?: string };

export type Match = { start: number; end: number; pattern: Pattern };

class Node {
  children: Map<string, Node>;
  fail: Node | null;
  output: Pattern[];
  depth: number;

  private constructor(depth: number) {
    this.children = new Map();
    this.fail = null;
    this.output = [];
    this.depth = depth;
  }

  static create(depth: number): Node {
    return new Node(depth);
  }
}

function buildAutomaton(patterns: Pattern[]): Node {
  const root = Node.create(0);

  for (const pattern of patterns) {
    let node = root;
    const text = pattern.text.toLowerCase();

    for (const char of text) {
      if (!node.children.has(char)) {
        node.children.set(char, Node.create(node.depth + 1));
      }
      node = node.children.get(char)!;
    }

    node.output.push(pattern);
  }

  const queue: Node[] = [];

  for (const [, node] of root.children) {
    node.fail = root;
    queue.push(node);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const [char, child] of current.children) {
      let fail = current.fail;

      while (fail !== null && !fail.children.has(char)) {
        fail = fail.fail;
      }

      if (fail === null) {
        child.fail = root;
      } else {
        child.fail = fail.children.get(char)!;
        child.output.push(...child.fail.output);
      }

      queue.push(child);
    }
  }

  return root;
}

function isWordBoundary(text: string, pos: number): boolean {
  if (pos <= 0 || pos >= text.length) {
    return true;
  }

  const prev = text[pos - 1];
  const next = text[pos];
  const isPrevLetter = /[a-zA-Z]/.test(prev);
  const isNextLetter = /[a-zA-Z]/.test(next);
  return !isPrevLetter || !isNextLetter;
}

/**
 * PatternMatcher implements the Aho-Corasick algorithm for efficient multi-pattern searching.
 *
 * It supports case-insensitive matching and respects word boundaries to avoid matching partial words.
 */
export class PatternMatcher {
  private root: Node;
  private patterns: Pattern[];

  constructor(patterns: Pattern[]) {
    this.patterns = patterns;
    this.root = buildAutomaton(patterns);
  }

  /**
   * Rebuilds the automaton with a new set of patterns.
   *
   * This is called when dictionaries are modified by the user.
   */
  rebuild(patterns: Pattern[]): void {
    this.patterns = patterns;
    this.root = buildAutomaton(patterns);
  }

  /**
   * Scans text for all pattern matches.
   *
   * Returns matches with word boundary validation.
   */
  scan(text: string): Match[] {
    const matches: Match[] = [];
    const lowerText = text.toLowerCase();

    let node = this.root;

    for (let i = 0; i < lowerText.length; i++) {
      const char = lowerText[i];

      while (node !== this.root && !node.children.has(char)) {
        node = node.fail!;
      }

      if (node.children.has(char)) {
        node = node.children.get(char)!;
      }

      for (const pattern of node.output) {
        const matchStart = i - pattern.text.length + 1;
        const matchEnd = i + 1;
        const startBoundary = isWordBoundary(lowerText, matchStart);
        const endBoundary = isWordBoundary(lowerText, matchEnd);

        if (startBoundary && endBoundary) {
          matches.push({ start: matchStart, end: matchEnd, pattern });
        }
      }
    }

    return matches;
  }

  getPatterns(): Pattern[] {
    return [...this.patterns];
  }
}
