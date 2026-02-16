import { LibraryIcon } from "../icons";

export const EmptyLocations = ({ onAddLocation }: { onAddLocation: () => void }) => (
  <div className="px-4 py-6 text-center text-text-placeholder text-[0.8125rem]">
    <LibraryIcon size={32} className="mb-3 opacity-50 mx-auto" />
    <p className="m-0 mb-2">No locations added</p>
    <button
      onClick={onAddLocation}
      className="text-xs text-link-primary bg-transparent border-none cursor-pointer underline underline-offset-2">
      Add your first location
    </button>
  </div>
);
