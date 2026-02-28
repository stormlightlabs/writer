import { useBackendEvents } from "$hooks/useBackendEvents";
import { useSkipAnimation } from "$hooks/useMotion";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";

const ALERT_INITIAL = { opacity: 0, y: 12 } as const;
const ALERT_ANIMATE = { opacity: 1, y: 0 } as const;
const ALERT_EXIT = { opacity: 0, y: 8 } as const;
const ALERT_TRANSITION = { duration: 0.18, ease: "easeOut" } as const;
const NO_MOTION_TRANSITION = { duration: 0 } as const;

type AlertTransition = typeof ALERT_TRANSITION | typeof NO_MOTION_TRANSITION;

const MissingLocationsAlert = ({ count, transition }: { count: number; transition: AlertTransition }) => (
  <motion.div
    key="missing-locations"
    initial={ALERT_INITIAL}
    animate={ALERT_ANIMATE}
    exit={ALERT_EXIT}
    transition={transition}
    className="bg-support-error text-white px-4 py-3 rounded-md shadow-xl">
    <strong>Missing Locations</strong>
    <p className="mt-1 text-[0.8125rem]">
      {count} location(s) could not be found. They may have been moved or deleted.
    </p>
  </motion.div>
);

const ConflictsAlert = ({ count, transition }: { count: number; transition: AlertTransition }) => (
  <motion.div
    key="conflicts"
    initial={ALERT_INITIAL}
    animate={ALERT_ANIMATE}
    exit={ALERT_EXIT}
    transition={transition}
    className="bg-accent-yellow text-bg-primary px-4 py-3 rounded-md shadow-xl">
    <strong>Conflicts Detected</strong>
    <p className="mt-1 text-[0.8125rem]">{count} file(s) have conflicts that need attention.</p>
  </motion.div>
);

export const BackendAlerts = () => {
  const { missingLocations, conflicts } = useBackendEvents();
  const skipAnimation = useSkipAnimation();
  const transition = useMemo(() => skipAnimation ? NO_MOTION_TRANSITION : ALERT_TRANSITION, [skipAnimation]);

  const hasMissingLocations = missingLocations.length > 0;
  const hasConflicts = conflicts.length > 0;

  if (!hasMissingLocations && !hasConflicts) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-88">
      <AnimatePresence initial={false}>
        {hasMissingLocations ? <MissingLocationsAlert count={missingLocations.length} transition={transition} /> : null}
        {hasConflicts ? <ConflictsAlert count={conflicts.length} transition={transition} /> : null}
      </AnimatePresence>
    </div>
  );
};
