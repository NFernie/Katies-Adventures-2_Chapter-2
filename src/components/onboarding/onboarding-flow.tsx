"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { useAuthSession } from "@/components/auth/use-auth-session";
import { Disclaimer } from "@/components/shell/copy";
import { WayfindingBand } from "@/components/shell/wayfinding-band";
import { commitPlanVersion, onboardingRedirectUrl, SignedOutError } from "@/data";
import {
  planEnergyAndTraining,
  WEEKDAYS,
  type DaySetting,
  type DietFlag,
  type EngineResult,
  type GoalType,
  type KitchenFlag,
  type Sex,
  type TrainingSetting,
  type Weekday,
} from "@/engine";

const GOAL_LABEL: Record<GoalType, string> = {
  fat_loss: "Fat loss",
  fat_loss_retain_muscle: "Fat loss, keep muscle",
  recomp: "Recomp",
  maintain: "Maintain",
};

const DIET_STYLE_CHIPS: Array<[DietFlag, string]> = [
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
  ["cook_under_30", "Under 30 min"],
];

const ALLERGY_CHIPS: Array<[DietFlag, string]> = [
  ["allergy_nuts", "Nuts"],
  ["allergy_dairy", "Dairy"],
  ["allergy_gluten", "Gluten"],
  ["allergy_shellfish", "Shellfish"],
  ["allergy_egg", "Egg"],
  ["allergy_soy", "Soy"],
];

const KITCHEN_CHIPS: Array<[KitchenFlag, string]> = [
  ["batch_cook", "Batch-cook"],
  ["leftovers_as_lunch", "Leftovers as lunch"],
  ["eating_out_days", "Eating-out days"],
];

const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const SETTINGS: DaySetting[] = ["rest", "gym", "home", "bands", "bodyweight"];
const SETTING_LABEL: Record<DaySetting, string> = {
  rest: "Rest",
  gym: "Gym",
  home: "Home",
  bands: "Bands",
  bodyweight: "Bodyweight",
};

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function cycleSetting(current: DaySetting): DaySetting {
  const i = SETTINGS.indexOf(current);
  return SETTINGS[(i + 1) % SETTINGS.length] ?? "rest";
}

function formatSafeDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

type Draft = {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number;
  skeletalMuscleMassKg: number;
  goalType: GoalType;
  startOn: string;
  endOn: string;
  targetWeightKg: number;
  dietFlags: DietFlag[];
  kitchenFlags: KitchenFlag[];
  servings: number;
  week: Record<Weekday, DaySetting>;
};

const DRAFT_KEY = "bodyplan.onboarding.draft";

const initialDraft = (): Draft => ({
  sex: "female",
  birthDate: "1994-11-02",
  heightCm: 165,
  weightKg: 72,
  bodyFatPct: 28,
  skeletalMuscleMassKg: 26,
  goalType: "fat_loss_retain_muscle",
  startOn: todayIso(),
  endOn: addDaysIso(todayIso(), 84),
  targetWeightKg: 66,
  dietFlags: ["vegetarian"],
  kitchenFlags: ["batch_cook"],
  servings: 1,
  week: {
    mon: "gym",
    tue: "home",
    wed: "bands",
    thu: "bodyweight",
    fri: "gym",
    sat: "bands",
    sun: "rest",
  },
});

type StoredOnboarding = { draft: Draft; step: number };

function readStoredOnboarding(): StoredOnboarding | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredOnboarding;
    if (!parsed?.draft?.week) return null;
    return parsed;
  } catch {
    return null;
  }
}

function trainDayCount(week: Draft["week"]): number {
  return WEEKDAYS.filter((day) => week[day] !== "rest").length;
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-11 rounded-full border-[1.5px] border-iron px-3.5 font-semibold ${
        pressed ? "bg-iron text-chalk" : "bg-transparent text-iron"
      }`}
    >
      {children}
    </button>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  inputMode = "decimal",
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  inputMode?: "decimal" | "numeric";
}) {
  return (
    <label className="mt-4 block font-sans text-[14px] font-semibold" htmlFor={id}>
      {label}
      <input
        id={id}
        className="mt-1.5 min-h-12 w-full rounded-[4px] border border-iron bg-white px-3 font-sans text-[1.15rem] font-semibold text-live tabular-nums"
        inputMode={inputMode}
        required
        value={Number.isFinite(value) ? String(value) : ""}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function toggleFlag<T extends string>(list: T[], flag: T): T[] {
  return list.includes(flag) ? list.filter((item) => item !== flag) : [...list, flag];
}

export function OnboardingFlow() {
  const router = useRouter();
  const { status } = useAuthSession();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  const trainDays = trainDayCount(draft.week);

  const engineInput = useMemo(
    () => ({
      body: {
        sex: draft.sex,
        birthDate: draft.birthDate,
        heightCm: draft.heightCm,
        weightKg: draft.weightKg,
        bodyFatPct: draft.bodyFatPct,
        skeletalMuscleMassKg: draft.skeletalMuscleMassKg,
      },
      goal: {
        type: draft.goalType,
        startOn: draft.startOn,
        endOn: draft.endOn,
        targetWeightKg: draft.goalType === "maintain" ? null : draft.targetWeightKg,
        weeklyLossCapPct: 1,
      },
      prefs: {
        trainingWeek: draft.week,
        dietFlags: draft.dietFlags,
        kitchenFlags: draft.kitchenFlags,
        servings: draft.servings,
      },
    }),
    [draft],
  );

  const preview: EngineResult | { ok: false; form: string } = useMemo(() => {
    if (trainDays < 1) return { ok: false, form: "Pick at least one train day." };
    try {
      return planEnergyAndTraining(engineInput);
    } catch (error) {
      return {
        ok: false,
        form: error instanceof Error ? error.message : "Could not preview this plan.",
      };
    }
  }, [engineInput, trainDays]);

  const blocked = preview.ok === false && "block" in preview ? preview.block : null;
  const success = preview.ok === true ? preview : null;

  function goNext() {
    setMessage(null);
    if (step === 4 && trainDays < 1) {
      setMessage("Pick at least one train day.");
      return;
    }
    if (step === 3 && blocked) {
      setDraft((current) => ({
        ...current,
        endOn: blocked.fastestSafeEndOn,
      }));
      return;
    }
    if (step < 5) setStep((current) => current + 1);
  }

  async function generate() {
    if (!success) return;
    if (status !== "signed-in") {
      setMessage("Sign in with the magic link to save this plan.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await commitPlanVersion({
        profile: {
          sex: draft.sex,
          birthDate: draft.birthDate,
          heightCm: draft.heightCm,
          weightKg: draft.weightKg,
          bodyFatPct: draft.bodyFatPct,
          skeletalMuscleMassKg: draft.skeletalMuscleMassKg,
          dietFlags: draft.dietFlags,
          kitchenFlags: draft.kitchenFlags,
          servings: draft.servings,
        },
        trainingDays: WEEKDAYS.flatMap((weekday) => {
          const setting = draft.week[weekday];
          if (setting === "rest") return [];
          return [{ weekday, setting: setting as TrainingSetting }];
        }),
        goal: engineInput.goal,
        result: success,
        generatorInput: JSON.parse(JSON.stringify(engineInput)),
      });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* private mode */
      }
      router.push("/");
    } catch (error) {
      if (error instanceof SignedOutError) {
        setMessage("Sign in with the magic link to save this plan.");
      } else {
        setMessage(error instanceof Error ? error.message : "Could not save the plan.");
      }
    } finally {
      setBusy(false);
    }
  }

  const titles = ["You", "From the machine", "Aim", "Kitchen and training", "This plan"];

  useEffect(() => {
    const id = window.setTimeout(() => {
      const stored = readStoredOnboarding();
      if (stored) {
        setDraft(stored.draft);
        if (stored.step >= 1 && stored.step <= 5) setStep(stored.step);
      }
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, step }));
    } catch {
      /* private mode */
    }
  }, [draft, step, draftReady]);
  const bandLabel =
    step === 5
      ? busy
        ? "Saving…"
        : "Generate my plan"
      : step === 3 && blocked
        ? "Use fastest safe date"
        : step === 4 && trainDays < 1
          ? "Pick at least one train day"
          : "Continue";

  const bandDisabled =
    busy || (step === 4 && trainDays < 1) || (step === 5 && !success);

  function onBand() {
    if (step === 5) void generate();
    else goNext();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-sans text-[13px] font-semibold text-iron-2">
          {step} of 5
        </p>
        <button
          type="button"
          className="min-h-11 min-w-11 px-2 font-sans text-[14px] font-semibold"
          onClick={() => {
            if (step > 1) setStep((current) => current - 1);
            else router.push("/");
          }}
        >
          Back
        </button>
      </div>
      <h1 className="mt-1 font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
        {titles[step - 1]}
      </h1>

      {step === 1 ? (
        <>
          <p className="mt-2 font-sans text-[16px] leading-[1.45] text-iron-2">
            Male or female. Height in centimetres. Sample figures — replace
            with yours.
          </p>
          <p className="mt-4 mb-1.5 font-sans text-[14px] font-semibold text-iron-2">
            Sex
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Sex">
            {(["female", "male"] as const).map((sex) => (
              <Chip
                key={sex}
                pressed={draft.sex === sex}
                onClick={() => setDraft((current) => ({ ...current, sex }))}
              >
                {sex === "female" ? "Female" : "Male"}
              </Chip>
            ))}
          </div>
          <label className="mt-4 block font-sans text-[14px] font-semibold" htmlFor="birth">
            Birth date
            <input
              id="birth"
              type="date"
              required
              value={draft.birthDate}
              onChange={(event) =>
                setDraft((current) => ({ ...current, birthDate: event.target.value }))
              }
              className="mt-1.5 min-h-12 w-full rounded-[4px] border border-iron bg-white px-3 font-sans text-[1.15rem] font-semibold text-live tabular-nums"
            />
          </label>
          <NumberField
            id="height"
            label="Height (cm)"
            value={draft.heightCm}
            onChange={(heightCm) => setDraft((current) => ({ ...current, heightCm }))}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <p className="mt-2 font-sans text-[16px] leading-[1.45] text-iron-2">
            InBody / Tanita (BodyID). Type the printout. No photos.
          </p>
          <div className="mt-4 border border-iron bg-chalk px-3 py-3 shadow-[2px_3px_0_rgba(22,22,22,0.12)]">
            <p className="font-sans text-[12px] font-bold tracking-[0.04em] text-iron-2 uppercase">
              Printout
            </p>
            <NumberField
              id="weight"
              label="Weight (kg)"
              value={draft.weightKg}
              onChange={(weightKg) => setDraft((current) => ({ ...current, weightKg }))}
            />
            <NumberField
              id="bf"
              label="Body fat (%)"
              value={draft.bodyFatPct}
              onChange={(bodyFatPct) =>
                setDraft((current) => ({ ...current, bodyFatPct }))
              }
            />
            <NumberField
              id="smm"
              label="Skeletal muscle mass (kg) — SMM line"
              value={draft.skeletalMuscleMassKg}
              onChange={(skeletalMuscleMassKg) =>
                setDraft((current) => ({ ...current, skeletalMuscleMassKg }))
              }
            />
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <p className="mt-2 font-sans text-[16px] leading-[1.45] text-iron-2">
            Pick one goal. You choose the date. Faster than 1% a week is
            blocked; 0.5% a week is a typical starting pace.
          </p>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Goal type">
            {(Object.keys(GOAL_LABEL) as GoalType[]).map((type) => (
              <Chip
                key={type}
                pressed={draft.goalType === type}
                onClick={() => setDraft((current) => ({ ...current, goalType: type }))}
              >
                {GOAL_LABEL[type]}
              </Chip>
            ))}
          </div>
          {draft.goalType !== "maintain" ? (
            <NumberField
              id="target"
              label="Target weight (kg)"
              value={draft.targetWeightKg}
              onChange={(targetWeightKg) =>
                setDraft((current) => ({ ...current, targetWeightKg }))
              }
            />
          ) : null}
          <label className="mt-4 block font-sans text-[14px] font-semibold" htmlFor="end">
            Target date
            <input
              id="end"
              type="date"
              required
              value={draft.endOn}
              onChange={(event) =>
                setDraft((current) => ({ ...current, endOn: event.target.value }))
              }
              className="mt-1.5 min-h-12 w-full rounded-[4px] border border-iron bg-white px-3 font-sans text-[1.15rem] font-semibold text-live tabular-nums"
            />
          </label>
          {blocked ? (
            <p
              role="alert"
              className="mt-4 border border-alert bg-chalk px-3 py-3 font-sans text-[16px] font-semibold leading-[1.45] text-alert"
            >
              That date is faster than 1% of body weight a week. Fastest safe
              date: {formatSafeDate(blocked.fastestSafeEndOn)}. Slow is allowed;
              faster is not.
            </p>
          ) : null}
        </>
      ) : null}

      {step === 4 ? (
        <>
          <p className="mt-2 font-sans text-[16px] leading-[1.45] text-iron-2">
            Filters the catalog. Mix kit in the same week. Cardio is chosen later
            by the plan.
          </p>
          <p className="mt-4 mb-1.5 font-sans text-[14px] font-semibold text-iron-2">
            Diet
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Diet">
            {DIET_STYLE_CHIPS.map(([flag, label]) => (
              <Chip
                key={flag}
                pressed={draft.dietFlags.includes(flag)}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    dietFlags: toggleFlag(current.dietFlags, flag),
                  }))
                }
              >
                {label}
              </Chip>
            ))}
          </div>
          <p className="mt-4 mb-1.5 font-sans text-[14px] font-semibold text-iron-2">
            Allergies
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Allergies">
            {ALLERGY_CHIPS.map(([flag, label]) => (
              <Chip
                key={flag}
                pressed={draft.dietFlags.includes(flag)}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    dietFlags: toggleFlag(current.dietFlags, flag),
                  }))
                }
              >
                {label}
              </Chip>
            ))}
          </div>
          <p className="mt-4 mb-1.5 font-sans text-[14px] font-semibold text-iron-2">
            Kitchen
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Kitchen">
            {KITCHEN_CHIPS.map(([flag, label]) => (
              <Chip
                key={flag}
                pressed={draft.kitchenFlags.includes(flag)}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    kitchenFlags: toggleFlag(current.kitchenFlags, flag),
                  }))
                }
              >
                {label}
              </Chip>
            ))}
          </div>
          <NumberField
            id="servings"
            label="Servings"
            value={draft.servings}
            inputMode="numeric"
            onChange={(servings) =>
              setDraft((current) => ({
                ...current,
                servings: Math.max(1, Math.round(servings) || 1),
              }))
            }
          />
          <p className="mt-4 font-sans text-[14px] font-semibold text-iron-2">
            This week
          </p>
          <div className="mt-1">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="flex min-h-11 items-center justify-between border-b border-hair"
              >
                <span className="font-sans text-[14px] font-semibold">
                  {WEEKDAY_LABEL[weekday]}
                </span>
                <button
                  type="button"
                  className="min-h-11 min-w-11 px-2 font-sans text-[14px] font-semibold"
                  aria-label={`${WEEKDAY_LABEL[weekday]}: ${SETTING_LABEL[draft.week[weekday]]}. Tap to change.`}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      week: {
                        ...current.week,
                        [weekday]: cycleSetting(current.week[weekday]),
                      },
                    }))
                  }
                >
                  {SETTING_LABEL[draft.week[weekday]]}
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 font-sans text-[14px] leading-snug text-iron-2">
            {trainDays} train day{trainDays === 1 ? "" : "s"} · PAL follows the
            count, not the kit. Tap a day to cycle Rest → Gym → Home → Bands →
            Bodyweight.
          </p>
        </>
      ) : null}

      {step === 5 ? (
        <>
          {success ? (
            <div className="mt-4 border border-iron bg-chalk px-3 py-3 shadow-[2px_3px_0_rgba(22,22,22,0.12)]">
              <div className="flex justify-between border-b border-hair py-2">
                <span className="font-sans text-[12px] font-bold tracking-[0.04em] text-iron-2 uppercase">
                  Energy
                </span>
                <span className="font-display text-[1.6rem] font-bold text-live tabular-nums">
                  {success.energyKcal} kcal
                </span>
              </div>
              <div className="flex justify-between border-b border-hair py-2">
                <span className="font-sans text-[12px] font-bold tracking-[0.04em] text-iron-2 uppercase">
                  Protein
                </span>
                <span className="font-display text-[1.6rem] font-bold text-live tabular-nums">
                  {success.proteinG} g
                </span>
              </div>
              <div className="flex justify-between border-b border-hair py-2">
                <span className="font-sans text-[12px] font-bold tracking-[0.04em] text-iron-2 uppercase">
                  Weeks
                </span>
                <span className="font-display text-[1.6rem] font-bold text-live tabular-nums">
                  {(
                    (Date.parse(`${draft.endOn}T00:00:00Z`) -
                      Date.parse(`${draft.startOn}T00:00:00Z`)) /
                    86400000 /
                    7
                  ).toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-sans text-[12px] font-bold tracking-[0.04em] text-iron-2 uppercase">
                  Training
                </span>
                <span className="font-sans text-[16px] font-semibold">
                  {success.trainingDaysPerWeek} days · mixed week
                </span>
              </div>
            </div>
          ) : blocked ? (
            <p role="alert" className="mt-4 font-sans text-[16px] text-alert">
              That date is unsafe. Go back to Aim and use{" "}
              {formatSafeDate(blocked.fastestSafeEndOn)}.
            </p>
          ) : (
            <p className="mt-4 font-sans text-[16px] text-iron-2">
              {"form" in preview ? preview.form : "Fill the earlier steps."}
            </p>
          )}
          {success?.warnings.includes("below_calorie_floor") ? (
            <p className="mt-3 font-sans text-[14px] text-iron-2">
              Energy is below the usual calorie-floor warning. This is not a
              hard stop.
            </p>
          ) : null}
          <p className="mt-4 font-sans text-[16px] leading-[1.45]">
            {GOAL_LABEL[draft.goalType]}. Meals are placeholders until the USDA
            catalog. Each session uses that day’s setting.
          </p>
          <Disclaimer />
          {status !== "signed-in" ? (
            <div className="mt-4">
              <p className="font-sans text-[16px] leading-[1.45] text-iron-2">
                Email a one-time link to save this plan. Open it on this phone,
                then generate.
              </p>
              <MagicLinkForm
                redirectOnSend={false}
                emailRedirectTo={onboardingRedirectUrl()}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {message ? (
        <p role="alert" className="mt-4 font-sans text-[14px] text-alert">
          {message}
        </p>
      ) : null}

      <WayfindingBand disabled={bandDisabled} onClick={onBand}>
        {bandLabel}
      </WayfindingBand>
    </div>
  );
}
