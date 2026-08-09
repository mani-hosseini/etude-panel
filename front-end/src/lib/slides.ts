import type { ApiSlide } from "@/lib/api/types";
import type { Slide } from "@/lib/session-1-slides";

export function toDeckSlides(slides: ApiSlide[]): Slide[] {
  return slides.map((slide) => ({
    id: slide.id,
    chapter: slide.chapter,
    title: slide.title,
    goal: slide.goal,
    body: slide.body,
    bullets: slide.bullets,
    terms: slide.terms,
    mistakes: slide.mistakes,
    imageHint: slide.imageHint,
    imageId: slide.imageId,
    funFact: slide.funFact,
    kind: slide.kind,
  }));
}
