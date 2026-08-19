"use client";

import { useEffect, useState, type FormEvent } from "react";

import { MagicLinkForm } from "@/components/auth/magic-link-form";
import {
  MissingSupabaseNote,
  SignedOutEmpty,
} from "@/components/auth/signed-out-empty";
import { useAuthSession } from "@/components/auth/use-auth-session";
import { Disclaimer } from "@/components/shell/copy";
import { Button } from "@/components/ui/button";
import {
  getProfile,
  listTrainingDays,
  replaceTrainingDays,
  signOut,
  upsertProfile,
  type ProfileWrite,
  type TrainingSetting,
  type Weekday,
} from "@/data";

const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};
const SETTINGS: Array<TrainingSetting | "rest"> = [
  "rest",
  "gym",
  "home",
  "bands",
  "bodyweight",
];
const SETTING_LABEL: Record<TrainingSetting | "rest", string> = {
  rest: "Rest",
  gym: "Gym",
  home: "Home",
  bands: "Bands",
  bodyweight: "Bodyweight",
};

type WeekMap = Record<Weekday, TrainingSetting | "rest">;

const emptyWeek = (): WeekMap => ({
  mon: "rest",
  tue: "rest",
  wed: "rest",
  thu: "rest",
  fri: "rest",
  sat: "rest",
  sun: "rest",
});

function cycleSetting(current: TrainingSetting | "rest"): TrainingSetting | "rest" {
  const i = SETTINGS.indexOf(current);
  return SETTINGS[(i + 1) % SETTINGS.length] ?? "rest";
}

export function YouScreen() {
  const { status } = useAuthSession();
  const [form, setForm] = useState<ProfileWrite>({
    sex: "female",
    birthDate: "1990-01-15",
    heightCm: 168,
    weightKg: 72,
    bodyFatPct: 28.5,
    skeletalMuscleMassKg: 26.9,
  });
  const [week, setWeek] = useState<WeekMap>(emptyWeek);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== "signed-in") return;
    let cancelled = false;
    void (async () => {
      try {
        const [profile, days] = await Promise.all([
          getProfile(),
          listTrainingDays(),
        ]);
        if (cancelled) return;
        if (profile) {
          setForm({
            sex: profile.sex,
            birthDate: profile.birthDate.slice(0, 10),
            heightCm: profile.heightCm,
            weightKg: profile.weightKg,
            bodyFatPct: profile.bodyFatPct,
            skeletalMuscleMassKg: profile.skeletalMuscleMassKg,
            bodyFatMassKg: profile.bodyFatMassKg,
            visceralFatLevel: profile.visceralFatLevel,
            visceralFatScale: profile.visceralFatScale,
            totalBodyWaterKg: profile.totalBodyWaterKg,
            dietFlags: profile.dietFlags,
            kitchenFlags: profile.kitchenFlags,
            servings: profile.servings,
          });
        }
        if (days.length > 0) {
          const next = emptyWeek();
          for (const day of days) next[day.weekday] = day.setting;
          setWeek(next);
        }
      } catch {
        if (!cancelled) setMessage("Could not load saved profile.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const trainDays = WEEKDAYS.flatMap((weekday) => {
        const setting = week[weekday];
        return setting === "rest" ? [] : [{ weekday, setting }];
      });
      if (trainDays.length < 1) {
        setMessage("Pick at least one train day.");
        return;
      }
      await upsertProfile(form);
      await replaceTrainingDays(trainDays);
      setMessage("Saved. Hard-refresh should still show these numbers.");
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Save failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <p className="font-sans text-[13px] font-semibold text-iron-2">
        Profile · metric
      </p>
      <h1 className="mt-1 font-display text-[1.85rem] leading-[1.1] font-bold tracking-[-0.03em]">
        You
      </h1>
      {status === "missing-config" ? <MissingSupabaseNote /> : null}
      {status === "signed-out" || status === "loading" ? (
        <>
          <SignedOutEmpty heading="Sign in to save this profile" showCta={false} />
          {status === "signed-out" ? <MagicLinkForm /> : null}
        </>
      ) : null}
      {status === "signed-in" ? (
        <form onSubmit={onSave} className="mt-4">
          <p className="font-sans text-[16px] leading-[1.45] text-iron-2">
            Height, weight, BodyID fields, and the mixed training week save to
            your session owner_id.
          </p>
          <div className="mt-4">
            <p className="mb-1.5 font-sans text-[14px] font-semibold text-iron-2">
              Sex
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Sex">
              {(["female", "male"] as const).map((sex) => (
                <button
                  key={sex}
                  type="button"
                  aria-pressed={form.sex === sex}
                  onClick={() => setForm((current) => ({ ...current, sex }))}
                  className={`min-h-11 rounded-full border-[1.5px] border-iron px-3.5 font-semibold capitalize ${
                    form.sex === sex
                      ? "bg-iron text-chalk"
                      : "bg-transparent text-iron"
                  }`}
                >
                  {sex}
                </button>
              ))}
            </div>
          </div>
          <NumberField
            label="Height (cm)"
            value={form.heightCm}
            onChange={(heightCm) => setForm((current) => ({ ...current, heightCm }))}
          />
          <NumberField
            label="Weight (kg)"
            value={form.weightKg}
            onChange={(weightKg) => setForm((current) => ({ ...current, weightKg }))}
          />
          <NumberField
            label="Body fat (%)"
            value={form.bodyFatPct}
            onChange={(bodyFatPct) =>
              setForm((current) => ({ ...current, bodyFatPct }))
            }
          />
          <NumberField
            label="Skeletal muscle mass (kg)"
            value={form.skeletalMuscleMassKg}
            onChange={(skeletalMuscleMassKg) =>
              setForm((current) => ({ ...current, skeletalMuscleMassKg }))
            }
          />
          <label className="mt-4 block font-sans text-[14px] font-semibold">
            Birth date
            <input
              type="date"
              required
              value={form.birthDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  birthDate: event.target.value,
                }))
              }
              className="mt-1.5 min-h-12 w-full rounded-[4px] border border-iron bg-white px-3 font-sans text-[1.15rem] font-semibold text-live tabular-nums"
            />
          </label>
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
                  className="min-h-11 px-2 font-sans text-[14px] font-semibold"
                  onClick={() =>
                    setWeek((current) => ({
                      ...current,
                      [weekday]: cycleSetting(current[weekday]),
                    }))
                  }
                >
                  {SETTING_LABEL[week[weekday]]}
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 font-sans text-[14px] leading-snug text-iron-2">
            Tap a day to cycle Rest → Gym → Home → Bands → Bodyweight. Rest has
            no row. At least one train day.
          </p>
          <Button type="submit" disabled={busy} className="mt-4 w-full">
            {busy ? "Saving…" : "Save profile"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full"
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
          {message ? (
            <p role="status" className="mt-3 font-sans text-[14px] text-iron-2">
              {message}
            </p>
          ) : null}
        </form>
      ) : null}
      <Disclaimer />
    </main>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mt-4 block font-sans text-[14px] font-semibold">
      {label}
      <input
        className="mt-1.5 min-h-12 w-full rounded-[4px] border border-iron bg-white px-3 font-sans text-[1.15rem] font-semibold text-live tabular-nums"
        inputMode="decimal"
        required
        value={Number.isFinite(value) ? String(value) : ""}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
