import { Plane } from "lucide-react";
import { C } from "./jourzy-theme";

export type FlightPick = {
  label: string; airline: string; flightNumber: string; price: number;
  transfers: number; durationMinutesOut?: number; departureAt: string; returnAt?: string;
  why?: string; budgetLeftAfter?: number; pointsNote?: string;
};
export type FlightSuggestion = { picks: FlightPick[]; honestNote?: string; bookVia?: string };

function formatDuration(minutes?: number) {
  if (!minutes && minutes !== 0) return null;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return `${h}h${m ? ` ${m}m` : ""}`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function stopsLabel(transfers: number) {
  return transfers === 0 ? "Nonstop" : `${transfers} stop${transfers > 1 ? "s" : ""}`;
}

export function FlightPicksCard({ suggestion }: { suggestion: FlightSuggestion }) {
  if (!suggestion.picks?.length) return null;

  return (
    <div className="mt-2.5 rounded-2xl p-3.5" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
      <div className="space-y-2.5">
        {suggestion.picks.map((p, i) => {
          const duration = formatDuration(p.durationMinutesOut);
          return (
            <div key={i} className="rounded-xl p-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <div className="flex justify-between items-start gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full"
                  style={{ background: C.greenSoft, color: C.green }}>
                  {p.label}
                </span>
                <div className="font-bold text-base font-serif leading-none" style={{ color: C.ink }}>${p.price}</div>
              </div>

              <div className="flex items-center gap-1.5 text-sm font-bold mt-1.5" style={{ color: C.ink }}>
                <Plane size={12} style={{ color: C.sub }} />
                {p.airline} {p.flightNumber}
              </div>
              <div className="text-xs mt-0.5" style={{ color: C.sub }}>
                {stopsLabel(p.transfers)}{duration ? ` · ${duration}` : ""} · departs {formatDate(p.departureAt)}
                {p.returnAt ? ` · returns ${formatDate(p.returnAt)}` : ""}
              </div>

              {p.why && <div className="text-xs mt-1.5 leading-relaxed" style={{ color: C.ink }}>{p.why}</div>}
              {typeof p.budgetLeftAfter === "number" && (
                <div className="text-xs mt-1" style={{ color: C.green }}>${p.budgetLeftAfter} left of your budget after this</div>
              )}
              {p.pointsNote && <div className="text-xs mt-1 italic" style={{ color: C.sub }}>{p.pointsNote}</div>}
            </div>
          );
        })}
      </div>

      {suggestion.honestNote && (
        <div className="text-xs mt-2.5 leading-relaxed" style={{ color: C.sub }}>{suggestion.honestNote}</div>
      )}
      {suggestion.bookVia && (
        <div className="text-xs mt-1.5 font-bold" style={{ color: C.ink }}>Book via: {suggestion.bookVia}</div>
      )}
    </div>
  );
}
