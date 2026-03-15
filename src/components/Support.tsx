import { ExternalLinkIcon, HeartIcon } from "$icons";
import { cn } from "$utils/tw";

type SupportLinkProps = { href: string; label: string; description?: string };

function SupportLink({ href, label, description }: SupportLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center justify-between gap-3 p-3",
        "bg-layer-02 rounded-lg border border-stroke-subtle",
        "hover:bg-layer-03 hover:border-stroke-default",
        "transition-colors group",
      )}>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        {description && <span className="text-xs text-text-secondary">{description}</span>}
      </div>
      <ExternalLinkIcon size="sm" className="text-text-secondary group-hover:text-text-primary shrink-0" />
    </a>
  );
}

type SupportProps = { className?: string };

export function Support({ className }: SupportProps) {
  return (
    <div className={cn("p-4 space-y-4", className)}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-accent-primary/10 rounded-lg">
          <HeartIcon size="lg" className="text-accent-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-text-primary">Support Writer</h3>
          <p className="text-sm text-text-secondary">Help keep the app alive and free</p>
        </div>
      </div>

      <div className="text-sm text-text-primary space-y-3">
        <p>
          <a
            href="https://stormlightlabs.org"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline">
            Stormlight Labs
          </a>{" "}
          is just me,{" "}
          <a
            href="https://github.com/desertthunder"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline">
            Owais
          </a>. Apps like Writer need your support to stay alive and free.
        </p>

        <p>If you find Writer useful, please consider supporting its development through one of the following:</p>
      </div>

      <div className="space-y-2">
        <SupportLink href="https://ko-fi.com/desertthunder" label="Ko-fi" description="Buy me a coffee" />
        <SupportLink
          href="https://github.com/sponsors/desertthunder"
          label="GitHub Sponsors"
          description="Sponsor on GitHub" />
      </div>

      <p className="text-sm text-text-secondary text-center">Thanks for using Writer!</p>
    </div>
  );
}
