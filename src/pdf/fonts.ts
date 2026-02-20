import { Font } from "@react-pdf/renderer";
import { FontName } from "./types";

type FontWeight =
  | number
  | "thin"
  | "ultralight"
  | "light"
  | "normal"
  | "medium"
  | "semibold"
  | "bold"
  | "ultrabold"
  | "heavy";

type FontSource = { src: string; fontWeight?: FontWeight };

const FONT_PATHS: Record<FontName, { family: string; fonts: FontSource[] }> = {
  "IBM Plex Mono": {
    family: "IBMPlexMono",
    fonts: [{ src: "asset:///fonts/ibm-plex-mono/ibm-plex-mono-latin-400-normal.woff2", fontWeight: "normal" }, {
      src: "asset:///fonts/ibm-plex-mono/ibm-plex-mono-latin-700-normal.woff2",
      fontWeight: "bold",
    }],
  },
  "IBM Plex Sans Variable": {
    family: "IBMPlexSans",
    fonts: [{ src: "asset:///fonts/ibm-plex-sans/ibm-plex-sans-latin-wght-normal.woff2", fontWeight: "normal" }],
  },
  "IBM Plex Serif": {
    family: "IBMPlexSerif",
    fonts: [{ src: "asset:///fonts/ibm-plex-serif/ibm-plex-serif-latin-400-normal.woff2", fontWeight: "normal" }, {
      src: "asset:///fonts/ibm-plex-serif/ibm-plex-serif-latin-700-normal.woff2",
      fontWeight: "bold",
    }],
  },
  "Monaspace Argon": {
    family: "MonaspaceArgon",
    fonts: [{ src: "asset:///fonts/monaspace-argon/monaspace-argon-latin-400-normal.woff2", fontWeight: "normal" }],
  },
  "Monaspace Krypton": {
    family: "MonaspaceKrypton",
    fonts: [{ src: "asset:///fonts/monaspace-krypton/monaspace-krypton-latin-400-normal.woff2", fontWeight: "normal" }],
  },
  "Monaspace Neon": {
    family: "MonaspaceNeon",
    fonts: [{ src: "asset:///fonts/monaspace-neon/monaspace-neon-latin-400-normal.woff2", fontWeight: "normal" }],
  },
  "Monaspace Radon": {
    family: "MonaspaceRadon",
    fonts: [{ src: "asset:///fonts/monaspace-radon/monaspace-radon-latin-400-normal.woff2", fontWeight: "normal" }],
  },
  "Monaspace Xenon": {
    family: "MonaspaceXenon",
    fonts: [{ src: "asset:///fonts/monaspace-xenon/monaspace-xenon-latin-400-normal.woff2", fontWeight: "normal" }],
  },
};

const registeredFonts = new Set<string>();

export function registerPdfFont(fontName: FontName): string {
  const config = FONT_PATHS[fontName];

  if (!config) {
    throw new Error(`Unknown font: ${fontName}. Available fonts: ${Object.keys(FONT_PATHS).join(", ")}`);
  }

  if (!registeredFonts.has(config.family)) {
    Font.register({ family: config.family, fonts: config.fonts });
    registeredFonts.add(config.family);
  }

  return config.family;
}

export function getPdfFontFamily(fontName: FontName): string {
  if (!(fontName in FONT_PATHS)) {
    return registerPdfFont("IBM Plex Mono");
  }

  return registerPdfFont(fontName);
}

export function registerAllPdfFonts(): void {
  for (const [fontName] of Object.entries(FONT_PATHS)) {
    registerPdfFont(fontName as FontName);
  }
}

export const getCodeFontFamily = (): string => getPdfFontFamily("IBM Plex Mono");
