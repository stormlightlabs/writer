import { Button } from "$components/Button";
import { FileAddIcon, FolderAddIcon, LibraryIcon, SearchIcon, StandardSiteIcon, Tangled } from "$icons";
import { formatCount } from "$utils/text";
import { useMemo } from "react";

type WelcomeMeta = { headline: string; description: string; locationSummary: string; documentSummary: string };

type WelcomeActionIcon = "create" | "search" | "tangled" | "standardSite";

type WelcomeAction = {
  title: string;
  description: string;
  icon: WelcomeActionIcon;
  onClick?: () => void;
  disabled?: boolean;
  iconClassName: string;
  iconContainerClassName: string;
};

type WelcomeActionCardProps = WelcomeAction;

type WelcomeScreenProps = {
  hasLocations: boolean;
  locationCount: number;
  documentCount: number;
  onCreateNewDocument?: () => void;
  onOpenExisting: () => void;
  onAddLocation: () => void;
  onOpenImportSheet?: () => void;
  onOpenStandardSiteImportSheet?: () => void;
};

function ActionIcon({ icon, className = "" }: { icon: WelcomeActionIcon; className?: string }) {
  switch (icon) {
    case "create":
      return <FileAddIcon size="lg" className={className} />;
    case "search":
      return <SearchIcon size="lg" className={className} />;
    case "tangled":
      return <Tangled className={`h-5 w-5 ${className}`} />;
    case "standardSite":
      return <StandardSiteIcon className={className} />;
  }
}

type WelcomeHeroProps = WelcomeMeta;

function WelcomeSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stroke-subtle/15 bg-layer-02 px-4 py-3">
      <div className="text-[0.72rem] uppercase tracking-[0.22em] text-text-placeholder">{label}</div>
      <div className="mt-2 font-headline text-xl text-text-primary sm:text-2xl">{value}</div>
    </div>
  );
}

function WelcomeHero({ headline, description, locationSummary, documentSummary }: WelcomeHeroProps) {
  return (
    <div className="space-y-5">
      <div className="inline-flex items-center gap-3 rounded-full border border-stroke-subtle/20 bg-layer-02 px-3 py-1.5 text-[0.72rem] uppercase tracking-[0.26em] text-text-secondary">
        <LibraryIcon size="sm" className="text-accent-blue" />
        Workspace Ready
      </div>

      <div className="space-y-2.5">
        <h1 className="m-0 max-w-2xl font-headline text-3xl leading-none tracking-tight text-text-primary sm:text-4xl xl:text-5xl">
          {headline}
        </h1>
        <p className="m-0 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base sm:leading-7">{description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <WelcomeSummaryCard label="Locations" value={locationSummary} />
        <WelcomeSummaryCard label="Library" value={documentSummary} />
      </div>
    </div>
  );
}

type WelcomeAsideProps = { hasLocations: boolean; onAddLocation: () => void };

function WelcomeAside({ hasLocations, onAddLocation }: WelcomeAsideProps) {
  const copy = hasLocations
    ? "Use the quick actions to stay in flow."
    : "Once a location is added, Writer can create drafts locally and route imports into that workspace.";
  const label = hasLocations ? "Add another location" : "Add your first location";

  return (
    <aside className="flex flex-col justify-between gap-5 rounded-[1.25rem] border border-stroke-subtle/15 bg-layer-02 p-5">
      <div className="space-y-2.5">
        <div className="text-[0.72rem] uppercase tracking-[0.22em] text-text-placeholder">Next Move</div>
        <p className="m-0 text-sm leading-6 text-text-secondary">{copy}</p>
      </div>

      <Button variant="secondary" size="lg" onClick={onAddLocation} className="justify-start rounded-xl">
        <FolderAddIcon size="sm" className="mr-2" />
        {label}
      </Button>
    </aside>
  );
}

function WelcomeActionCard(
  { title, description, icon, onClick, disabled = false, iconClassName, iconContainerClassName }:
    WelcomeActionCardProps,
) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className="hover:cursor-pointer group flex min-h-0 flex-col gap-5 rounded-xl border border-stroke-subtle/20 bg-layer-02 p-4 text-left transition duration-200 hover:border-stroke-subtle/40 hover:bg-layer-hover-02 disabled:cursor-not-allowed disabled:opacity-50">
      <div
        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stroke-subtle/20 ${iconContainerClassName}`}>
        <ActionIcon icon={icon} className={iconClassName} />
      </div>
      <div className="space-y-2">
        <h3 className="m-0 font-headline text-base tracking-tight text-text-primary sm:text-lg">{title}</h3>
        <p className="m-0 max-w-sm text-sm leading-6 text-text-secondary">{description}</p>
      </div>
    </button>
  );
}

function WelcomeActions({ actions }: { actions: WelcomeAction[] }) {
  return (
    <div className="grid gap-3 border-t border-stroke-subtle/15 px-5 py-5 md:grid-cols-2 xl:grid-cols-4 lg:px-8 xl:px-10">
      {actions.map((action) => <WelcomeActionCard key={action.title} {...action} />)}
    </div>
  );
}

function WelcomeFrame(
  { meta, hasLocations, onAddLocation, actions }: { meta: WelcomeMeta } & WelcomeAsideProps & {
    actions: WelcomeAction[];
  },
) {
  return (
    <section className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-stroke-subtle/15 bg-layer-01 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
      <div className="min-h-0 overflow-y-auto">
        <div className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(16rem,0.82fr)] xl:gap-6 xl:px-8">
          <WelcomeHero {...meta} />
          <WelcomeAside hasLocations={hasLocations} onAddLocation={onAddLocation} />
        </div>
        <WelcomeActions actions={actions} />
      </div>
    </section>
  );
}

export function WelcomeScreen(
  {
    hasLocations,
    locationCount,
    documentCount,
    onCreateNewDocument,
    onOpenExisting,
    onAddLocation,
    onOpenImportSheet,
    onOpenStandardSiteImportSheet,
  }: WelcomeScreenProps,
) {
  const meta = useMemo(
    () => ({
      headline: hasLocations ? "Nothing is open." : "Start by adding a location.",
      description: hasLocations
        ? "Create a fresh draft, reopen something from your library, or pull material in from an external source."
        : "Writer needs a location before it can create drafts, save notes, or import anything into your workspace.",
      locationSummary: hasLocations
        ? `${formatCount(locationCount, "location", "locations")} connected`
        : "No locations connected",
      documentSummary: hasLocations
        ? `${formatCount(documentCount, "document", "documents")} in the current location`
        : "Imports stay disabled until a location is available",
    }),
    [hasLocations, locationCount, documentCount],
  );

  const actions = useMemo<WelcomeAction[]>(
    () => [{
      title: "Create new",
      description: hasLocations
        ? "Open a blank draft in the selected location."
        : "Add a location first so the draft has somewhere to live.",
      icon: "create",
      onClick: onCreateNewDocument,
      disabled: !hasLocations || !onCreateNewDocument,
      iconClassName: "text-accent-blue",
      iconContainerClassName: "bg-layer-03",
    }, {
      title: "Open existing",
      description: hasLocations
        ? "Search your library and jump straight into an existing document."
        : "Connect a location first to browse or search stored work.",
      icon: "search",
      onClick: onOpenExisting,
      disabled: !hasLocations,
      iconClassName: "text-text-primary",
      iconContainerClassName: "bg-layer-03",
    }, {
      title: "Import from Tangled",
      description: "Pull in strings from Tangled and save them as local documents.",
      icon: "tangled",
      onClick: onOpenImportSheet,
      disabled: !hasLocations || !onOpenImportSheet,
      iconClassName: "text-accent-magenta",
      iconContainerClassName: "bg-layer-03",
    }, {
      title: "Import Standard.Site Documents",
      description: "Bring public posts into Writer for local editing and revision.",
      icon: "standardSite",
      onClick: onOpenStandardSiteImportSheet,
      disabled: !hasLocations || !onOpenStandardSiteImportSheet,
      iconClassName: "text-accent-green",
      iconContainerClassName: "bg-layer-03",
    }],
    [hasLocations, onCreateNewDocument, onOpenExisting, onOpenImportSheet, onOpenStandardSiteImportSheet],
  );

  return (
    <div className="flex flex-1 overflow-hidden bg-layer-01" data-testid="workspace-welcome-screen">
      <div className="relative flex min-h-0 w-full items-center justify-center px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <WelcomeFrame meta={meta} hasLocations={hasLocations} onAddLocation={onAddLocation} actions={actions} />
      </div>
    </div>
  );
}
