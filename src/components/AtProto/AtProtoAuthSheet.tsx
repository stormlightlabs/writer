import { Button } from "$components/Button";
import { Sheet } from "$components/Sheet";
import type { useAtProtoController } from "$hooks/controllers/useAtProtoController";
import { Tangled } from "$icons";
import type { AtProtoSheetMode } from "$state/types";
import { type ChangeEventHandler, type KeyboardEventHandler, useCallback, useMemo } from "react";
import { ImportSheet } from "./ImportSheet";
import { PublishSheet } from "./PublishSheet";

type Controller = ReturnType<typeof useAtProtoController>;

type AtProtoAuthSheetProps = { controller: Controller; onOpenStandardSiteImport?: () => void };

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
      <p className="m-0 text-xs text-text-secondary">Writer opens your browser so you can authenticate with BlueSky.</p>
      <div className="flex items-center gap-2">
        <Button variant="primaryBlue" size="sm" disabled={isDisabled} onClick={handleConnect}>
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
  const handle = useMemo(() => controller.session?.handle ?? "Unknown", [controller.session]);
  const did = useMemo(() => controller.session?.did ?? "Unknown DID", [controller.session]);
  return (
    <div className="rounded-lg border border-stroke-subtle bg-layer-02/40 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-text-secondary">
        <Tangled className="h-4 w-4 shrink-0" />
        <span>Account</span>
      </div>
      <div className="mt-1 text-sm font-medium text-text-primary">{handle}</div>
      <div className="mt-1 break-all text-xs text-text-secondary">{did}</div>
    </div>
  );
}

function SessionActions(
  { controller, onOpenStandardSiteImport }: { controller: Controller; onOpenStandardSiteImport?: () => void },
) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={controller.openImportSheet}>Import Strings</Button>
        {onOpenStandardSiteImport && (
          <Button variant="primary" size="sm" onClick={onOpenStandardSiteImport}>Import Posts</Button>
        )}
      </div>
      <Button variant="dangerGhost" size="sm" disabled={controller.isPending} onClick={controller.handleLogout}>
        {controller.isPending ? "Disconnecting..." : "Log Out"}
      </Button>
    </div>
  );
}

function SessionView(
  { controller, onOpenStandardSiteImport }: { controller: Controller; onOpenStandardSiteImport?: () => void },
) {
  const endpoint = useMemo(() => controller.session?.endpoint ?? "Unknown endpoint", [controller.session]);
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
          <div className="mt-1 break-all text-xs text-text-primary">{endpoint}</div>
        </div>
        <SessionActions controller={controller} onOpenStandardSiteImport={onOpenStandardSiteImport} />
      </div>
    </>
  );
}

export function AtProtoAuthSheet({ controller, onOpenStandardSiteImport }: AtProtoAuthSheetProps) {
  return (
    <>
      <Sheet
        isOpen={controller.sheetMode === "login" || controller.sheetMode === "session"}
        onClose={controller.closeSheet}
        position="r"
        size="md"
        ariaLabel={controller.sheetMode === "session" ? "AT Protocol session" : "AT Protocol login"}
        className="right-4 top-14 bottom-4 rounded-xl border shadow-xl"
        backdropClassName="bg-black/30">
        <section className="flex h-full min-h-0 flex-col overflow-hidden bg-layer-01">
          {controller.sheetMode === "session" && (
            <SessionView controller={controller} onOpenStandardSiteImport={onOpenStandardSiteImport} />
          )}
          {controller.sheetMode === "login" && <LoginView controller={controller} />}
        </section>
      </Sheet>
      <ImportSheet
        controller={controller}
        isOpen={controller.sheetMode === "import"}
        onClose={controller.closeSheet}
        onBack={controller.session ? controller.openSessionSheet : undefined} />
      <PublishSheet
        controller={controller}
        isOpen={controller.sheetMode === "publish"}
        onClose={controller.closeSheet}
        onBack={controller.openSessionSheet} />
    </>
  );
}
