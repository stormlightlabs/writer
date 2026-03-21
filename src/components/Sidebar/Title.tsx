export const Title = ({ isLoading }: { isLoading: boolean }) => (
  <span className="text-[0.6875rem] inline-flex gap-2 uppercase tracking-[0.05rem] text-text-secondary">
    Library
    {isLoading && <span className="opacity-60">(loading...)</span>}
  </span>
);
