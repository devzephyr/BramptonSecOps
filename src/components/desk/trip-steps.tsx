export const FLOW = ["loaded", "rolling", "fifteen_min", "arrived"] as const;

export function TripSteps({ status, labels }: { status: string; labels: Record<string, string> }) {
  const current = status === "delayed" ? 1 : FLOW.indexOf(status as (typeof FLOW)[number]);
  return (
    <ol className="grid grid-cols-4 gap-1">
      {FLOW.map((step, index) => {
        const done = index < current;
        const now = index === current;
        return (
          <li key={step} className="flex flex-col gap-1.5" aria-current={now ? "step" : undefined}>
            <span
              className={`h-1.5 rounded-full ${
                done ? "bg-emerald-500" : now ? (status === "delayed" ? "bg-amber-500" : "bg-primary") : "bg-muted"
              }`}
            />
            <span className={`text-[11px] leading-tight ${now ? "font-semibold" : "text-muted-foreground"}`}>
              {labels[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
