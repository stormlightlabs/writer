import { Button } from "$components/Button";
import type { AtProtoSession } from "$types";

type AtProtoSectionProps = {
  session: AtProtoSession | null;
  isPending: boolean;
  onOpenAuth: () => void;
  onLogout: () => void;
};

export function AtProtoSection({ session, isPending, onOpenAuth, onLogout }: AtProtoSectionProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-stroke-subtle bg-layer-02/30 p-3">
        <div className="text-sm font-medium text-text-primary">
          {session ? `Connected as ${session.handle}` : "Not connected"}
        </div>
        <p className="m-0 mt-1 text-xs text-text-secondary">
          {session
            ? "Your Tangled session is stored locally and reused across app launches."
            : "Connect an AT Protocol account to publish and import Tangled strings. Standard.Site post import is available without connecting."}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onOpenAuth} disabled={isPending}>
            {session ? "View Session" : "Connect"}
          </Button>
        </div>
        {session && (
          <Button variant="dangerGhost" size="sm" onClick={onLogout} disabled={isPending}>
            {isPending ? "Disconnecting..." : "Log Out"}
          </Button>
        )}
      </div>
    </div>
  );
}
