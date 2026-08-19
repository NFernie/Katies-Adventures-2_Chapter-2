export function PrintoutStrip({
  weight,
  bodyFat,
  smm,
}: {
  weight: string;
  bodyFat: string;
  smm: string;
}) {
  const rows = [
    { k: "Weight", v: weight },
    { k: "Body fat", v: bodyFat },
    { k: "SMM", v: smm },
  ];

  return (
    <div
      aria-label="Latest BodyID"
      className="mb-4 border border-iron bg-chalk px-3 shadow-[2px_3px_0_rgba(22,22,22,0.12)]"
    >
      {rows.map((row) => (
        <div
          key={row.k}
          className="flex items-baseline justify-between border-b border-hair py-2.5 last:border-b-0"
        >
          <span className="font-sans text-[13px] font-semibold text-iron">
            {row.k}
          </span>
          <span className="font-display text-[1.15rem] font-bold text-live tabular-nums">
            {row.v}
          </span>
        </div>
      ))}
    </div>
  );
}
