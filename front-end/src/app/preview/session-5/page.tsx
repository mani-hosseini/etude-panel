"use client";

import { SlideDeck } from "@/components/slides/SlideDeck";
import { slides } from "@/lib/session-5-slides";

export default function Session5PreviewPage() {
  return (
    <SlideDeck
      mode="fullscreen"
      slides={slides}
      sessionLabel="جلسهٔ پنجم"
      backHref="/"
      playHref="/preview/session-5"
    />
  );
}
