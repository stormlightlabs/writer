import { Button } from "$components/Button";
import { Sheet } from "$components/Sheet";
import type { useStandardSiteController } from "$hooks/controllers/useStandardSiteController";
import type { PostRecord, PublicationRecord } from "$types";
import type { ChangeEventHandler } from "react";
import { useCallback, useMemo } from "react";

type Controller = ReturnType<typeof useStandardSiteController>;

type PostImportSheetProps = { controller: Controller; isOpen: boolean; onClose: () => void; onBack?: () => void };

function SheetTitle() {
  return <h2 className="m-0 text-base font-semibold text-text-primary">Import from Standard.Site</h2>;
}

function SheetHeader({ onBack }: { onBack?: () => void }) {
  return (
    <header className="border-b border-stroke-subtle px-5 py-4 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <SheetTitle />
          <p className="m-0 mt-1 text-sm text-text-secondary">
            Browse any AT Protocol handle, select a publication and post, preview the converted Markdown, and save it
            into one of your locations.
          </p>
        </div>
        {onBack && <Button variant="outline" size="sm" onClick={onBack}>Back</Button>}
      </div>
    </header>
  );
}

function BrowseHandleForm({ controller }: { controller: Controller }) {
  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    controller.setHandle(event.target.value);
  }, [controller]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key === "Enter" && !controller.importState.isListingPublications && controller.importState.handle.trim()
    ) {
      controller.handleBrowsePublications();
    }
  }, [controller]);

  return (
    <div className="rounded-lg border border-stroke-subtle bg-layer-02/25 p-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-text-primary">Handle or DID</span>
        <div className="flex items-center gap-2">
          <input
            value={controller.importState.handle}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="alice.bsky.social"
            className="w-full rounded-lg border border-stroke-subtle bg-field-01 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-stroke-strong" />
          <Button
            variant="primaryBlue"
            size="sm"
            disabled={controller.importState.isListingPublications || !controller.importState.handle.trim()}
            onClick={controller.handleBrowsePublications}>
            {controller.importState.isListingPublications ? "Loading..." : "Browse"}
          </Button>
        </div>
      </label>
    </div>
  );
}

type PublicationRowProps = { publication: PublicationRecord; isSelected: boolean; onSelect: (tid: string) => void };

function PublicationRow({ publication, isSelected, onSelect }: PublicationRowProps) {
  const handleClick = useCallback(() => {
    onSelect(publication.tid);
  }, [onSelect, publication.tid]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-full items-start gap-3 border-b border-stroke-subtle/70 px-3 py-2.5 text-left transition ${
        isSelected ? "bg-layer-03/60" : "hover:bg-layer-02/50"
      }`}>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text-primary">{publication.name}</div>
        {publication.description && (
          <div className="mt-0.5 truncate text-xs text-text-secondary">{publication.description}</div>
        )}
      </div>
    </button>
  );
}

function PublicationsPanel({ controller }: { controller: Controller }) {
  const handleSelect = useCallback((tid: string) => {
    controller.handleSelectPublication(tid);
  }, [controller]);
  const skippedCount = controller.importState.skippedInvalidPublicationCount;

  return (
    <div className="min-h-0 rounded-lg border border-stroke-subtle bg-layer-02/15">
      <div className="border-b border-stroke-subtle px-3 py-2 text-xs uppercase tracking-[0.14em] text-text-secondary">
        {controller.importState.browseHandle
          ? `Publications for ${controller.importState.browseHandle}`
          : "Publications"}
      </div>
      {skippedCount > 0 && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
          Skipped {skippedCount} invalid publication{skippedCount === 1 ? "" : "s"} while loading this account.
        </div>
      )}
      <div className="min-h-0 overflow-y-auto">
        {controller.importState.publications.length === 0
          ? (
            <div className="px-3 py-5 text-sm text-text-secondary">
              {controller.importState.isListingPublications
                ? "Loading publications..."
                : skippedCount > 0
                ? "No valid publications loaded for this account."
                : "No publications loaded. Enter a handle and browse."}
            </div>
          )
          : controller.importState.publications.map((pub) => (
            <PublicationRow
              key={pub.tid}
              publication={pub}
              isSelected={pub.tid === controller.importState.selectedPublicationTid}
              onSelect={handleSelect} />
          ))}
      </div>
    </div>
  );
}

function PostRow(
  { post, isSelected, onSelect }: { post: PostRecord; isSelected: boolean; onSelect: (tid: string) => void },
) {
  const handleClick = useCallback(() => {
    onSelect(post.tid);
  }, [onSelect, post.tid]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex w-full items-start gap-3 border-b border-stroke-subtle/70 px-3 py-2.5 text-left transition ${
        isSelected ? "bg-layer-03/60" : "hover:bg-layer-02/50"
      }`}>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text-primary">{post.title}</div>
        {post.description && <div className="mt-0.5 truncate text-xs text-text-secondary">{post.description}</div>}
        <div className="mt-0.5 text-[11px] text-text-secondary">{post.publishedAt}</div>
      </div>
    </button>
  );
}

function PostsPanel({ controller }: { controller: Controller }) {
  const handleSelect = useCallback((tid: string) => {
    controller.handleSelectPost(tid);
  }, [controller]);

  return (
    <div className="min-h-0 rounded-lg border border-stroke-subtle bg-layer-02/15">
      <div className="border-b border-stroke-subtle px-3 py-2 text-xs uppercase tracking-[0.14em] text-text-secondary">
        Posts
      </div>
      <div className="min-h-0 overflow-y-auto">
        {controller.importState.posts.length === 0
          ? (
            <div className="px-3 py-5 text-sm text-text-secondary">
              {controller.importState.isListingPosts
                ? "Loading posts..."
                : controller.importState.selectedPublicationTid
                ? "No posts in this publication."
                : "Select a publication to see its posts."}
            </div>
          )
          : controller.importState.posts.map((post) => (
            <PostRow
              key={post.tid}
              post={post}
              isSelected={post.tid === controller.importState.selectedPostTid}
              onSelect={handleSelect} />
          ))}
      </div>
    </div>
  );
}

function SelectedPostSummary({ controller }: { controller: Controller }) {
  const title = useMemo(() => controller.importState.selectedPost?.title ?? "Nothing selected", [
    controller.importState.selectedPost,
  ]);

  return (
    <div className="rounded-lg border border-stroke-subtle bg-layer-02/25 p-3">
      <div className="text-sm font-medium text-text-primary">{title}</div>
      <p className="m-0 mt-1 text-xs text-text-secondary">
        {controller.importState.selectedPost?.description || "Select a post to preview its content."}
      </p>
      {controller.importState.selectedPost && controller.importState.selectedPost.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {controller.importState.selectedPost.tags.map((tag) => (
            <span key={tag} className="rounded bg-layer-03/50 px-1.5 py-0.5 text-[10px] text-text-secondary">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

type LocationSelectProps = {
  value: number | null;
  hasLocations: boolean;
  locations: Controller["locations"];
  onChange: ChangeEventHandler<HTMLSelectElement>;
};

function LocationSelect({ value, hasLocations, locations, onChange }: LocationSelectProps) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-text-primary">Location</span>
      <select
        value={value ?? ""}
        disabled={!hasLocations}
        onChange={onChange}
        className="w-full rounded-lg border border-stroke-subtle bg-field-01 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-stroke-strong">
        {!hasLocations && <option value="">Add a location first</option>}
        {hasLocations && <option value="">Choose a location</option>}
        {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
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
      || !controller.importState.selectedPost
      || !controller.importState.destinationLocationId
      || !controller.importState.destinationRelPath.trim()
      || !controller.hasLocations
      || !controller.importState.previewMarkdown,
    [
      controller.importState.isSaving,
      controller.importState.selectedPost,
      controller.importState.destinationLocationId,
      controller.importState.destinationRelPath,
      controller.hasLocations,
      controller.importState.previewMarkdown,
    ],
  );

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-stroke-subtle bg-layer-02/20 p-3">
      <div className="flex gap-2">
        <LocationSelect
          value={controller.importState.destinationLocationId}
          hasLocations={controller.hasLocations}
          locations={controller.locations}
          onChange={handleLocationChange} />
        <label className="grid flex-1 gap-1.5">
          <span className="text-sm font-medium text-text-primary">Destination path</span>
          <input
            value={controller.importState.destinationRelPath}
            onChange={handlePathChange}
            placeholder="posts/my-post.md"
            className="w-full rounded-lg border border-stroke-subtle bg-field-01 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-stroke-strong" />
        </label>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="m-0 text-xs text-text-secondary">Leaflet content is converted to Markdown on import.</p>
        <Button variant="primaryBlue" size="sm" disabled={importDisabled} onClick={handleImport}>
          {controller.importState.isSaving ? "Importing..." : "Import"}
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
      <pre className="min-h-0 overflow-auto whitespace-pre-wrap break-words px-3 py-3 text-xs leading-5 text-white/90">
        {controller.importState.isFetchingPreview
          ? "Loading post preview..."
          : controller.importState.previewMarkdown || "Select a post to preview the imported Markdown."}
      </pre>
    </div>
  );
}

function SheetBody({ controller }: { controller: Controller }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid min-h-full gap-4 px-5 py-4 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] sm:px-6">
        <section className="flex min-h-112 flex-col gap-3 overflow-hidden">
          <BrowseHandleForm controller={controller} />
          <PublicationsPanel controller={controller} />
          <PostsPanel controller={controller} />
        </section>
        <section className="flex min-h-112 flex-col gap-3 overflow-hidden">
          <SelectedPostSummary controller={controller} />
          <ImportDestinationForm controller={controller} />
          <PreviewPanel controller={controller} />
        </section>
      </div>
    </div>
  );
}

export function PostImportSheet({ controller, isOpen, onClose, onBack }: PostImportSheetProps) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      position="r"
      size="full"
      ariaLabel="Import from Standard.Site"
      className="right-4 top-8 bottom-4 w-[min(96vw,1080px)] rounded-xl border shadow-xl"
      backdropClassName="bg-black/30">
      <section className="flex h-full min-h-0 flex-col overflow-hidden bg-layer-01">
        <SheetHeader onBack={onBack} />
        <SheetBody controller={controller} />
      </section>
    </Sheet>
  );
}
