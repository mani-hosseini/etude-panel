"use client";

import { SlideDeck } from "@/components/slides/SlideDeck";
import { slides } from "@/lib/session-9-slides";

export default function Session9PreviewPage() {
  return (
    <SlideDeck
      mode="fullscreen"
      slides={slides}
      sessionLabel="جلسهٔ نهم"
      backHref="/"
      playHref="/preview/session-9"
    />
  );
}
