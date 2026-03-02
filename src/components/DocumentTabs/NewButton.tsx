import { Button } from "$components/Button";
import {
  EMPTY_NEW_DOC_ANIMATE,
  EMPTY_NEW_DOC_INITIAL,
  EMPTY_NEW_DOC_TRANSITION,
  NO_MOTION_TRANSITION,
} from "$constants";
import { PlusIcon } from "$icons";
import { formatShortcut } from "$utils/shortcuts";
import { motion } from "motion/react";

type TransitionType = typeof EMPTY_NEW_DOC_TRANSITION | typeof NO_MOTION_TRANSITION;

type NewButtonProps = { onNewDocument?: () => void; hasTabs: boolean; transition: TransitionType };

export function NewButton({ onNewDocument, hasTabs, transition }: NewButtonProps) {
  if (onNewDocument && hasTabs) {
    return (
      <div className="sticky right-0 z-10 flex items-center px-2 border-l border-stroke-subtle bg-surface-primary">
        <Button
          variant="iconGhost"
          size="iconMd"
          onClick={onNewDocument}
          className="text-text-secondary hover:text-text-primary"
          title={`New Document (${formatShortcut("Cmd+N")})`}>
          <PlusIcon size="sm" />
        </Button>
      </div>
    );
  }

  if (onNewDocument) {
    return (
      <motion.div initial={EMPTY_NEW_DOC_INITIAL} animate={EMPTY_NEW_DOC_ANIMATE} transition={transition}>
        <Button variant="outline" size="xs" onClick={onNewDocument} className="flex items-center gap-1.5">
          <PlusIcon size="sm" />
          New Document
        </Button>
      </motion.div>
    );
  }

  return null;
}
