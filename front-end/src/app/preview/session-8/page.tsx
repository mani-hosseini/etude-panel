"use client";

import { SlideDeck } from "@/components/slides/SlideDeck";
import { slides } from "@/lib/session-8-slides";

export default function Session8PreviewPage() {
  return (
    <SlideDeck
      mode="fullscreen"
      slides={slides}
      sessionLabel="جلسهٔ هشتم"
      backHref="/"
      playHref="/preview/session-8"
    />
  );
}
