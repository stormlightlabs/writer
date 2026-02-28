import type { EditorFontFamily } from "$types";
import { type ChangeEvent } from "react";

const EDITOR_FONT_OPTIONS: Array<{ label: string; value: EditorFontFamily }> = [
  { label: "IBM Plex Mono", value: "IBM Plex Mono" },
  { label: "IBM Plex Sans Variable", value: "IBM Plex Sans Variable" },
  { label: "IBM Plex Serif", value: "IBM Plex Serif" },
  { label: "Monaspace Argon", value: "Monaspace Argon" },
  { label: "Monaspace Krypton", value: "Monaspace Krypton" },
  { label: "Monaspace Neon", value: "Monaspace Neon" },
  { label: "Monaspace Radon", value: "Monaspace Radon" },
  { label: "Monaspace Xenon", value: "Monaspace Xenon" },
];

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
      className="w-full h-9 px-2.5 rounded border border-border-subtle bg-field-01 text-text-primary text-sm">
      {EDITOR_FONT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
