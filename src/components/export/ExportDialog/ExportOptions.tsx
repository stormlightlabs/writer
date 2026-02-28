import { ORIENTATIONS, PAGE_SIZES } from "$pdf/constants";
import { MarginSide, Orientation, PageSize } from "$pdf/types";
import { usePdfDialogUiState } from "$state/selectors";
import { type ReactNode, useCallback } from "react";

type OptionSectionProps = { title: string; description: string; children: ReactNode };

const FIELD_CLASS_NAME =
  "w-full rounded-md border border-border-subtle bg-layer-01 px-3 py-2 text-sm text-text-primary transition-colors focus:border-accent-cyan focus:outline-none";

const OptionSection = ({ title, description, children }: OptionSectionProps) => (
  <section className="rounded-lg border border-border-subtle bg-layer-02/35 p-3.5">
    <header className="mb-3">
      <h3 className="m-0 text-sm font-medium text-text-primary">{title}</h3>
      <p className="m-0 mt-0.5 text-xs text-text-secondary">{description}</p>
    </header>
    {children}
  </section>
);

function PdfExportDialogPageSize() {
  const { setPageSize, options } = usePdfDialogUiState();

  const handlePageSizeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(event.target.value as PageSize);
  }, [setPageSize]);

  return (
    <OptionSection title="Page Size" description="Choose the final print dimensions.">
      <label htmlFor="export-page-size" className="sr-only">Page Size</label>
      <select
        id="export-page-size"
        value={typeof options.pageSize === "string" ? options.pageSize : "A4"}
        onChange={handlePageSizeChange}
        className={FIELD_CLASS_NAME}>
        {PAGE_SIZES.map((size) => <option key={size.value} value={size.value}>{size.label}</option>)}
      </select>
    </OptionSection>
  );
}

function PdfExportDialogOrientation() {
  const { setOrientation, options } = usePdfDialogUiState();

  const handleOrientationChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setOrientation(event.target.value as Orientation);
  }, [setOrientation]);

  return (
    <OptionSection title="Orientation" description="Switch between portrait and landscape layouts.">
      <label htmlFor="export-orientation" className="sr-only">Orientation</label>
      <select
        id="export-orientation"
        value={options.orientation}
        onChange={handleOrientationChange}
        className={FIELD_CLASS_NAME}>
        {ORIENTATIONS.map((orientation) => (
          <option key={orientation.value} value={orientation.value}>{orientation.label}</option>
        ))}
      </select>
    </OptionSection>
  );
}

function PdfExportDialogFontSize() {
  const { setFontSize, options } = usePdfDialogUiState();

  const handleFontSizeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setFontSize(parseInt(event.target.value, 10));
  }, [setFontSize]);

  return (
    <OptionSection title="Typography" description="Adjust default text size for PDF output.">
      <div className="mb-2 flex items-center justify-between text-xs text-text-secondary">
        <span>Font Size</span>
        <span className="rounded bg-layer-01 px-2 py-0.5 text-text-primary">{options.fontSize}px</span>
      </div>
      <label htmlFor="export-font-size" className="sr-only">Font Size</label>
      <input
        id="export-font-size"
        type="range"
        min="8"
        max="16"
        step="1"
        value={options.fontSize}
        onChange={handleFontSizeChange}
        className="w-full accent-accent-cyan" />
    </OptionSection>
  );
}

function PdfMarginField({ side, value }: { side: MarginSide; value: number }) {
  const { setMargin } = usePdfDialogUiState();

  const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setMargin(side, parseInt(event.target.value || "0", 10));
  }, [setMargin, side]);

  return (
    <label className="text-xs text-text-secondary" htmlFor={`export-margin-${side}`}>
      <span className="mb-1 block capitalize">{side}</span>
      <input
        id={`export-margin-${side}`}
        type="number"
        min="0"
        max="200"
        value={value}
        onChange={onChange}
        className={FIELD_CLASS_NAME} />
    </label>
  );
}

function PdfExportDialogMargins() {
  const { options } = usePdfDialogUiState();

  return (
    <OptionSection title="Margins" description="Set page spacing in pixels.">
      <div className="grid grid-cols-2 gap-2">
        <PdfMarginField side="top" value={options.margins.top} />
        <PdfMarginField side="right" value={options.margins.right} />
        <PdfMarginField side="bottom" value={options.margins.bottom} />
        <PdfMarginField side="left" value={options.margins.left} />
      </div>
    </OptionSection>
  );
}

function PdfExportDialogHeaderFooter() {
  const { setIncludeHeader, setIncludeFooter, options } = usePdfDialogUiState();

  const onHeaderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setIncludeHeader(event.target.checked);
  }, [setIncludeHeader]);

  const onFooterChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setIncludeFooter(event.target.checked);
  }, [setIncludeFooter]);

  return (
    <OptionSection title="Header & Footer" description="Toggle document chrome around main content.">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-layer-01 px-3 py-2 text-sm text-text-primary">
          Include Header
          <input type="checkbox" checked={Boolean(options.includeHeader)} onChange={onHeaderChange} />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-layer-01 px-3 py-2 text-sm text-text-primary">
          Include Footer
          <input type="checkbox" checked={Boolean(options.includeFooter)} onChange={onFooterChange} />
        </label>
      </div>
    </OptionSection>
  );
}

export const PdfExportDialogOptions = () => (
  <div className="min-h-0 flex-1 overflow-y-auto pr-1">
    <div className="space-y-3">
      <PdfExportDialogPageSize />
      <PdfExportDialogOrientation />
      <PdfExportDialogFontSize />
      <PdfExportDialogMargins />
      <PdfExportDialogHeaderFooter />
    </div>
  </div>
);
