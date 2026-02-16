type MissingLocation = { location_id: number; path: string };
type Conflict = { location_id: number; rel_path: string; conflict_filename: string };

type BackendAlertsProps = {
  missingLocations: MissingLocation[];
  conflicts: Conflict[];
};

export function BackendAlerts({ missingLocations, conflicts }: BackendAlertsProps) {
  return (
    <>
      {missingLocations.length > 0 && (
        <div className="fixed bottom-8 right-8 bg-support-error text-white px-4 py-3 rounded-md shadow-xl z-50 max-w-[400px]">
          <strong>Missing Locations</strong>
          <p className="mt-1 text-[0.8125rem]">
            {missingLocations.length} location(s) could not be found. They may have been moved or deleted.
          </p>
        </div>
      )}

      {conflicts.length > 0 && (
        <div
          className={`fixed right-8 bg-accent-yellow text-bg-primary px-4 py-3 rounded-md shadow-xl z-50 max-w-[400px] ${
            missingLocations.length > 0 ? "bottom-[120px]" : "bottom-8"
          }`}>
          <strong>Conflicts Detected</strong>
          <p className="mt-1 text-[0.8125rem]">{conflicts.length} file(s) have conflicts that need attention.</p>
        </div>
      )}
    </>
  );
}
