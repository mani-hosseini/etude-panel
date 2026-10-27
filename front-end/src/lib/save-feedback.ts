const SAVED_EVENT = "etude:saved";

export function announceSaved(message = "ثبت شد.") {
  if (typeof window === "undefined") return;
  const root = document.scrollingElement ?? document.documentElement;
  root.scrollTo({ top: 0, behavior: "smooth" });
  window.scrollTo({ top: 0, behavior: "smooth" });
  window.dispatchEvent(new CustomEvent(SAVED_EVENT, { detail: message }));
}

export function subscribeSaved(listener: (message: string) => void) {
  const onSave = (event: Event) => {
    const text = (event as CustomEvent<string>).detail;
    listener(text?.trim() ? text : "ثبت شد.");
  };
  window.addEventListener(SAVED_EVENT, onSave);
  return () => window.removeEventListener(SAVED_EVENT, onSave);
}
