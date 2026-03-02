import { useShortcutsByCategory } from "$hooks/useShortcutRegistry";
import { KeyboardShortcut } from "$state/stores/shortcuts";
import { formatKey } from "$utils/shortcuts";
import { cn } from "$utils/tw";

type ShortcutsTabContentProps = { className?: string };

function Shortcut({ shortcut }: { shortcut: KeyboardShortcut }) {
  const keyCounts = new Map<string, number>();
  const keyChips = shortcut.keys.map((key) => {
    const nextCount = (keyCounts.get(key) ?? 0) + 1;
    keyCounts.set(key, nextCount);
    return { key, chipId: `${shortcut.id}:${key}:${nextCount}` };
  });

  return (
    <div className="flex items-start justify-between gap-3 py-2 px-3 bg-layer-02 rounded-md border border-border-subtle">
      <div className="flex min-w-0 flex-col">
        <span className="text-sm text-text-primary">{shortcut.label}</span>
        {shortcut.description && <span className="text-xs text-text-secondary">{shortcut.description}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {keyChips.map((chip, index) => (
          <span key={chip.chipId}>
            <kbd className="px-2 py-1 text-xs font-mono bg-layer-03 border border-border-subtle rounded text-text-primary shadow-sm">
              {formatKey(chip.key)}
            </kbd>
            {index < keyChips.length - 1 && <span className="text-text-secondary mx-0.5">+</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ShortcutsTabContent({ className }: ShortcutsTabContentProps) {
  const shortcutsByCategory = useShortcutsByCategory();
  const sortedCategories = Array.from(shortcutsByCategory.keys()).toSorted((a, b) => a.localeCompare(b));

  if (shortcutsByCategory.size === 0) {
    return (
      <div className={cn("p-4 text-center text-text-secondary", className)}>
        <p>No keyboard shortcuts registered.</p>
        <p className="mt-1 text-xs">Shortcuts appear here as features initialize.</p>
      </div>
    );
  }

  return (
    <div className={cn("p-4", className)}>
      {sortedCategories.map((category) => (
        <section key={category} className="mb-6 last:mb-0">
          <h3 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wide">{category}</h3>
          <div className="space-y-2">
            {shortcutsByCategory.get(category)?.map((shortcut) => <Shortcut key={shortcut.id} shortcut={shortcut} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
