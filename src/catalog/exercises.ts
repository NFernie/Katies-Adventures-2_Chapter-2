import type { CatalogExercise } from "../engine/training";

import rawExercises from "../../data/exercises.json";

type CatalogFileExercise = {
  slug: string;
  title: string;
  pattern: CatalogExercise["pattern"];
  tracks: CatalogExercise["tracks"];
  equipment: string[];
  laterality: CatalogExercise["laterality"];
  defaultSets: number;
  defaultReps: string;
  cue: string;
};

function toCatalog(row: CatalogFileExercise): CatalogExercise | null {
  if (!row.slug || !row.pattern || !row.tracks.length || !row.cue) return null;
  return {
    slug: row.slug,
    title: row.title,
    pattern: row.pattern,
    tracks: row.tracks,
    equipment: row.equipment,
    laterality: row.laterality,
    defaultSets: row.defaultSets,
    defaultReps: row.defaultReps,
    cue: row.cue,
  };
}

export const CATALOG_EXERCISES: CatalogExercise[] = (
  rawExercises as CatalogFileExercise[]
)
  .map(toCatalog)
  .filter((row): row is CatalogExercise => row != null);

export const exerciseCatalogSeeded = CATALOG_EXERCISES.length > 0;
