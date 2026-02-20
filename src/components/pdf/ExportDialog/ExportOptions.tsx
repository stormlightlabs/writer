import { ORIENTATIONS, PAGE_SIZES } from "$pdf/constants";
import { MarginSide, PdfExportOptions } from "$pdf/types";
import { useCallback } from "react";

const PdfExportDialogPageSize = (
  { options, handlePageSizeChange }: {
    options: PdfExportOptions;
    handlePageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  },
) => (
  <div>
    <label className="block text-sm font-medium text-text-primary mb-1">Page Size</label>
    <select
      value={typeof options.pageSize === "string" ? options.pageSize : "A4"}
      onChange={handlePageSizeChange}
      className="w-full px-3 py-2 bg-layer-02 border border-border-subtle rounded text-text-primary text-sm focus:outline-none focus:border-accent-cyan">
      {PAGE_SIZES.map((size) => <option key={size.value} value={size.value}>{size.label}</option>)}
    </select>
  </div>
);

const PdfExportDialogOrientation = (
  { options, handleOrientationChange }: {
    options: PdfExportOptions;
    handleOrientationChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  },
) => (
  <div>
    <label className="block text-sm font-medium text-text-primary mb-1">Orientation</label>
    <select
      value={options.orientation}
      onChange={handleOrientationChange}
      className="w-full px-3 py-2 bg-layer-02 border border-border-subtle rounded text-text-primary text-sm focus:outline-none focus:border-accent-cyan">
      {ORIENTATIONS.map((orientation) => (
        <option key={orientation.value} value={orientation.value}>{orientation.label}</option>
      ))}
    </select>
  </div>
);

const PdfExportDialogFontSize = (
  { options, handleFontSizeChange }: {
    options: PdfExportOptions;
    handleFontSizeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  },
) => (
  <div>
    <label className="block text-sm font-medium text-text-primary mb-1">Font Size: {options.fontSize}px</label>
    <input
      type="range"
      min="8"
      max="16"
      step="1"
      value={options.fontSize}
      onChange={handleFontSizeChange}
      className="w-full" />
  </div>
);

const PdfExportDialogMargins = (
  { options, handleMarginChange }: {
    options: PdfExportOptions;
    handleMarginChange: (side: MarginSide, value: number) => void;
  },
) => (
  <div>
    <p className="block text-sm font-medium text-text-primary mb-2">Margins (px)</p>
    <div className="grid grid-cols-2 gap-2">
      <PdfMarginField side="top" value={options.margins.top} handleMarginChange={handleMarginChange} />
      <PdfMarginField side="right" value={options.margins.right} handleMarginChange={handleMarginChange} />
      <PdfMarginField side="bottom" value={options.margins.bottom} handleMarginChange={handleMarginChange} />
      <PdfMarginField side="left" value={options.margins.left} handleMarginChange={handleMarginChange} />
    </div>
  </div>
);

const PdfExportDialogHeaderFooter = (
  { options, handleIncludeHeaderChange, handleIncludeFooterChange }: {
    options: PdfExportOptions;
    handleIncludeHeaderChange: (value: boolean) => void;
    handleIncludeFooterChange: (value: boolean) => void;
  },
) => {
  const onHeaderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleIncludeHeaderChange(event.target.checked);
  }, [handleIncludeHeaderChange]);

  const onFooterChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleIncludeFooterChange(event.target.checked);
  }, [handleIncludeFooterChange]);

  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input type="checkbox" checked={Boolean(options.includeHeader)} onChange={onHeaderChange} />
        Include Header
      </label>
      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input type="checkbox" checked={Boolean(options.includeFooter)} onChange={onFooterChange} />
        Include Footer
      </label>
    </div>
  );
};

const PdfMarginField = (
  { side, value, handleMarginChange }: {
    side: MarginSide;
    value: number;
    handleMarginChange: (side: MarginSide, value: number) => void;
  },
) => {
  const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleMarginChange(side, parseInt(event.target.value || "0", 10));
  }, [handleMarginChange, side]);

  return (
    <label className="text-xs text-text-secondary">
      <span className="block capitalize mb-1">{side}</span>
      <input
        type="number"
        min="0"
        max="200"
        value={value}
        onChange={onChange}
        className="w-full px-2 py-1 bg-layer-02 border border-border-subtle rounded text-text-primary text-sm" />
    </label>
  );
};

export const PdfExportDialogOptions = (
  {
    options,
    handlePageSizeChange,
    handleOrientationChange,
    handleFontSizeChange,
    handleMarginChange,
    handleIncludeHeaderChange,
    handleIncludeFooterChange,
  }: {
    options: PdfExportOptions;
    handlePageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    handleOrientationChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    handleFontSizeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleMarginChange: (side: "top" | "right" | "bottom" | "left", value: number) => void;
    handleIncludeHeaderChange: (value: boolean) => void;
    handleIncludeFooterChange: (value: boolean) => void;
  },
) => (
  <div className="space-y-4">
    <PdfExportDialogPageSize options={options} handlePageSizeChange={handlePageSizeChange} />
    <PdfExportDialogOrientation options={options} handleOrientationChange={handleOrientationChange} />
    <PdfExportDialogFontSize options={options} handleFontSizeChange={handleFontSizeChange} />
    <PdfExportDialogMargins options={options} handleMarginChange={handleMarginChange} />
    <PdfExportDialogHeaderFooter
      options={options}
      handleIncludeHeaderChange={handleIncludeHeaderChange}
      handleIncludeFooterChange={handleIncludeFooterChange} />
  </div>
);
