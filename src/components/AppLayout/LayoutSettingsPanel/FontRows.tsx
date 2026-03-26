import type { EditorFontFamily, RenderedFontFamily } from "$types";
import { type ChangeEvent } from "react";

const BASE_FONT_OPTIONS = [
  { label: "IBM Plex Mono", value: "IBM Plex Mono" },
  { label: "IBM Plex Sans Variable", value: "IBM Plex Sans Variable" },
  { label: "IBM Plex Serif", value: "IBM Plex Serif" },
  { label: "Maple Mono (CJK)", value: "Maple Mono" },
  { label: "Monaspace Argon", value: "Monaspace Argon" },
  { label: "Monaspace Krypton", value: "Monaspace Krypton" },
  { label: "Monaspace Neon", value: "Monaspace Neon" },
  { label: "Monaspace Radon", value: "Monaspace Radon" },
  { label: "Monaspace Xenon", value: "Monaspace Xenon" },
] as const satisfies ReadonlyArray<{ label: string; value: EditorFontFamily }>;

const EDITOR_FONT_OPTIONS: Array<{ label: string; value: EditorFontFamily }> = [...BASE_FONT_OPTIONS];

const RENDERED_FONT_OPTIONS: Array<{ label: string; value: RenderedFontFamily }> = [...BASE_FONT_OPTIONS, {
  label: "Noto Sans CJK SC",
  value: "Noto Sans CJK SC",
}];

type FontFamilyRowProps = { value: EditorFontFamily; setter: (event: ChangeEvent<HTMLSelectElement>) => void };

export const FontFamilyRow = ({ value, setter }: FontFamilyRowProps) => (
  <div className="py-2.5">
    <label className="m-0 text-[0.8125rem] text-text-primary block mb-1.5" htmlFor="editor-font-family">
      Editor Font
    </label>
    <select
      id="editor-font-family"
      value={value}
      onChange={setter}
      className="w-full h-9 px-2.5 rounded border border-stroke-subtle bg-field-01 text-text-primary text-sm">
      {EDITOR_FONT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>
);

type RenderedFontFamilyRowProps = {
  value: RenderedFontFamily;
  setter: (event: ChangeEvent<HTMLSelectElement>) => void;
};

export const RenderedFontFamilyRow = ({ value, setter }: RenderedFontFamilyRowProps) => (
  <div className="py-2.5">
    <label className="m-0 text-[0.8125rem] text-text-primary block mb-1.5" htmlFor="rendered-font-family">
      Rendered PDF Font
    </label>
    <select
      id="rendered-font-family"
      value={value}
      onChange={setter}
      className="w-full h-9 px-2.5 rounded border border-stroke-subtle bg-field-01 text-text-primary text-sm">
      {RENDERED_FONT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>
);

export const FontSizeRow = (
  { value, setter }: { value: number; setter: (event: ChangeEvent<HTMLInputElement>) => void },
) => (
  <div className="py-2.5">
    <div className="flex items-center justify-between gap-4 mb-1.5">
      <label className="m-0 text-[0.8125rem] text-text-primary" htmlFor="editor-font-size">Editor Size</label>
      <span className="text-xs text-text-secondary">{value}px</span>
    </div>
    <input
      id="editor-font-size"
      type="range"
      min={12}
      max={24}
      step={1}
      value={value}
      onChange={setter}
      className="w-full accent-accent-cyan cursor-pointer" />
  </div>
);
