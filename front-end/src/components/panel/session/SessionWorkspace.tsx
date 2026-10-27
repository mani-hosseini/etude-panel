"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { AttachmentGallery } from "@/components/panel/session/AttachmentGallery";
import { ExerciseGallery } from "@/components/panel/session/ExerciseGallery";
import { SlideDeck } from "@/components/slides/SlideDeck";
<<<<<<< HEAD
import type { SessionAttachment, SessionHomeworkItem } from "@/lib/api/types";
=======
import type { SessionAttachment, SessionExercise } from "@/lib/api/types";
>>>>>>> origin/main
import type { Slide } from "@/lib/session-1-slides";

export type SessionWorkspaceView = "slides" | "attachments" | "exercises";

type SessionWorkspaceProps = {
  view: SessionWorkspaceView;
  slides: Slide[];
  attachments: SessionAttachment[];
  exercises: SessionExercise[];
  sessionLabel: string;
  sessionId: string;
  courseId?: string;
  playHref: string;
  backHref: string;
  homeworkTitle?: string;
  homeworkSource?: string;
  homeworkNote?: string;
  homework?: SessionHomeworkItem[];
  absent?: boolean;
};

export function SessionWorkspace({
  view,
  slides,
  attachments,
  exercises,
  sessionLabel,
  sessionId,
  courseId,
  playHref,
  backHref,
  homeworkTitle,
  homeworkSource,
  homeworkNote,
  homework,
  absent,
}: SessionWorkspaceProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="overflow-clip rounded-3xl border border-border shadow-soft">
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
              playHref={playHref}
              backHref={backHref}
            />
          ) : view === "exercises" ? (
            <ExerciseGallery
              exercises={exercises}
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
              homeworkTitle={homeworkTitle}
              homeworkSource={homeworkSource}
              homeworkNote={homeworkNote}
              homework={homework}
              absent={absent}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
