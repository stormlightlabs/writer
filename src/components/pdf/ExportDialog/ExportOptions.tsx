import { ORIENTATIONS, PAGE_SIZES } from "$pdf/constants";
import { PdfExportOptions } from "$pdf/types";

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

export const PdfExportDialogOptions = (
  { options, handlePageSizeChange, handleOrientationChange, handleFontSizeChange }: {
    options: PdfExportOptions;
    handlePageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    handleOrientationChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    handleFontSizeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  },
) => (
  <div className="space-y-4">
    <PdfExportDialogPageSize options={options} handlePageSizeChange={handlePageSizeChange} />
    <PdfExportDialogOrientation options={options} handleOrientationChange={handleOrientationChange} />
    <PdfExportDialogFontSize options={options} handleFontSizeChange={handleFontSizeChange} />
  </div>
);
