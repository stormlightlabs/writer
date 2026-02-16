import { LibraryIcon, SearchIcon } from "../icons";

type AppHeaderBarProps = { onToggleSidebar: () => void; onOpenSearch: () => void };

function AppTitle({ onToggleSidebar }: Pick<AppHeaderBarProps, "onToggleSidebar">) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onToggleSidebar}
        className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded"
        title="Toggle sidebar (Ctrl+B)">
        <LibraryIcon size={18} />
      </button>
      <h1 className="m-0 text-[0.9375rem] font-semibold text-text-primary">Writer</h1>
    </div>
  );
}

function SearchRow({ onOpenSearch }: Pick<AppHeaderBarProps, "onOpenSearch">) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onOpenSearch}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-field-01 border border-border-subtle rounded text-text-secondary text-[0.8125rem] cursor-pointer">
        <SearchIcon size={14} />
        Search
        <kbd className="px-1.5 py-0.5 bg-layer-02 rounded text-xs font-mono">Ctrl+Shift+F</kbd>
      </button>
    </div>
  );
}

export function AppHeaderBar({ onToggleSidebar, onOpenSearch }: AppHeaderBarProps) {
  return (
    <header className="h-[48px] bg-layer-01 border-b border-border-subtle flex items-center justify-between px-4 shrink-0">
      <AppTitle onToggleSidebar={onToggleSidebar} />
      <SearchRow onOpenSearch={onOpenSearch} />
    </header>
  );
}
