"use client";

import { SlideDeck } from "@/components/slides/SlideDeck";
import { slides } from "@/lib/session-3-slides";

export default function Session3PreviewPage() {
  return (
    <SlideDeck
      mode="fullscreen"
      slides={slides}
      sessionLabel="جلسهٔ سوم"
      backHref="/"
      playHref="/preview/session-3"
    />
  );
}
