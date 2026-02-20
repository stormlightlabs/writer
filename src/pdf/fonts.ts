// oxlint-disable no-await-in-loop

import { Font } from "@react-pdf/renderer";
import { PdfFontRegistrationError, PdfFontSourceFetchError } from "./errors";
import type {
  FontConfig,
  FontName,
  FontPayloadFormat,
  FontStrategy,
  PdfFontResolution,
  PdfFontSourceDescriptor,
} from "./types";

const staticFont = (filename: string): string => {
  const relativePath = `/fonts/${filename}`;
  const origin = globalThis.location?.origin;
  if (!origin || origin === "null") {
    return relativePath;
  }
  return `${origin}${relativePath}`;
};

const FONT_PATHS: Record<FontName, FontConfig> = {
  "IBM Plex Mono": {
    family: "IBMPlexMono",
    files: [
      { file: "ibm-plex-mono-400-normal.ttf", fontWeight: "normal", fontStyle: "normal" },
      { file: "ibm-plex-mono-400-italic.ttf", fontWeight: "normal", fontStyle: "italic" },
      { file: "ibm-plex-mono-700-normal.ttf", fontWeight: "bold", fontStyle: "normal" },
      { file: "ibm-plex-mono-700-italic.ttf", fontWeight: "bold", fontStyle: "italic" },
    ],
  },
  "IBM Plex Sans Variable": {
    family: "IBMPlexSans",
    files: [
      { file: "ibm-plex-sans-400-normal.ttf", fontWeight: "normal", fontStyle: "normal" },
      { file: "ibm-plex-sans-400-italic.ttf", fontWeight: "normal", fontStyle: "italic" },
      { file: "ibm-plex-sans-700-normal.ttf", fontWeight: "bold", fontStyle: "normal" },
      { file: "ibm-plex-sans-700-italic.ttf", fontWeight: "bold", fontStyle: "italic" },
    ],
  },
  "IBM Plex Serif": {
    family: "IBMPlexSerif",
    files: [
      { file: "ibm-plex-serif-400-normal.ttf", fontWeight: "normal", fontStyle: "normal" },
      { file: "ibm-plex-serif-400-italic.ttf", fontWeight: "normal", fontStyle: "italic" },
      { file: "ibm-plex-serif-700-normal.ttf", fontWeight: "bold", fontStyle: "normal" },
      { file: "ibm-plex-serif-700-italic.ttf", fontWeight: "bold", fontStyle: "italic" },
    ],
  },
  "Monaspace Argon": {
    family: "MonaspaceArgon",
    files: [
      { file: "monaspace-argon-400-normal.otf", fontWeight: "normal", fontStyle: "normal" },
      { file: "monaspace-argon-400-italic.otf", fontWeight: "normal", fontStyle: "italic" },
      { file: "monaspace-argon-700-normal.otf", fontWeight: "bold", fontStyle: "normal" },
      { file: "monaspace-argon-700-italic.otf", fontWeight: "bold", fontStyle: "italic" },
    ],
  },
  "Monaspace Krypton": {
    family: "MonaspaceKrypton",
    files: [
      { file: "monaspace-krypton-400-normal.otf", fontWeight: "normal", fontStyle: "normal" },
      { file: "monaspace-krypton-400-italic.otf", fontWeight: "normal", fontStyle: "italic" },
      { file: "monaspace-krypton-700-normal.otf", fontWeight: "bold", fontStyle: "normal" },
      { file: "monaspace-krypton-700-italic.otf", fontWeight: "bold", fontStyle: "italic" },
    ],
  },
  "Monaspace Neon": {
    family: "MonaspaceNeon",
    files: [
      { file: "monaspace-neon-400-normal.otf", fontWeight: "normal", fontStyle: "normal" },
      { file: "monaspace-neon-400-italic.otf", fontWeight: "normal", fontStyle: "italic" },
      { file: "monaspace-neon-700-normal.otf", fontWeight: "bold", fontStyle: "normal" },
      { file: "monaspace-neon-700-italic.otf", fontWeight: "bold", fontStyle: "italic" },
    ],
  },
  "Monaspace Radon": {
    family: "MonaspaceRadon",
    files: [
      { file: "monaspace-radon-400-normal.otf", fontWeight: "normal", fontStyle: "normal" },
      { file: "monaspace-radon-400-italic.otf", fontWeight: "normal", fontStyle: "italic" },
      { file: "monaspace-radon-700-normal.otf", fontWeight: "bold", fontStyle: "normal" },
      { file: "monaspace-radon-700-italic.otf", fontWeight: "bold", fontStyle: "italic" },
    ],
  },
  "Monaspace Xenon": {
    family: "MonaspaceXenon",
    files: [
      { file: "monaspace-xenon-400-normal.otf", fontWeight: "normal", fontStyle: "normal" },
      { file: "monaspace-xenon-400-italic.otf", fontWeight: "normal", fontStyle: "italic" },
      { file: "monaspace-xenon-700-normal.otf", fontWeight: "bold", fontStyle: "normal" },
      { file: "monaspace-xenon-700-italic.otf", fontWeight: "bold", fontStyle: "italic" },
    ],
  },
};

const registeredFonts = new Set<string>();

const preloadedFontSources = new Map<string, string>();

const BUILTIN_FONT_FAMILY_MAP: Record<FontName, string> = {
  "IBM Plex Mono": "Courier",
  "IBM Plex Sans Variable": "Helvetica",
  "IBM Plex Serif": "Times-Roman",
  "Monaspace Argon": "Courier",
  "Monaspace Krypton": "Courier",
  "Monaspace Neon": "Courier",
  "Monaspace Radon": "Courier",
  "Monaspace Xenon": "Courier",
};

const getBuiltinFamily = (fontName: FontName): string => BUILTIN_FONT_FAMILY_MAP[fontName] ?? "Helvetica";

const getCustomConfig = (fontName: FontName): FontConfig => {
  if (!(fontName in FONT_PATHS)) {
    return FONT_PATHS["IBM Plex Mono"];
  }
  return FONT_PATHS[fontName];
};

const toHex = (value: number): string => value.toString(16).padStart(2, "0");

const getFormatFromFilename = (filename: string): FontPayloadFormat | null => {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".woff")) {
    return "woff";
  }
  if (lower.endsWith(".ttf")) {
    return "ttf";
  }
  if (lower.endsWith(".otf")) {
    return "otf";
  }
  return null;
};

const detectFormatFromHeader = (bytes: Uint8Array): FontPayloadFormat | null => {
  if (bytes.length < 4) {
    return null;
  }
  if (bytes[0] === 0x77 && bytes[1] === 0x4f && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return "woff";
  }
  if (bytes[0] === 0x00 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00) {
    return "ttf";
  }
  if (bytes[0] === 0x4f && bytes[1] === 0x54 && bytes[2] === 0x54 && bytes[3] === 0x4f) {
    return "otf";
  }
  return null;
};

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCodePoint(...chunk);
  }
  return btoa(binary);
};

const preloadFontSource = async (source: PdfFontSourceDescriptor): Promise<string> => {
  const cached = preloadedFontSources.get(source.src);
  if (cached) {
    return cached;
  }

  let response: Response;
  try {
    response = await fetch(source.src, { method: "GET" });
  } catch (error) {
    throw new PdfFontSourceFetchError(source, `Failed to fetch font source: ${source.src}`, { cause: error });
  }

  const contentType = response.headers.get("content-type") ?? undefined;
  if (!response.ok) {
    throw new PdfFontSourceFetchError(
      source,
      `Font source request failed (${response.status} ${response.statusText}) for ${source.src}`,
      { status: response.status, statusText: response.statusText, contentType },
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const detectedFormat = detectFormatFromHeader(bytes);
  const expectedFormat = getFormatFromFilename(source.file);
  if (!detectedFormat || (expectedFormat && detectedFormat !== expectedFormat)) {
    const signature = bytes.length >= 4
      ? `${toHex(bytes[0])} ${toHex(bytes[1])} ${toHex(bytes[2])} ${toHex(bytes[3])}`
      : "too-short";
    throw new PdfFontSourceFetchError(
      source,
      `Font payload format mismatch (${source.src}, expected: ${expectedFormat ?? "unknown"}, detected: ${
        detectedFormat ?? "unknown"
      }, signature: ${signature})`,
      { status: response.status, statusText: response.statusText, contentType },
    );
  }

  const mimeType = detectedFormat === "woff" ? "font/woff" : detectedFormat === "ttf" ? "font/ttf" : "font/otf";
  const dataUrl = `data:${mimeType};base64,${toBase64(bytes)}`;
  preloadedFontSources.set(source.src, dataUrl);
  return dataUrl;
};

export function describePdfFont(fontName: FontName, strategy: FontStrategy = "custom"): PdfFontResolution {
  if (strategy === "builtin") {
    return { fontName, strategy, family: getBuiltinFamily(fontName), sources: [] };
  }

  const config = getCustomConfig(fontName);
  return {
    fontName,
    strategy,
    family: config.family,
    sources: config.files.map((file) => ({
      file: file.file,
      src: staticFont(file.file),
      fontWeight: file.fontWeight,
      fontStyle: file.fontStyle,
    })),
  };
}

export async function ensurePdfFontRegistered(fontName: FontName, strategy: FontStrategy = "custom"): Promise<string> {
  const resolution = describePdfFont(fontName, strategy);
  if (strategy === "builtin") {
    return resolution.family;
  }

  if (!registeredFonts.has(resolution.family)) {
    try {
      const resolvedSources = await Promise.all(
        resolution.sources.map(async (source) => ({ ...source, resolvedSrc: await preloadFontSource(source) })),
      );

      Font.register({
        family: resolution.family,
        fonts: resolvedSources.map((source) => ({
          src: source.resolvedSrc,
          fontWeight: source.fontWeight,
          fontStyle: source.fontStyle,
        })),
      });

      for (const source of resolvedSources) {
        await Font.load({
          fontFamily: resolution.family,
          fontWeight: source.fontWeight ?? "normal",
          fontStyle: source.fontStyle ?? "normal",
        });
      }

      registeredFonts.add(resolution.family);
    } catch (error) {
      throw new PdfFontRegistrationError(resolution, error);
    }
  }

  return resolution.family;
}

export const getPdfFontFamily = (f: FontName, s: FontStrategy = "custom"): string => describePdfFont(f, s).family;

export async function registerAllPdfFonts(): Promise<void> {
  for (const fontName in FONT_PATHS) {
    await ensurePdfFontRegistered(fontName as FontName);
  }
}

export const getCodeFontFamily = (s: FontStrategy = "custom"): string => getPdfFontFamily("IBM Plex Mono", s);
