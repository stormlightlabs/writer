export const Title = ({ isLoading }: { isLoading: boolean }) => (
  <h2 className="m-0 text-xs font-semibold uppercase tracking-wider text-text-secondary">
    Library
    {isLoading && <span className="ml-2 opacity-60">(loading...)</span>}
  </h2>
);
