import { Button } from "$components/Button";
import { Sheet } from "$components/Sheet";
import type { useAtProtoController } from "$hooks/controllers/useAtProtoController";
import { FileTypeIcon, GithubIcon, Tangled } from "$icons";
import type { ChangeEventHandler } from "react";
import { useCallback, useMemo } from "react";

type Controller = ReturnType<typeof useAtProtoController>;

type ImportSheetProps = { controller: Controller; isOpen: boolean; onClose: () => void; onBack?: () => void };

function ImportSheetTitle({ source }: { source: Controller["importState"]["source"] }) {
  const isGithub = source === "github";
  return (
    <div className="flex items-center gap-2">
      {isGithub ? <GithubIcon size="md" /> : <Tangled className="h-5 w-5 shrink-0" />}
      <h2 className="m-0 text-base font-semibold text-text-primary">
        {isGithub ? "Import from GitHub Gists" : "Import from Tangled"}
      </h2>
    </div>
  );
}

function ImportSheetHeader({ controller, onBack }: { controller: Controller; onBack?: () => void }) {
  const isGithub = controller.importState.source === "github";
  return (
    <header className="shrink-0 px-5 pt-4 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <ImportSheetTitle source={controller.importState.source} />
          <p className="m-0 mt-1 text-sm text-text-secondary">
            {isGithub
              ? "Browse public gists by username, preview content, and save into one of your locations."
              : "Browse any public Tangled handle, preview a string, and save it into one of your locations."}
          </p>
        </div>
        {onBack && <Button variant="outline" size="sm" onClick={onBack}>Back</Button>}
      </div>
    </header>
  );
}

function ImportSheetTabs({ controller }: { controller: Controller }) {
  const isGithub = controller.importState.source === "github";
  const isTangled = !isGithub;

  const handleSelectTangled = useCallback(() => {
    controller.setImportSource("tangled");
  }, [controller]);

  const handleSelectGithub = useCallback(() => {
    controller.setImportSource("github");
  }, [controller]);

  return (
    <div className="shrink-0 flex gap-1 border-b border-stroke-subtle px-5 sm:px-6">
      <button
        type="button"
        onClick={handleSelectTangled}
        className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
          isTangled
            ? "border-accent-purple text-text-primary"
            : "border-transparent text-text-secondary hover:text-text-primary"
        }`}>
        <Tangled className="h-3.5 w-3.5 shrink-0" />
        Tangled
      </button>
      <button
        type="button"
        onClick={handleSelectGithub}
        className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
          isGithub
            ? "border-accent-magenta text-text-primary"
            : "border-transparent text-text-secondary hover:text-text-primary"
        }`}>
        <GithubIcon size="sm" />
        GitHub
      </button>
    </div>
  );
}

function RecordRow(
  { record, isSelected, onSelectTid, accentClass }: {
    record: { id: string; filename: string; description: string; createdAt: string; visibility?: string };
    isSelected: boolean;
    onSelectTid: (id: string) => void;
    accentClass: string;
  },
) {
  const handleClick = useCallback(() => {
    onSelectTid(record.id);
  }, [onSelectTid, record.id]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-full items-start gap-3 border-b border-stroke-subtle/70 border-l-2 px-3 py-3 text-left transition ${
        isSelected ? `bg-layer-03/60 ${accentClass}` : "hover:bg-layer-03/20 border-l-transparent"
      }`}>
      <FileTypeIcon filename={record.filename} className="mt-0.5 shrink-0 text-base text-icon-secondary" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text-primary">{record.filename}</div>
        <div className="mt-1 text-xs text-text-secondary">{record.description || "No description"}</div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-text-secondary">
          <span>{record.createdAt}</span>
          {record.visibility && <span>{record.visibility}</span>}
        </div>
      </div>
    </button>
  );
}

function BrowseHandleForm({ controller }: { controller: Controller }) {
  const isGithub = controller.importState.source === "github";

  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    if (isGithub) {
      controller.setGithubUsername(event.target.value);
      return;
    }

    controller.setImportHandle(event.target.value);
  }, [controller, isGithub]);

  const handleBrowse = useCallback(() => {
    if (isGithub) {
      controller.handleBrowseGists();
      return;
    }

    controller.handleBrowseStrings();
  }, [controller, isGithub]);

  const browseValue = isGithub ? controller.importState.githubUsername : controller.importState.handle;
  const isBrowseDisabled = controller.importState.isListing || !browseValue.trim();
  const label = isGithub ? "GitHub username" : "Handle or DID";
  const placeholder = isGithub ? "octocat" : (controller.session?.handle ?? "alice.bsky.social");

  return (
    <div className="shrink-0 rounded-lg border border-stroke-subtle bg-layer-02 p-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <div className="flex items-center gap-2">
          <input
            value={browseValue}
            onChange={handleChange}
            placeholder={placeholder}
            className="w-full rounded-lg border border-stroke-subtle bg-layer-01 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-stroke-strong" />
          <Button variant="primaryBlue" size="sm" disabled={isBrowseDisabled} onClick={handleBrowse}>
            {controller.importState.isListing ? "Loading..." : "Browse"}
          </Button>
        </div>
      </label>
      <p className="m-0 mt-2 text-xs text-text-secondary">
        {isGithub
          ? "Public gists can be imported without signing in. Select a gist to fetch full contents before import."
          : "Public strings can be imported without signing in. The browser defaults to your connected handle when available."}
      </p>
    </div>
  );
}

function RecordsPanel({ controller }: { controller: Controller }) {
  const isGithub = controller.importState.source === "github";

  const handleSelectTid = useCallback((tid: string) => {
    if (isGithub) {
      controller.handleSelectGist(tid);
      return;
    }

    controller.handleSelectString(tid);
  }, [controller, isGithub]);

  const rows = isGithub
    ? controller.importState.gists.map((gist) => ({
      id: gist.id,
      filename: gist.filename,
      description: gist.description,
      createdAt: gist.createdAt,
      visibility: gist.public ? "Public" : "Private",
    }))
    : controller.importState.records.map((record) => ({
      id: record.tid,
      filename: record.filename,
      description: record.description,
      createdAt: record.createdAt,
    }));

  const selectedId = isGithub ? controller.importState.selectedGistId : controller.importState.selectedTid;
  const panelTitle = isGithub
    ? (controller.importState.browseUsername ? `Gists for ${controller.importState.browseUsername}` : "Gists")
    : (controller.importState.browseHandle ? `Strings for ${controller.importState.browseHandle}` : "Strings");

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-stroke-subtle bg-layer-02">
      <div className="shrink-0 border-b border-stroke-subtle px-3 py-2 text-xs uppercase tracking-[0.14em] text-text-secondary">
        {panelTitle}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0
          ? (
            <div className="px-3 py-6 text-sm text-text-secondary">
              {controller.importState.isListing
                ? (isGithub ? "Loading GitHub gists..." : "Loading Tangled strings...")
                : (isGithub
                  ? "No gists loaded yet. Enter a username and browse."
                  : "No strings loaded yet. Enter a handle and browse.")}
            </div>
          )
          : rows.map((record) => (
            <RecordRow
              key={record.id}
              record={record}
              isSelected={record.id === selectedId}
              accentClass={isGithub ? "border-l-accent-magenta" : "border-l-accent-purple"}
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
  const isGithub = controller.importState.source === "github";

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
      || (!controller.importState.selectedRecord && !controller.importState.selectedGist)
      || !controller.importState.destinationLocationId
      || !controller.importState.destinationRelPath.trim()
      || !controller.hasLocations,
    [
      controller.importState.isSaving,
      controller.importState.selectedRecord,
      controller.importState.selectedGist,
      controller.importState.destinationLocationId,
      controller.importState.destinationRelPath,
      controller.hasLocations,
    ],
  );

  return (
    <div className="shrink-0 flex flex-col gap-3 rounded-lg border border-stroke-subtle bg-layer-02 p-3">
      <div className="flex gap-2">
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
            className="w-full rounded-lg border border-stroke-subtle bg-layer-01 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-stroke-strong" />
        </label>
      </div>

      <div className="flex items-end justify-between gap-2">
        <p className="m-0 text-xs text-text-secondary">
          {isGithub
            ? "Non-Markdown gists are imported as fenced code blocks so the resulting document stays readable in Writer."
            : "Non-Markdown strings are imported as fenced code blocks so the resulting document stays readable in Writer."}
        </p>
        <Button variant="primaryBlue" size="sm" disabled={importDisabled} onClick={handleImport}>
          {controller.importState.isSaving ? "Importing..." : "Import"}
        </Button>
      </div>
    </div>
  );
}

function PreviewPanel({ controller }: { controller: Controller }) {
  const isGithub = controller.importState.source === "github";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-stroke-subtle bg-[#0c1520]">
      <div className="shrink-0 border-b border-white/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-white/60">
        Preview
      </div>
      <pre className="min-h-0 flex-1 overflow-auto px-3 py-3 text-xs leading-5 text-white/85">
        {controller.importState.isFetching
          ? (isGithub ? "Loading gist preview..." : "Loading string preview...")
          : (controller.importState.previewText
            || (isGithub
              ? "Select a gist to preview the imported document body."
              : "Select a string to preview the imported document body."))}
      </pre>
    </div>
  );
}

function SelectedRecordSummary({ controller }: { controller: Controller }) {
  const isGithub = controller.importState.source === "github";
  const selectedFilename = useMemo(
    () =>
      (isGithub ? controller.importState.selectedGist?.filename : controller.importState.selectedRecord?.filename)
        ?? "Nothing selected",
    [controller.importState.selectedGist, controller.importState.selectedRecord, isGithub],
  );
  const description = isGithub
    ? (controller.importState.selectedGist?.description || "Select a gist to inspect its contents before import.")
    : (controller.importState.selectedRecord?.description || "Select a string to inspect its contents before import.");

  return (
    <div
      className={`shrink-0 rounded-lg border border-stroke-subtle border-l-4 bg-layer-02 p-3 ${
        isGithub ? "border-l-accent-magenta" : "border-l-accent-purple"
      }`}>
      <div className="text-sm font-medium text-text-primary">{selectedFilename}</div>
      <p className="m-0 mt-1 text-xs text-text-secondary">{description}</p>
    </div>
  );
}

function ImportSheetBody({ controller }: { controller: Controller }) {
  return (
    <div className="min-h-0 flex-1 overflow-hidden px-5 py-4 sm:px-6">
      <div className="grid h-full gap-4 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <BrowseHandleForm controller={controller} />
          <RecordsPanel controller={controller} />
        </section>
        <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
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
        <ImportSheetHeader controller={controller} onBack={onBack} />
        <ImportSheetTabs controller={controller} />
        <ImportSheetBody controller={controller} />
      </section>
    </Sheet>
  );
}
