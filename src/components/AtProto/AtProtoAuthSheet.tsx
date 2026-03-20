import { Button } from "$components/Button";
import { Sheet } from "$components/Sheet";
import type { useAtProtoController } from "$hooks/controllers/useAtProtoController";
import { FileTypeIcon, Tangled } from "$icons";
import type { AtProtoSheetMode } from "$state/types";
import type { TangledStringRecord } from "$types";
import { type ChangeEventHandler, type KeyboardEventHandler, useCallback, useMemo } from "react";

type Controller = ReturnType<typeof useAtProtoController>;

type AtProtoAuthSheetProps = { controller: Controller };

function AuthSheetHeader(
  { title, description, mode, onBack }: {
    title: string;
    description: string;
    mode: AtProtoSheetMode;
    onBack?: () => void;
  },
) {
  return (
    <header className="border-b border-stroke-subtle px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <HeaderTitle title={title} />
          <p className="m-0 mt-1 text-sm text-text-secondary">{description}</p>
        </div>
        {mode === "import" && onBack && <Button variant="outline" size="sm" onClick={onBack}>Back</Button>}
      </div>
    </header>
  );
}

function HeaderTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Tangled className="h-5 w-5 shrink-0" />
      <h2 className="m-0 text-base font-semibold text-text-primary">{title}</h2>
    </div>
  );
}

function LoginActions({ controller, isDisabled }: { controller: Controller; isDisabled: boolean }) {
  const handleConnect = useCallback(() => {
    controller.handleLogin(controller.importState.handle);
  }, [controller]);

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="m-0 text-xs text-text-secondary">
        Writer opens your browser and completes the OAuth loopback flow locally.
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={controller.openImportSheet}>Browse Public Strings</Button>
        <Button variant="primary" size="sm" disabled={isDisabled} onClick={handleConnect}>
          {controller.isPending ? "Connecting..." : "Connect"}
        </Button>
      </div>
    </div>
  );
}

function LoginView({ controller }: { controller: Controller }) {
  const isDisabled = useMemo(() => controller.isPending || !controller.importState.handle.trim(), [
    controller.importState.handle,
    controller.isPending,
  ]);
  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    controller.setImportHandle(event.target.value);
  }, [controller]);
  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLInputElement>>((event) => {
    if (event.key === "Enter" && !isDisabled) {
      controller.handleLogin(controller.importState.handle);
    }
  }, [controller, isDisabled]);

  return (
    <>
      <AuthSheetHeader
        mode="login"
        title="Connect Tangled"
        description="Sign in with your AT Protocol handle to browse and import Tangled strings." />
      <div className="space-y-4 px-4 py-4 sm:px-5">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text-primary">Handle</span>
          <input
            value={controller.importState.handle}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="alice.bsky.social"
            autoFocus
            disabled={controller.isPending}
            className="w-full rounded-lg border border-stroke-subtle bg-field-01 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-stroke-strong" />
        </label>
        <LoginActions controller={controller} isDisabled={isDisabled} />
      </div>
    </>
  );
}

function SessionAccountCard({ controller }: { controller: Controller }) {
  return (
    <div className="rounded-lg border border-stroke-subtle bg-layer-02/40 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-text-secondary">
        <Tangled className="h-4 w-4 shrink-0" />
        <span>Account</span>
      </div>
      <div className="mt-1 text-sm font-medium text-text-primary">{controller.session?.handle ?? "Unknown"}</div>
      <div className="mt-1 break-all text-xs text-text-secondary">{controller.session?.did ?? "Unknown DID"}</div>
    </div>
  );
}

function SessionView({ controller }: { controller: Controller }) {
  return (
    <>
      <AuthSheetHeader
        mode="session"
        title="Tangled Session"
        description="Your AT Protocol session is ready for Tangled string import and publish." />
      <div className="space-y-3 px-4 py-4 sm:px-5">
        <SessionAccountCard controller={controller} />
        <div className="rounded-lg border border-stroke-subtle bg-layer-02/25 p-3">
          <div className="text-xs uppercase tracking-[0.14em] text-text-secondary">PDS endpoint</div>
          <div className="mt-1 break-all text-xs text-text-primary">
            {controller.session?.endpoint ?? "Unknown endpoint"}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button variant="primary" size="sm" onClick={controller.openImportSheet}>Import Strings</Button>
          <Button variant="dangerGhost" size="sm" disabled={controller.isPending} onClick={controller.handleLogout}>
            {controller.isPending ? "Disconnecting..." : "Log Out"}
          </Button>
        </div>
      </div>
    </>
  );
}

function RecordRow(
  { record, isSelected, onSelectTid }: {
    record: TangledStringRecord;
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
            variant="primary"
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
  const importDisabled = controller.importState.isSaving
    || !controller.importState.selectedRecord
    || !controller.importState.destinationLocationId
    || !controller.importState.destinationRelPath.trim()
    || !controller.hasLocations;

  return (
    <div className="grid gap-3 rounded-lg border border-stroke-subtle bg-layer-02/20 p-3">
      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-text-primary">Location</span>
        <select
          value={controller.importState.destinationLocationId ?? ""}
          disabled={!controller.hasLocations}
          onChange={handleLocationChange}
          className="w-full rounded-lg border border-stroke-subtle bg-field-01 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-stroke-strong">
          {!controller.hasLocations && <option value="">Add a location first</option>}
          {controller.hasLocations && <option value="">Choose a location</option>}
          {controller.locations.map((location) => <option key={location.id} value={location.id}>{location.name}
          </option>)}
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="text-sm font-medium text-text-primary">Destination path</span>
        <input
          value={controller.importState.destinationRelPath}
          onChange={handlePathChange}
          placeholder="notes/imported.md"
          className="w-full rounded-lg border border-stroke-subtle bg-field-01 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-stroke-strong" />
      </label>
      <p className="m-0 text-xs text-text-secondary">
        Non-Markdown strings are imported as fenced code blocks so the resulting document stays readable in Writer.
      </p>
      <div className="flex justify-end">
        <Button variant="primary" size="sm" disabled={importDisabled} onClick={handleImport}>
          {controller.importState.isSaving ? "Importing..." : "Import to Location"}
        </Button>
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
  const selectedFilename = controller.importState.selectedRecord?.filename ?? "Nothing selected";

  return (
    <div className="rounded-lg border border-stroke-subtle bg-layer-02/25 p-3">
      <div className="text-sm font-medium text-text-primary">{selectedFilename}</div>
      <p className="m-0 mt-1 text-xs text-text-secondary">
        {controller.importState.selectedRecord?.description || "Select a string to inspect its contents before import."}
      </p>
    </div>
  );
}

function ImportView({ controller }: { controller: Controller }) {
  return (
    <>
      <AuthSheetHeader
        mode="import"
        title="Import from Tangled"
        description="Browse any public Tangled handle, preview a string, and save it into one of your locations."
        onBack={controller.session ? controller.openSessionSheet : undefined} />
      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden px-4 py-4 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] sm:px-5">
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
    </>
  );
}

export function AtProtoAuthSheet({ controller }: AtProtoAuthSheetProps) {
  return (
    <Sheet
      isOpen={controller.sheetMode !== "closed"}
      onClose={controller.closeSheet}
      position="r"
      size={controller.sheetMode === "import" ? "xl" : "md"}
      ariaLabel={controller.sheetMode === "session"
        ? "AT Protocol session"
        : controller.sheetMode === "import"
        ? "Import from Tangled"
        : "AT Protocol login"}
      className="right-4 top-14 bottom-4 rounded-xl border shadow-xl"
      backdropClassName="bg-black/30">
      <section className="flex h-full min-h-0 flex-col overflow-hidden bg-layer-01">
        {controller.sheetMode === "session" && <SessionView controller={controller} />}
        {controller.sheetMode === "import" && <ImportView controller={controller} />}
        {controller.sheetMode === "login" && <LoginView controller={controller} />}
      </section>
    </Sheet>
  );
}
