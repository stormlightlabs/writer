// oxlint-disable no-inline-comments
// @ts-check
import chalk from "chalk";
import { marked } from "marked";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import nunjucks from "nunjucks";

/** @typedef {Object} FrontMatter
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [template]
 */

/** @typedef {FrontMatter & { content: string; outputPath: string; slug: string }} Page */

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, "src");
const distDir = join(__dirname, "dist");
const templatesDir = join(srcDir, "templates");
const pagesDir = join(srcDir, "pages");

// TODO: svgs/icon directive
nunjucks.configure(templatesDir, { autoescape: false });

/**
 * @param {string} dir
 * @returns {Promise<void>}
 */
async function ensureDir(dir) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * @param {string} raw
 * @returns {{ frontMatter: FrontMatter, body: string }}
 */
function parseFrontMatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontMatter: {}, body: raw };
  }
  const [, yaml, body] = match;

  /** @type {FrontMatter} */
  const frontMatter = {};

  for (const line of yaml.split("\n")) {
    const [key, ...vals] = line.split(":");
    if (key && vals.length > 0) {
      frontMatter[/** @type {keyof FrontMatter} */ (key.trim())] = vals.join(":").trim();
    }
  }
  return { frontMatter, body };
}

/**
 * @returns {Promise<void>}
 */
async function build() {
  console.log(chalk.cyan("Building static site..."));
  await ensureDir(distDir);
  await ensureDir(join(distDir, "static"));

  if (existsSync(join(srcDir, "static"))) {
    await cp(join(srcDir, "static"), join(distDir, "static"), { recursive: true });
    console.log(chalk.gray("  Copied static assets"));
  }

  const files = await readdir(pagesDir);
  /** @type {Page[]} */
  const pages = [];

  for (const file of files) {
    if (!file.endsWith(".md")) continue;

    const raw = await readFile(join(pagesDir, file), "utf-8");
    const { frontMatter, body } = parseFrontMatter(raw);
    const content = await marked(body);
    const slug = file.replace(".md", "");
    const outputPath = slug === "index" ? "index.html" : `${slug}.html`;

    pages.push({ ...frontMatter, content, outputPath, slug });
  }

  for (const page of pages) {
    const template = page.template || "page";
    const ctx = { page, pages, currentPath: page.outputPath, content: page.content };
    const output = nunjucks.render(`${template}.njk`, ctx);
    const outPath = join(distDir, page.outputPath);
    await ensureDir(dirname(outPath));
    await writeFile(outPath, output);
    console.log(chalk.green("  ✓") + " " + chalk.white(page.outputPath));
  }

  console.log(chalk.cyan("\nDone!"));
}

try {
  await build();
} catch (err) {
  console.error(chalk.red("Error:"), err instanceof Error ? err.message : String(err));
  process.exit(1);
}
