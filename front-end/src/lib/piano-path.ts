import {
  parseStudentLevel,
  STUDENT_LEVEL_STYLE,
  type StudentLevel,
} from "@/lib/student-level";

export const PATH_TRACKS = [
  { key: "technique", label: "تکنیک" },
  { key: "theory", label: "تئوری موسیقی" },
  { key: "solfege", label: "سلفژ" },
  { key: "piece", label: "قطعه" },
] as const;

export type PathTrackKey = (typeof PATH_TRACKS)[number]["key"];

export type PianoLevelCurriculum = {
  level: StudentLevel;
  technique: string;
  theory: string;
  solfege: string;
  pieces: string[];
};

/** برنامه آموزشی پیانو اتود — از تابلوی مسیر سطح‌بندی آکادمی */
export const PIANO_PATH: PianoLevelCurriculum[] = [
  {
    level: 1,
    technique: "درس ۷۴ بایر (Beyer)",
    theory: "فصل ۱ و ۲ کتاب تئوری موسیقی پرویز منصوری",
    solfege: "۱۰ درس اول پوتزولی (Pozzoli)",
    pieces: ["Minuet — Bach", "Secret Garden"],
  },
  {
    level: 2,
    technique: "پایان کتاب بایر · ۱۰ درس اول هانون (Hanon)",
    theory: "فصل ۳ کتاب تئوری موسیقی پرویز منصوری",
    solfege: "۱۰ درس اول فصل اول پوتزولی",
    pieces: ["Für Elise — Beethoven"],
  },
  {
    level: 3,
    technique:
      "درس ۴۰ چرنی (Czerny) · ۳۰ درس اول هانون · صفحه ۵۶ و ۵۷ کتاب گام و آرپژ",
    theory: "فصل ۵ کتاب تئوری موسیقی پرویز منصوری",
    solfege: "۱۰ درس اول فصل اول و ۱۰ درس فصل دوم پوتزولی",
    pieces: [
      "Valse in A minor — Chopin",
      "Prelude in B minor — Chopin",
      "Nocturne 21 یا 19 — Chopin",
    ],
  },
  {
    level: 4,
    technique: "چرنی ۵۹۹ · گام ماژور و آرپژ با هانون · آکورد شکسته گام و آرپژ",
    theory: "فصل ۶ کتاب تئوری موسیقی پرویز منصوری",
    solfege: "پایان فصل اول و ۲۰ درس فصل دوم پوتزولی",
    pieces: ["Ocean of Hope", "Nocturne 1 — Chopin"],
  },
  {
    level: 5,
    technique: "۱۰ درس اول هانون · چرنی ۲۹۹ · بخش دوم کتاب گام و آرپژ",
    theory: "فصل ۱۰ کتاب تئوری موسیقی پرویز منصوری",
    solfege: "پایان کتاب پوتزولی (۱۰ درس سرایش)",
    pieces: [
      "Valse 1 — Chopin",
      "Sonate in C major — Mozart",
      "Invention 4 و 5 — Bach",
    ],
  },
  {
    level: 6,
    technique: "پایان چرنی ۲۹۹ · پایان کتاب گام و آرپژ · هانون",
    theory: "فصل ۱۱ کتاب تئوری موسیقی پرویز منصوری",
    solfege: "پایان کتاب پوتزولی",
    pieces: ["Prelude & Fugue 2 — Bach", "Impromptu Op.90 No.2 — Schubert"],
  },
  {
    level: 7,
    technique: "پایان کتاب چرنی ۲۹۹",
    theory: "فصل ۱۲ کتاب تئوری موسیقی پرویز منصوری (پایان کتاب)",
    solfege: "دشیفر و آوازخوانی مقدماتی",
    pieces: ["Fantaisie-Impromptu — Chopin", "Prelude 2 — Rachmaninoff"],
  },
  {
    level: 8,
    technique: "اتودهای شوپن ۹، ۱۲، ۱۴ و ۲۱",
    theory: "فصل ۱ تا ۲۷ کتاب هارمونی دوبفسکی",
    solfege: "دشیفر و آوازخوانی متوسط",
    pieces: ["Moonlight Sonata — Beethoven", "Toccata and Fugue in D minor — Bach"],
  },
  {
    level: 9,
    technique: "اتودهای شوپن ۲، ۱۳ و ۲۳",
    theory: "فصل ۲۸ تا ۴۵ کتاب هارمونی دوبفسکی",
    solfege: "دشیفر و آوازخوانی پیشرفته",
    pieces: ["La Campanella — Franz Liszt"],
  },
  {
    level: 10,
    technique: "اتودهای شوپن ۱، ۴ و ۵",
    theory: "فصل ۴۶ تا ۶۰ کتاب هارمونی دوبفسکی (پایان کتاب)",
    solfege: "دشیفر قطعات باخ",
    pieces: ["Hungarian Rhapsody No.2 — Franz Liszt"],
  },
];

export const PIANO_PATH_INTRO =
  "مسیر پیمایشی برای تعیین سطح و هدف‌گذاری پیشرفت هنرجو. در هر سطح علاوه بر تکنیک، تئوری موسیقی، سلفژ و توانایی نواختن قطعات مشخص شده است.";

export const PIANO_PATH_CREDIT = {
  curator: "استاد بابک رشیدیان",
  editor: "مهندس علی روشندل",
};

export type TrackProgress = Record<PathTrackKey, number>;

export const TRACK_CATEGORY_MAP: Record<string, PathTrackKey> = {
  تکنیک: "technique",
  هانون: "technique",
  گام: "technique",
  تئوری: "theory",
  "تئوری موسیقی": "theory",
  سلفژ: "solfege",
  قطعه: "piece",
};

export function emptyTracks(): TrackProgress {
  return { technique: 0, theory: 0, solfege: 0, piece: 0 };
}

export function averageTracksFromItems(
  items: Array<{ category: string; score?: number; progress?: number }>,
): TrackProgress {
  const buckets: Record<PathTrackKey, number[]> = {
    technique: [],
    theory: [],
    solfege: [],
    piece: [],
  };
  for (const item of items) {
    const key = TRACK_CATEGORY_MAP[item.category] ?? "technique";
    if ((item.score ?? 0) > 0) buckets[key].push(item.score!);
  }
  const avg = (values: number[]) =>
    values.length === 0
      ? 0
      : Math.round(values.reduce((sum, n) => sum + n, 0) / values.length);
  return {
    technique: avg(buckets.technique),
    theory: avg(buckets.theory),
    solfege: avg(buckets.solfege),
    piece: avg(buckets.piece),
  };
}

export type LevelProgressState = "done" | "current" | "locked";

export function tracksForLevel(
  level: StudentLevel,
  currentLevel: StudentLevel,
  currentTracks?: TrackProgress,
): TrackProgress {
  if (level < currentLevel) {
    return { technique: 100, theory: 100, solfege: 100, piece: 100 };
  }
  if (level > currentLevel) {
    return emptyTracks();
  }
  return currentTracks ?? emptyTracks();
}

export function averageTrackProgress(tracks: TrackProgress): number {
  const values = PATH_TRACKS.map((t) => tracks[t.key]);
  return Math.round(values.reduce((sum, n) => sum + n, 0) / values.length);
}

export function overallPathPercent(
  currentLevel: StudentLevel,
  currentTracks?: TrackProgress,
): number {
  const currentAvg = averageTrackProgress(currentTracks ?? emptyTracks());
  const completed = currentLevel - 1;
  return Math.round(((completed + currentAvg / 100) / 10) * 100);
}

export function levelState(
  level: StudentLevel,
  currentLevel: StudentLevel,
): LevelProgressState {
  if (level < currentLevel) return "done";
  if (level === currentLevel) return "current";
  return "locked";
}

export function curriculumFor(level: StudentLevel): PianoLevelCurriculum {
  return PIANO_PATH[level - 1]!;
}

export function pathChartRows(
  currentLevel: StudentLevel,
  currentTracks?: TrackProgress,
) {
  return PIANO_PATH.map((item) => {
    const tracks = tracksForLevel(item.level, currentLevel, currentTracks);
    return {
      level: item.level,
      label: String(item.level),
      progress: averageTrackProgress(tracks),
      fill: STUDENT_LEVEL_STYLE[item.level].color,
      state: levelState(item.level, currentLevel),
      tracks,
    };
  });
}

export function trackChartRows(tracks: TrackProgress = emptyTracks()) {
  return PATH_TRACKS.map((track) => ({
    key: track.key,
    label: track.label,
    progress: tracks[track.key],
  }));
}

export function resolvePathLevel(
  value: string | number | null | undefined,
): StudentLevel {
  return parseStudentLevel(value);
}
