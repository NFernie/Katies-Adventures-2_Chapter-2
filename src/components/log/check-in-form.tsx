"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { CheckInWrite } from "@/data";

export function CheckInForm({
  defaultDate,
  busy,
  onSave,
}: {
  defaultDate: string;
  busy: boolean;
  onSave: (input: CheckInWrite) => Promise<void>;
}) {
  const [loggedOn, setLoggedOn] = useState(defaultDate);
  const [weightKg, setWeightKg] = useState("");
  const [bodyFatPct, setBodyFatPct] = useState("");
  const [skeletalMuscleMassKg, setSkeletalMuscleMassKg] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="border-t border-iron pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        const weight = Number(weightKg);
        const bodyFat = Number(bodyFatPct);
        const smm = Number(skeletalMuscleMassKg);
        if (![weight, bodyFat, smm].every((value) => Number.isFinite(value) && value > 0)) {
          setMessage("Type today’s BodyID numbers in kg and %.");
          return;
        }
        setMessage(null);
        void onSave({
          loggedOn,
          weightKg: weight,
          bodyFatPct: bodyFat,
          skeletalMuscleMassKg: smm,
        }).then(() => {
          setMessage("Saved.");
        });
      }}
    >
      <label className="mt-2 block font-sans text-[14px] font-semibold" htmlFor="logged-on">
        Check-in date
        <input
          id="logged-on"
          type="date"
          required
          value={loggedOn}
          onChange={(event) => setLoggedOn(event.target.value)}
          className="mt-1.5 min-h-12 w-full rounded-[4px] border border-iron bg-white px-3 font-sans text-[1.15rem] font-semibold text-live tabular-nums"
        />
      </label>
      <NumberField id="cw" label="Today’s weight (kg)" value={weightKg} onChange={setWeightKg} />
      <NumberField id="cbf" label="Body fat (%)" value={bodyFatPct} onChange={setBodyFatPct} />
      <NumberField
        id="csmm"
        label="Skeletal muscle mass (kg)"
        value={skeletalMuscleMassKg}
        onChange={setSkeletalMuscleMassKg}
      />
      <Button type="submit" disabled={busy} className="mt-4 w-full">
        {busy ? "Saving…" : "Save check-in"}
      </Button>
      {message ? (
        <p role="status" className="mt-3 font-sans text-[14px] text-iron-2">
          {message}
        </p>
      ) : null}
    </form>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-4 block font-sans text-[14px] font-semibold" htmlFor={id}>
      {label}
      <input
        id={id}
        inputMode="decimal"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 min-h-12 w-full rounded-[4px] border border-iron bg-white px-3 font-sans text-[1.15rem] font-semibold text-live tabular-nums"
      />
    </label>
  );
}
