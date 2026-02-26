import { ORIENTATIONS, PAGE_SIZES } from "$pdf/constants";
import { MarginSide, type PdfExportOptions } from "$pdf/types";
import { usePdfDialogUiState } from "$state/selectors";
import { useCallback } from "react";

const PdfExportDialogPageSize = ({ options }: { options: PdfExportOptions }) => {
  const { setPageSize } = usePdfDialogUiState();

  const handlePageSizeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(event.target.value as PdfExportOptions["pageSize"]);
  }, [setPageSize]);

  return (
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
};

const PdfExportDialogOrientation = ({ options }: { options: PdfExportOptions }) => {
  const { setOrientation } = usePdfDialogUiState();

  const handleOrientationChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setOrientation(event.target.value as PdfExportOptions["orientation"]);
  }, [setOrientation]);

  return (
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
};

const PdfExportDialogFontSize = ({ options }: { options: PdfExportOptions }) => {
  const { setFontSize } = usePdfDialogUiState();

  const handleFontSizeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFontSize(parseInt(event.target.value, 10));
  }, [setFontSize]);

  return (
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
};

const PdfMarginField = ({ side, value }: { side: MarginSide; value: number }) => {
  const { setMargin } = usePdfDialogUiState();

  const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setMargin(side, parseInt(event.target.value || "0", 10));
  }, [setMargin, side]);

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

const PdfExportDialogMargins = ({ options }: { options: PdfExportOptions }) => (
  <div>
    <p className="block text-sm font-medium text-text-primary mb-2">Margins (px)</p>
    <div className="grid grid-cols-2 gap-2">
      <PdfMarginField side="top" value={options.margins.top} />
      <PdfMarginField side="right" value={options.margins.right} />
      <PdfMarginField side="bottom" value={options.margins.bottom} />
      <PdfMarginField side="left" value={options.margins.left} />
    </div>
  </div>
);

const PdfExportDialogHeaderFooter = ({ options }: { options: PdfExportOptions }) => {
  const { setIncludeHeader, setIncludeFooter } = usePdfDialogUiState();

  const onHeaderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setIncludeHeader(event.target.checked);
  }, [setIncludeHeader]);

  const onFooterChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setIncludeFooter(event.target.checked);
  }, [setIncludeFooter]);

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

export const PdfExportDialogOptions = () => {
  const { options } = usePdfDialogUiState();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <div className="space-y-4">
        <PdfExportDialogPageSize options={options} />
        <PdfExportDialogOrientation options={options} />
        <PdfExportDialogFontSize options={options} />
        <PdfExportDialogMargins options={options} />
        <PdfExportDialogHeaderFooter options={options} />
      </div>
    </div>
  );
};
