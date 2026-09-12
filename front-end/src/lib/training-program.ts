export const TRAINING_PROGRAMS = {
  en: {
    locale: "en" as const,
    title: "Piano Training Program",
    description: "Etude Academy piano training program",
    fileHref: "/training/en.pdf#toolbar=0",
  },
  fa: {
    locale: "fa" as const,
    title: "برنامه آموزشی پیانو",
    description: "برنامه آموزشی پیانو آکادمی اتود",
    fileHref: "/training/fa.pdf#toolbar=0",
  },
};

export type TrainingLocale = keyof typeof TRAINING_PROGRAMS;

export function isTrainingLocale(value: string): value is TrainingLocale {
  return value === "en" || value === "fa";
}
