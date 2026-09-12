import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  TRAINING_PROGRAMS,
  isTrainingLocale,
} from "@/lib/training-program";

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "fa" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isTrainingLocale(locale)) return {};
  const program = TRAINING_PROGRAMS[locale];
  return {
    title: program.title,
    description: program.description,
    icons: {
      icon: [{ url: "/favicon.png", type: "image/png" }],
      apple: [{ url: "/apple-icon.png", type: "image/png" }],
    },
  };
}

export default async function TrainingProgramPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isTrainingLocale(locale)) notFound();
  const program = TRAINING_PROGRAMS[locale];

  return (
    <div
      lang={program.locale}
      dir={program.locale === "fa" ? "rtl" : "ltr"}
      className="h-dvh bg-background"
    >
      <iframe
        title={program.title}
        src={program.fileHref}
        className="h-full w-full border-0"
      />
    </div>
  );
}
