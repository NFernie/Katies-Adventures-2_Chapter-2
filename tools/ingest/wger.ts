export type MovementPattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "zone2"
  | "intervals";

export type TrainingSetting = "gym" | "home" | "bands" | "bodyweight";

export type CatalogExerciseRow = {
  slug: string;
  title: string;
  pattern: MovementPattern;
  tracks: TrainingSetting[];
  equipment: string[];
  laterality: "bilateral" | "unilateral";
  defaultSets: number;
  defaultReps: string;
  cue: string;
  source?: string;
  sourceUrl?: string;
  license?: string;
};

export type WgerTranslation = {
  language?: number;
  name?: string;
  description?: string;
};

export type WgerExerciseInfo = {
  id?: number;
  uuid?: string;
  category?: { name?: string };
  muscles?: Array<{ name?: string; name_en?: string }>;
  equipment?: Array<{ name?: string }>;
  license?: { short_name?: string; full_name?: string; url?: string };
  translations?: WgerTranslation[];
  ingredients?: unknown;
};

export type MergeExercisesResult = {
  exercises: CatalogExerciseRow[];
  added: string[];
  skipped: string[];
};

const ENGLISH = 2;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function englishTranslation(row: WgerExerciseInfo): WgerTranslation | null {
  const hits = (row.translations ?? []).filter((item) => item.language === ENGLISH);
  return hits[0] ?? null;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function cueFrom(title: string, description: string): string {
  const stripped = stripHtml(description);
  if (stripped.length > 0 && stripped.length <= 90) {
    return /[.!?]$/.test(stripped) ? stripped : `${stripped}.`;
  }
  const first = stripped.split(/[.!?]/)[0]?.trim() ?? "";
  if (first.length > 0 && first.length <= 90) return `${first}.`;
  return `${title}: move with control. Text cue only.`;
}

function jsonArray(values: string[]): string {
  return `[${values.map((value) => JSON.stringify(value)).join(", ")}]`;
}

function equipmentNames(row: WgerExerciseInfo): string[] {
  return (row.equipment ?? [])
    .map((item) => (item.name ?? "").toLowerCase())
    .filter(Boolean);
}

function tracksFromEquipment(names: string[]): TrainingSetting[] {
  const tracks = new Set<TrainingSetting>();
  for (const name of names) {
    if (/band/.test(name)) tracks.add("bands");
    if (/dumbbell|kettlebell/.test(name)) tracks.add("home");
    if (/barbell|cable|machine|bench|rack/.test(name)) tracks.add("gym");
    if (/pull-?up|chin-?up/.test(name)) {
      tracks.add("gym");
      tracks.add("bodyweight");
    }
    if (/none|bodyweight/.test(name)) tracks.add("bodyweight");
  }
  if (tracks.size === 0) tracks.add("gym");
  return [...tracks];
}

function catalogEquipment(names: string[]): string[] {
  const out = new Set<string>();
  for (const name of names) {
    if (/barbell/.test(name)) out.add("barbell");
    else if (/dumbbell/.test(name)) out.add("dumbbell");
    else if (/band/.test(name)) out.add("band");
    else if (/cable/.test(name)) out.add("cable");
    else if (/pull-?up|chin-?up/.test(name)) out.add("bar");
    else if (/none|bodyweight/.test(name)) out.add("none");
  }
  if (out.size === 0) out.add("none");
  return [...out];
}

export function patternFromWger(name: string, category = ""): MovementPattern | null {
  const n = name.toLowerCase();
  const cat = category.toLowerCase();
  if (/lunge|split squat|step[- ]up/.test(n)) return "lunge";
  if (/squat/.test(n)) return "squat";
  if (/deadlift|rdl|hip thrust|good morning|hinge/.test(n)) return "hinge";
  if (/bench|push[- ]?up|chest press|floor press/.test(n)) return "horizontal_push";
  if (/overhead press|shoulder press|pike push/.test(n)) return "vertical_push";
  if (/face pull|pull[- ]?up|chin[- ]?up|pulldown|lat pulldown/.test(n)) {
    return "vertical_pull";
  }
  if (/\brow\b/.test(n) && !/row(ing)? machine|erg/.test(n)) return "horizontal_pull";
  if (cat === "cardio" || /walk|jog|run|bike|cycle/.test(n)) return "zone2";
  return null;
}

export function mapWgerExercise(row: WgerExerciseInfo): CatalogExerciseRow | null {
  if (row.ingredients != null) {
    throw new Error("wger is exercises only");
  }
  const translation = englishTranslation(row);
  const title = translation?.name?.trim();
  if (!title) return null;
  const pattern = patternFromWger(title, row.category?.name ?? "");
  if (!pattern) return null;
  const names = equipmentNames(row);
  const laterality = /one[- ]arm|single[- ]leg|bulgarian|split/.test(title.toLowerCase())
    ? "unilateral"
    : "bilateral";
  return {
    slug: slugify(title),
    title,
    pattern,
    tracks: tracksFromEquipment(names),
    equipment: catalogEquipment(names),
    laterality,
    defaultSets: 3,
    defaultReps: pattern === "zone2" ? "20 min" : "8-12",
    cue: cueFrom(title, translation?.description ?? ""),
    source: "wger",
    sourceUrl: row.id
      ? `https://wger.de/en/exercise/${row.id}/view`
      : "https://wger.de/api/v2/exerciseinfo/",
    license: row.license?.short_name ?? "CC-BY-SA 4",
  };
}

function jsonString(value: unknown): string {
  return JSON.stringify(value);
}

export function formatExercisesJson(rows: CatalogExerciseRow[]): string {
  const blocks = rows.map((row) => {
    const extra: string[] = [];
    if (row.source) extra.push(`    "source": ${jsonString(row.source)}`);
    if (row.sourceUrl) extra.push(`    "sourceUrl": ${jsonString(row.sourceUrl)}`);
    if (row.license) extra.push(`    "license": ${jsonString(row.license)}`);
    const extras = extra.length ? `,\n${extra.join(",\n")}` : "";
    return `  {
    "slug": ${jsonString(row.slug)},
    "title": ${jsonString(row.title)},
    "pattern": ${jsonString(row.pattern)},
    "tracks": ${jsonArray(row.tracks)},
    "equipment": ${jsonArray(row.equipment)},
    "laterality": ${jsonString(row.laterality)},
    "defaultSets": ${row.defaultSets},
    "defaultReps": ${jsonString(row.defaultReps)},
    "cue": ${jsonString(row.cue)}${extras}
  }`;
  });
  return `[\n${blocks.join(",\n")}\n]\n`;
}

export function mergeExercises(
  existing: CatalogExerciseRow[],
  incoming: WgerExerciseInfo[],
): MergeExercisesResult {
  const exercises = existing.map((row) => ({ ...row }));
  const bySlug = new Set(exercises.map((row) => row.slug));
  const added: string[] = [];
  const skipped: string[] = [];

  for (const row of incoming) {
    const mapped = mapWgerExercise(row);
    if (!mapped) {
      skipped.push(String(row.id ?? "unmapped"));
      continue;
    }
    if (bySlug.has(mapped.slug)) {
      skipped.push(mapped.slug);
      continue;
    }
    exercises.push(mapped);
    bySlug.add(mapped.slug);
    added.push(mapped.slug);
  }

  return { exercises, added, skipped };
}
