import { Button } from "$components/Button";
import { LibraryIcon } from "$icons";

export const EmptyLocations = ({ onAddLocation }: { onAddLocation: () => void }) => (
  <div className="px-4 py-6 text-center text-text-placeholder text-[0.8125rem]">
    <LibraryIcon size="lg" className="mb-3 opacity-50 mx-auto" />
    <p className="m-0 mb-2">No locations added</p>
    <Button variant="link" onClick={onAddLocation} className="text-xs">Add your first location</Button>
  </div>
);
