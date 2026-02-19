import { ChevronDownIcon, LibraryIcon, SearchIcon } from "../icons";

type AppHeaderBarProps = { onToggleSidebar: () => void; onToggleTopBars: () => void; onOpenSearch: () => void };

const AppTitle = ({ onToggleSidebar }: Pick<AppHeaderBarProps, "onToggleSidebar">) => (
  <div className="flex items-center gap-3">
    <button
      onClick={onToggleSidebar}
      className="w-8 h-8 flex items-center justify-center bg-transparent border-none text-icon-secondary cursor-pointer rounded"
      title="Toggle sidebar (Ctrl+B)">
      <LibraryIcon size="lg" />
    </button>
    <h1 className="m-0 text-[0.9375rem] font-semibold text-text-primary">Writer</h1>
  </div>
);

const SearchRow = ({ onOpenSearch, onToggleTopBars }: Pick<AppHeaderBarProps, "onOpenSearch" | "onToggleTopBars">) => (
  <div className="flex items-center gap-2">
    <button
      onClick={onOpenSearch}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-field-01 border border-border-subtle rounded text-text-secondary text-[0.8125rem] cursor-pointer">
      <SearchIcon size="sm" />
      Search
      <kbd className="px-1.5 py-0.5 bg-layer-02 rounded text-xs font-mono">Ctrl+Shift+F</kbd>
    </button>

    <button
      onClick={onToggleTopBars}
      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-transparent border border-border-subtle rounded text-text-secondary text-[0.8125rem] cursor-pointer"
      title="Hide top bars (Ctrl+Shift+B)">
      <ChevronDownIcon size="sm" />
      Hide Bars
    </button>
  </div>
);

export const AppHeaderBar = ({ onToggleSidebar, onToggleTopBars, onOpenSearch }: AppHeaderBarProps) => (
  <header className="h-[48px] bg-layer-01 border-b border-border-subtle flex items-center justify-between px-4 shrink-0">
    <AppTitle onToggleSidebar={onToggleSidebar} />
    <SearchRow onOpenSearch={onOpenSearch} onToggleTopBars={onToggleTopBars} />
  </header>
);
