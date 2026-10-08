"use client";

import { SlideDeck } from "@/components/slides/SlideDeck";
import { slides } from "@/lib/session-4-slides";

export default function Session4PreviewPage() {
  return (
    <SlideDeck
      mode="fullscreen"
      slides={slides}
      sessionLabel="جلسهٔ چهارم"
      backHref="/"
      playHref="/preview/session-4"
    />
  );
}
