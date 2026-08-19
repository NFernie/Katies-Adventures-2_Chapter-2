import type { WorkoutSessionRow } from "@/data";

const FOCUS_LABEL: Record<string, string> = {
  full_body: "Full body",
  upper: "Upper",
  lower: "Lower",
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  cardio: "Cardio",
  rest: "Rest",
};

export function focusLabel(focus: string): string {
  return FOCUS_LABEL[focus] ?? focus.replace(/_/g, " ");
}

export function cardioLabel(cardio: WorkoutSessionRow["cardio"] | null | undefined): string {
  if (!cardio || typeof cardio !== "object" || Array.isArray(cardio)) return "";
  const kind = (cardio as { kind?: string }).kind;
  if (kind === "intervals") return "Intervals";
  if (kind === "zone2") return "Zone 2";
  return "";
}

export function sessionHeadline(input: {
  focus: string;
  setting: string;
  cardio?: WorkoutSessionRow["cardio"] | null;
}): string {
  const focus = focusLabel(input.focus);
  const extra = cardioLabel(input.cardio);
  if (input.focus === "rest" && extra) return `${extra} · ${input.setting}`;
  if (input.focus === "cardio") return extra || focus;
  if (extra) return `${focus} + ${extra}`;
  if (input.focus === "rest") return "Rest";
  return `${focus} · ${input.setting}`;
}
