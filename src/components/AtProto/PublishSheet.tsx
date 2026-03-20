import { Button } from "$components/Button";
import { Sheet } from "$components/Sheet";
import type { useAtProtoController } from "$hooks/controllers/useAtProtoController";
import { Tangled } from "$icons";
import type { ChangeEventHandler } from "react";
import { useCallback, useMemo } from "react";

type Controller = ReturnType<typeof useAtProtoController>;

type PublishSheetProps = { controller: Controller; isOpen: boolean; onClose: () => void; onBack?: () => void };

function PublishSheetTitle() {
  return (
    <div className="flex items-center gap-2">
      <Tangled className="h-5 w-5 shrink-0" />
      <h2 className="m-0 text-base font-semibold text-text-primary">Publish as String</h2>
    </div>
  );
}

function PublishSheetHeader({ onBack }: { onBack?: () => void }) {
  return (
    <header className="border-b border-stroke-subtle px-5 py-4 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <PublishSheetTitle />
          <p className="m-0 mt-1 text-sm text-text-secondary">
            Publish this document to Tangled as a string on your AT Protocol PDS.
          </p>
        </div>
        {onBack && <Button variant="outline" size="sm" onClick={onBack}>Back</Button>}
      </div>
    </header>
  );
}

function PublishSuccessBanner({ controller }: { controller: Controller }) {
  const { publishedRecord } = controller.publishState;
  if (!publishedRecord) {
    return null;
  }

  return (
    <div className="rounded-lg border border-support-success/35 bg-support-success/10 px-3 py-2.5">
      <p className="m-0 text-sm font-medium text-support-success">Published successfully</p>
      <p className="m-0 mt-1 break-all text-xs text-text-secondary">{publishedRecord.uri}</p>
    </div>
  );
}

function PublishForm({ controller }: { controller: Controller }) {
  const handleFilenameChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    controller.setPublishFilename(event.target.value);
  }, [controller]);

  const handleDescriptionChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    controller.setPublishDescription(event.target.value);
  }, [controller]);

  return (
    <div className="grid gap-3 rounded-lg border border-stroke-subtle bg-layer-02/20 p-3">
      <div className="grid gap-1.5">
        <label htmlFor="publish-sheet-filename" className="text-sm font-medium text-text-primary">Filename</label>
        <input
          id="publish-sheet-filename"
          value={controller.publishState.filename}
          onChange={handleFilenameChange}
          placeholder="notes.md"
          className="w-full rounded-lg border border-stroke-subtle bg-field-01 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-stroke-strong" />
        <span className="text-xs text-text-secondary">1–140 characters. Defaults to the document filename.</span>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="publish-sheet-description" className="text-sm font-medium text-text-primary">Description</label>
        <input
          id="publish-sheet-description"
          value={controller.publishState.description}
          onChange={handleDescriptionChange}
          placeholder="Optional summary (up to 280 characters)"
          maxLength={280}
          className="w-full rounded-lg border border-stroke-subtle bg-field-01 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-stroke-strong" />
      </div>
    </div>
  );
}

function PreviewPanel({ controller }: { controller: Controller }) {
  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-stroke-subtle bg-[#0f1720]">
      <div className="border-b border-white/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-white/65">
        Preview
      </div>
      <pre className="min-h-0 overflow-auto px-3 py-3 text-xs leading-5 text-white/90">
        {controller.publishState.contents || "No content to preview."}
      </pre>
    </div>
  );
}

function PublishActions({ controller }: { controller: Controller }) {
  const handlePublish = useCallback(() => {
    controller.handlePublish();
  }, [controller]);

  const publishDisabled = useMemo(
    () => controller.publishState.isPublishing || !controller.publishState.filename.trim() || !controller.session,
    [controller.publishState.isPublishing, controller.publishState.filename, controller.session],
  );

  return (
    <div className="flex justify-end">
      <Button variant="primary" size="sm" disabled={publishDisabled} onClick={handlePublish}>
        {controller.publishState.isPublishing ? "Publishing..." : "Publish to Tangled"}
      </Button>
    </div>
  );
}

function PublishSheetBody({ controller }: { controller: Controller }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid min-h-full gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:px-6">
        <section className="flex min-h-72 flex-col gap-3 overflow-hidden">
          <PublishSuccessBanner controller={controller} />
          <PublishForm controller={controller} />
          <PublishActions controller={controller} />
        </section>
        <section className="flex min-h-72 flex-col overflow-hidden">
          <PreviewPanel controller={controller} />
        </section>
      </div>
    </div>
  );
}

export function PublishSheet({ controller, isOpen, onClose, onBack }: PublishSheetProps) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      position="r"
      size="full"
      ariaLabel="Publish as String"
      className="right-4 top-8 bottom-4 w-[min(96vw,900px)] rounded-xl border shadow-xl"
      backdropClassName="bg-black/30">
      <section className="flex h-full min-h-0 flex-col overflow-hidden bg-layer-01">
        <PublishSheetHeader onBack={onBack} />
        <PublishSheetBody controller={controller} />
      </section>
    </Sheet>
  );
}
