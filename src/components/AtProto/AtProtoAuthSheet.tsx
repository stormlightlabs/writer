import { Button } from "$components/Button";
import { Sheet } from "$components/Sheet";
import type { AtProtoSheetMode } from "$state/types";
import type { AtProtoSession } from "$types";
import { type ChangeEventHandler, type KeyboardEventHandler, useCallback, useMemo, useState } from "react";

type AtProtoAuthSheetProps = {
  mode: AtProtoSheetMode;
  session: AtProtoSession | null;
  isPending: boolean;
  onClose: () => void;
  onLogin: (handle: string) => void;
  onLogout: () => void;
};

function AuthSheetHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="border-b border-stroke-subtle px-4 py-4 sm:px-5">
      <h2 className="m-0 text-base font-semibold text-text-primary">{title}</h2>
      <p className="m-0 mt-1 text-sm text-text-secondary">{description}</p>
    </header>
  );
}

function LoginView({ isPending, onLogin }: { isPending: boolean; onLogin: (handle: string) => void }) {
  const [handle, setHandle] = useState("");

  const isDisabled = useMemo(() => isPending || !handle.trim(), [handle, isPending]);
  const submit = useCallback(() => {
    onLogin(handle);
  }, [handle, onLogin]);
  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
    setHandle(event.target.value);
  }, []);
  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback((event) => {
    if (event.key === "Enter" && !isDisabled) {
      submit();
    }
  }, [isDisabled, submit]);

  return (
    <>
      <AuthSheetHeader
        title="Connect Tangled"
        description="Sign in with your AT Protocol handle to publish and import Tangled strings." />
      <div className="space-y-4 px-4 py-4 sm:px-5">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text-primary">Handle</span>
          <input
            value={handle}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="alice.bsky.social"
            autoFocus
            disabled={isPending}
            className="w-full rounded-lg border border-stroke-subtle bg-field-01 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-stroke-strong" />
        </label>
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-xs text-text-secondary">
            Writer opens your browser and completes the OAuth loopback flow locally.
          </p>
          <Button variant="primary" size="sm" disabled={isDisabled} onClick={submit}>
            {isPending ? "Connecting..." : "Connect"}
          </Button>
        </div>
      </div>
    </>
  );
}

function SessionView(
  { session, isPending, onLogout }: { session: AtProtoSession | null; isPending: boolean; onLogout: () => void },
) {
  return (
    <>
      <AuthSheetHeader
        title="Tangled Session"
        description="Your AT Protocol session is ready for Tangled string import and publish." />
      <div className="space-y-3 px-4 py-4 sm:px-5">
        <div className="rounded-lg border border-stroke-subtle bg-layer-02/40 p-3">
          <div className="text-xs uppercase tracking-[0.14em] text-text-secondary">Account</div>
          <div className="mt-1 text-sm font-medium text-text-primary">{session?.handle ?? "Unknown handle"}</div>
          <div className="mt-1 break-all text-xs text-text-secondary">{session?.did ?? "Unknown DID"}</div>
        </div>
        <div className="rounded-lg border border-stroke-subtle bg-layer-02/25 p-3">
          <div className="text-xs uppercase tracking-[0.14em] text-text-secondary">PDS endpoint</div>
          <div className="mt-1 break-all text-xs text-text-primary">{session?.endpoint ?? "Unknown endpoint"}</div>
        </div>
        <div className="flex justify-end">
          <Button variant="dangerGhost" size="sm" disabled={isPending} onClick={onLogout}>
            {isPending ? "Disconnecting..." : "Log Out"}
          </Button>
        </div>
      </div>
    </>
  );
}

export function AtProtoAuthSheet({ mode, session, isPending, onClose, onLogin, onLogout }: AtProtoAuthSheetProps) {
  return (
    <Sheet
      isOpen={mode !== "closed"}
      onClose={onClose}
      position="r"
      size="md"
      ariaLabel={mode === "session" ? "AT Protocol session" : "AT Protocol login"}
      className="right-4 top-14 bottom-4 rounded-xl border shadow-xl"
      backdropClassName="bg-black/30">
      <section className="flex h-full min-h-0 flex-col overflow-hidden bg-layer-01">
        {mode === "session"
          ? <SessionView session={session} isPending={isPending} onLogout={onLogout} />
          : <LoginView isPending={isPending} onLogin={onLogin} />}
      </section>
    </Sheet>
  );
}
