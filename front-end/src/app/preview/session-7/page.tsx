"use client";

import { SlideDeck } from "@/components/slides/SlideDeck";
import { slides } from "@/lib/session-7-slides";

export default function Session7PreviewPage() {
  return (
    <SlideDeck
      mode="fullscreen"
      slides={slides}
      sessionLabel="جلسهٔ هفتم"
      backHref="/"
      playHref="/preview/session-7"
    />
  );
}
