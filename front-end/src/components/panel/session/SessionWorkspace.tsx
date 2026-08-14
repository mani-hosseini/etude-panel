"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { AttachmentGallery } from "@/components/panel/session/AttachmentGallery";
import { SlideDeck } from "@/components/slides/SlideDeck";
import type { SessionAttachment } from "@/lib/api/types";
import type { Slide } from "@/lib/session-1-slides";

export type SessionWorkspaceView = "slides" | "attachments";

type SessionWorkspaceProps = {
  view: SessionWorkspaceView;
  slides: Slide[];
  attachments: SessionAttachment[];
  sessionLabel: string;
  sessionId: string;
  courseId?: string;
  playHref: string;
  backHref: string;
};

export function SessionWorkspace({
  view,
  slides,
  attachments,
  sessionLabel,
  sessionId,
  courseId,
  playHref,
  backHref,
}: SessionWorkspaceProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="overflow-hidden rounded-3xl border border-border shadow-soft">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
        >
          {view === "attachments" ? (
            <AttachmentGallery
              attachments={attachments}
              sessionLabel={sessionLabel}
            />
          ) : (
            <SlideDeck
              mode="embedded"
              slides={slides}
              sessionLabel={sessionLabel}
              sessionId={sessionId}
              courseId={courseId}
              playHref={playHref}
              backHref={backHref}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
