# Markdown Guide for Writer

This guide covers every Markdown feature available in Writer's default rendering profile. Use the **Preview** pane (`⌘ P` or the split-view toggle) to see any of these examples rendered in real time.

---

## Headings

Prefix a line with `#` characters. Writer supports six levels:

```md
# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6
```

# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

> **Tip:** The first `# Heading 1` in a document is automatically extracted as the document title and shown in the sidebar and tab bar.

---

## Paragraphs & Line Breaks

Separate paragraphs with a blank line. To force a line break within a paragraph, end the line with **two or more spaces** then press Return, or use a backslash (`\`) at the end of the line.

This is the first paragraph.

This is the second paragraph.
This line is part of the second paragraph with a soft wrap.

This line ends with two trailing spaces
so a `<br>` appears before this line.

---

## Emphasis

| Style         | Syntax        | Result      |
| ------------- | ------------- | ----------- |
| Bold          | `**bold**`    | **bold**    |
| Italic        | `*italic*`    | _italic_    |
| Bold + Italic | `***both***`  | **_both_**  |
| Strikethrough | `~~deleted~~` | ~~deleted~~ |
| Inline code   | `` `code` ``  | `code`      |

---

## Links

### Inline Links

```md
[Writer](https://example.com)
[Writer](https://example.com "Homepage tooltip")
```

[Writer](https://example.com)
[Writer](https://example.com "Homepage tooltip")

### Autolinks

Writer automatically converts bare URLs into clickable links:

```md
https://example.com
```

<https://example.com>

### Reference Links

```md
[Writer][homepage]

[homepage]: https://example.com "Writer Homepage"
```

[Writer][homepage]

[homepage]: https://example.com "Writer Homepage"

---

## Images

```md
![Alt text](https://via.placeholder.com/600x200 "Optional title")
```

![Alt text](https://via.placeholder.com/600x200 "Optional title")

---

## Lists

### Unordered

Use `-`, `*`, or `+` as bullet markers:

```md
- Apples
- Oranges
  - Blood orange
  - Navel
- Bananas
```

- Apples
- Oranges
  - Blood orange
  - Navel
- Bananas

### Ordered

```md
1. First
2. Second
3. Third
```

1. First
2. Second
3. Third

### Task Lists

Writer supports GitHub-style task lists. They are tracked in the status bar with a completion counter.

```md
- [x] Draft outline
- [x] Write introduction
- [ ] Add examples
- [ ] Proofread final draft
```

- [x] Draft outline
- [x] Write introduction
- [ ] Add examples
- [ ] Proofread final draft

---

## Blockquotes

Prefix lines with `>`:

```md
> "The first draft is just you telling yourself the story."
> — Terry Pratchett
```

> "The first draft is just you telling yourself the story."
> — Terry Pratchett

You can nest blockquotes and include other elements inside them:

> **Note:** You can use _emphasis_, `code`, and even lists inside a blockquote.
>
> - Like
> - This

---

## Code

### Inline Code

Wrap text with backticks:

```md
Use the `render()` function to generate output.
```

Use the `render()` function to generate output.

### Fenced Code Blocks

Use triple backticks with an optional language identifier for syntax display:

````md
```rust
fn greet(name: &str) {
    println!("Hello, {}!", name);
}
```
````

```rust
fn greet(name: &str) {
    println!("Hello, {}!", name);
}
```

Supported in the editor's syntax highlighting layer (powered by CodeMirror), though the preview renders all fenced blocks uniformly.

---

## Tables

Use pipes `|` and hyphens `-` to create tables. Colons control alignment:

```md
| Left-aligned | Centered | Right-aligned |
|:-------------|:--------:|--------------:|
| Apples       |    12    |         $1.20 |
| Oranges      |     8    |         $0.90 |
| **Totals**   |  **20**  |     **$2.10** |
```

| Left-aligned | Centered | Right-aligned |
| :----------- | :------: | ------------: |
| Apples       |    12    |         $1.20 |
| Oranges      |    8     |         $0.90 |
| **Totals**   |  **20**  |     **$2.10** |

---

## Horizontal Rules

Any of these on their own line will produce a divider:

```md
---
***
___
```

---

## Footnotes

Add footnotes with `[^id]` in the text and define them anywhere in the document:

```md
Writing is rewriting[^1]. The goal is clarity[^2].

[^1]: Attributed to many authors throughout history.
[^2]: Strunk & White, *The Elements of Style*.
```

Writing is rewriting[^1]. The goal is clarity[^2].

[^1]: Attributed to many authors throughout history.

[^2]: Strunk & White, _The Elements of Style_.

---

## Description Lists

Use a term followed by `:` on the next line to create a description list:

```md
Markdown
: A lightweight markup language for creating formatted text.

CommonMark
: A strongly defined specification of Markdown syntax.

GFM
: GitHub Flavored Markdown — a superset of CommonMark with extra features.
```

Markdown
: A lightweight markup language for creating formatted text.

CommonMark
: A strongly defined specification of Markdown syntax.

GFM
: GitHub Flavored Markdown — a superset of CommonMark with extra features.

---

## Escaping Special Characters

Prefix any Markdown character with a backslash to display it literally:

```md
\*This is not italic\*
\# This is not a heading
```

\*This is not italic\*
\# This is not a heading

Characters you can escape: ``\ ` * _ { } [ ] ( ) # + - . ! | ~``

---

## What's Not Supported

The GFM-Safe profile intentionally **disables** some features for safety and simplicity:

| Feature                              | Status          |
| ------------------------------------ | --------------- |
| Raw HTML (`<div>`, `<script>`, etc.) | Filtered out    |
| Superscript / Subscript              | Disabled        |
| Math (`$...$`, `$$...$$`)            | Disabled        |
| Wiki-links (`[[Page]]`)              | Disabled        |
| Spoiler / Greentext                  | Disabled        |
| Underline (`__text__` as underline)  | Disabled        |

---

## Quick Reference

| Element          | Syntax                      |
| ---------------- | --------------------------- |
| Heading          | `# H1` … `###### H6`        |
| Bold             | `**text**`                  |
| Italic           | `*text*`                    |
| Strikethrough    | `~~text~~`                  |
| Link             | `[text](url)`               |
| Image            | `![alt](url)`               |
| Inline code      | `` `code` ``                |
| Code block       | ` ``` ` or ` ```lang `      |
| Blockquote       | `> text`                    |
| Unordered list   | `- item`                    |
| Ordered list     | `1. item`                   |
| Task list        | `- [x] done` / `- [ ] todo` |
| Table            | `\| h1 \| h2 \|`            |
| Footnote         | `[^id]` / `[^id]: text`     |
| Description list | `Term` + `: Definition`     |
| Horizontal rule  | `---`                       |
| Escape           | `\*`                        |
