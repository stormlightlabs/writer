import { Button } from "$components/Button";
import { Sheet } from "$components/Sheet";
import type { useAtProtoController } from "$hooks/controllers/useAtProtoController";
import { FileTypeIcon, Tangled } from "$icons";
import type { ChangeEventHandler } from "react";
import { useCallback, useMemo } from "react";

type Controller = ReturnType<typeof useAtProtoController>;

type ImportSheetProps = { controller: Controller; isOpen: boolean; onClose: () => void; onBack?: () => void };

function ImportSheetTitle() {
  return (
    <div className="flex items-center gap-2">
      <Tangled className="h-5 w-5 shrink-0" />
      <h2 className="m-0 text-base font-semibold text-text-primary">Import from Tangled</h2>
    </div>
  );
}

function ImportSheetHeader({ onBack }: { onBack?: () => void }) {
  return (
    <header className="border-b border-stroke-subtle px-5 py-4 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <ImportSheetTitle />
          <p className="m-0 mt-1 text-sm text-text-secondary">
            Browse any public Tangled handle, preview a string, and save it into one of your locations.
          </p>
        </div>
        {onBack && <Button variant="outline" size="sm" onClick={onBack}>Back</Button>}
      </div>
    </header>
  );
}

function RecordRow(
  { record, isSelected, onSelectTid }: {
    record: Controller["importState"]["records"][number];
    isSelected: boolean;
    onSelectTid: (tid: string) => void;
  },
) {
  const handleClick = useCallback(() => {
    onSelectTid(record.tid);
  }, [onSelectTid, record.tid]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-full items-start gap-3 border-b border-stroke-subtle/70 px-3 py-3 text-left transition ${
        isSelected ? "bg-layer-03/60" : "hover:bg-layer-02/50"
      }`}>
      <FileTypeIcon filename={record.filename} className="mt-0.5 shrink-0 text-base text-icon-secondary" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text-primary">{record.filename}</div>
        <div className="mt-1 text-xs text-text-secondary">{record.description || "No description"}</div>
        <div className="mt-1 text-[11px] text-text-secondary">{record.createdAt}</div>
      </div>
    </button>
  );
}

function BrowseHandleForm({ controller }: { controller: Controller }) {
  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    controller.setImportHandle(event.target.value);
  }, [controller]);

  return (
    <div className="rounded-lg border border-stroke-subtle bg-layer-02/25 p-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text-primary">Handle or DID</span>
        <div className="flex items-center gap-2">
          <input
            value={controller.importState.handle}
            onChange={handleChange}
            placeholder={controller.session?.handle ?? "alice.bsky.social"}
            className="w-full rounded-lg border border-stroke-subtle bg-field-01 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-stroke-strong" />
          <Button
            variant="primaryBlue"
            size="sm"
            disabled={controller.importState.isListing || !controller.importState.handle.trim()}
            onClick={controller.handleBrowseStrings}>
            {controller.importState.isListing ? "Loading..." : "Browse"}
          </Button>
        </div>
      </label>
      <p className="m-0 mt-2 text-xs text-text-secondary">
        Public strings can be imported without signing in. The browser defaults to your connected handle when available.
      </p>
      {/* TODO: Add GitHub Gist import alongside Tangled browsing. */}
    </div>
  );
}

function RecordsPanel({ controller }: { controller: Controller }) {
  const handleSelectTid = useCallback((tid: string) => {
    controller.handleSelectString(tid);
  }, [controller]);

  return (
    <div className="min-h-0 rounded-lg border border-stroke-subtle bg-layer-02/15">
      <div className="border-b border-stroke-subtle px-3 py-2 text-xs uppercase tracking-[0.14em] text-text-secondary">
        {controller.importState.browseHandle ? `Strings for ${controller.importState.browseHandle}` : "Strings"}
      </div>
      <div className="min-h-0 overflow-y-auto">
        {controller.importState.records.length === 0
          ? (
            <div className="px-3 py-6 text-sm text-text-secondary">
              {controller.importState.isListing
                ? "Loading Tangled strings..."
                : "No strings loaded yet. Enter a handle and browse."}
            </div>
          )
          : controller.importState.records.map((record) => (
            <RecordRow
              key={record.tid}
              record={record}
              isSelected={record.tid === controller.importState.selectedTid}
              onSelectTid={handleSelectTid} />
          ))}
      </div>
    </div>
  );
}

type LocationSelectorProps = {
  handleChange: ChangeEventHandler<HTMLSelectElement>;
  hasLocations: boolean;
  locations: { id: number; name: string }[];
  importState: Controller["importState"];
};

function LocationSelector({ importState, handleChange, hasLocations, locations }: LocationSelectorProps) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-text-primary">Location</span>
      <select
        value={importState.destinationLocationId ?? ""}
        disabled={!hasLocations}
        onChange={handleChange}
        className="w-full rounded-lg border border-stroke-subtle bg-field-01 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-stroke-strong">
        {!hasLocations && <option value="">Add a location first</option>}
        {hasLocations && <option value="">Choose a location</option>}
        {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
      </select>
    </label>
  );
}

function ImportDestinationForm({ controller }: { controller: Controller }) {
  const handleLocationChange = useCallback<ChangeEventHandler<HTMLSelectElement>>((event) => {
    controller.setDestinationLocationId(Number(event.target.value) || null);
  }, [controller]);

  const handlePathChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    controller.setDestinationRelPath(event.target.value);
  }, [controller]);

  const handleImport = useCallback(() => {
    void controller.handleImport();
  }, [controller]);

  const importDisabled = useMemo(
    () =>
      controller.importState.isSaving
      || !controller.importState.selectedRecord
      || !controller.importState.destinationLocationId
      || !controller.importState.destinationRelPath.trim()
      || !controller.hasLocations,
    [
      controller.importState.isSaving,
      controller.importState.selectedRecord,
      controller.importState.destinationLocationId,
      controller.importState.destinationRelPath,
      controller.hasLocations,
    ],
  );

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-stroke-subtle bg-layer-02/20 p-3">
      <div className="flex">
        <LocationSelector
          handleChange={handleLocationChange}
          importState={controller.importState}
          hasLocations={controller.hasLocations}
          locations={controller.locations} />
        <label className="grid gap-1.5 col-span-2 flex-1">
          <span className="text-sm font-medium text-text-primary">Destination path</span>
          <input
            value={controller.importState.destinationRelPath}
            onChange={handlePathChange}
            placeholder="notes/imported.md"
            className="w-full rounded-lg border border-stroke-subtle bg-field-01 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-stroke-strong" />
        </label>
      </div>

      <div className="flex gap-2">
        <p className="m-0 text-xs text-text-secondary">
          Non-Markdown strings are imported as fenced code blocks so the resulting document stays readable in Writer.
        </p>
        <div className="flex justify-end">
          <Button variant="primaryBlue" size="sm" disabled={importDisabled} onClick={handleImport}>
            {controller.importState.isSaving ? "Importing..." : "Import"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewPanel({ controller }: { controller: Controller }) {
  return (
    <div className="min-h-0 overflow-hidden rounded-lg border border-stroke-subtle bg-[#0f1720]">
      <div className="border-b border-white/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-white/65">
        Preview
      </div>
      <pre className="min-h-0 overflow-auto px-3 py-3 text-xs leading-5 text-white/90">
        {controller.importState.isFetching
          ? "Loading string preview..."
          : controller.importState.previewText || "Select a string to preview the imported document body."}
      </pre>
    </div>
  );
}

function SelectedRecordSummary({ controller }: { controller: Controller }) {
  const selectedFilename = useMemo(() => controller.importState.selectedRecord?.filename ?? "Nothing selected", [
    controller.importState.selectedRecord,
  ]);

  return (
    <div className="rounded-lg border border-stroke-subtle bg-layer-02/25 p-3">
      <div className="text-sm font-medium text-text-primary">{selectedFilename}</div>
      <p className="m-0 mt-1 text-xs text-text-secondary">
        {controller.importState.selectedRecord?.description || "Select a string to inspect its contents before import."}
      </p>
    </div>
  );
}

function ImportSheetBody({ controller }: { controller: Controller }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid min-h-full gap-4 px-5 py-4 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] sm:px-6">
        <section className="flex min-h-112 flex-col gap-3 overflow-hidden">
          <BrowseHandleForm controller={controller} />
          <RecordsPanel controller={controller} />
        </section>
        <section className="flex min-h-112 flex-col gap-3 overflow-hidden">
          <SelectedRecordSummary controller={controller} />
          <ImportDestinationForm controller={controller} />
          <PreviewPanel controller={controller} />
        </section>
      </div>
    </div>
  );
}

export function ImportSheet({ controller, isOpen, onClose, onBack }: ImportSheetProps) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      position="r"
      size="full"
      ariaLabel="Import from Tangled"
      className="right-4 top-8 bottom-4 w-[min(96vw,1080px)] rounded-xl border shadow-xl"
      backdropClassName="bg-black/30">
      <section className="flex h-full min-h-0 flex-col overflow-hidden bg-layer-01">
        <ImportSheetHeader onBack={onBack} />
        <ImportSheetBody controller={controller} />
      </section>
    </Sheet>
  );
}
