import { Map } from "lucide-react";
import { C } from "./jourzy-theme";
import { useTranslation } from "../../utils/translations";

const enc = encodeURIComponent;

// Kept in sync with plan-view.tsx's addressOf — a bare neighborhood/district
// string alone (e.g. "Jongno District, Seoul, South Korea") is too vague a
// point for Google Maps' walking directions to resolve and can trigger a
// false "outside our coverage area" error, so pair it with the venue
// name/title when there's no verified address.
function addressOf(entity: any, fallback?: string): string {
  if (entity?.place?.address) return entity.place.address;
  if (entity?.address) return entity.address;
  if (entity?.location && entity?.title && entity.location !== entity.title) return `${entity.title}, ${entity.location}`;
  return entity?.location || entity?.title || fallback || "";
}

export default function DayMap({ stops, hotelName, hotelAddr }: { stops: any[]; hotelName: string; hotelAddr: string }) {
  const { t } = useTranslation();
  if (!stops.length) return (
    <div className="rounded-2xl p-6 text-center text-xs mb-3" style={{ background: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
      {t("plan.nothingPicked")}
    </div>
  );

  const xL = 60, xR = 268, rowH = 64, top = 46;
  const pts = [{ x: xL, y: 20, label: hotelName, isHotel: true },
  ...stops.map((s, i) => ({ x: i % 2 === 0 ? xR : xL, y: top + i * rowH, label: s.title, from: s.travelTimeFromPrevious }))];
  const H = top + stops.length * rowH + 10;
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Real verified addresses, not bare names — a bare venue name is often
  // unresolvable or ambiguous to Google's directions API (it can silently
  // fail or resolve to the wrong place entirely worldwide).
  const stopAddrs = stops.map(s => addressOf(s));
  const routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${enc(hotelAddr)}&destination=${enc(stopAddrs[stopAddrs.length - 1])}${stopAddrs.length > 1 ? `&waypoints=${stopAddrs.slice(0, -1).map(enc).join('|')}` : ''
    }&travelmode=walking`;

  return (
    <div className="rounded-2xl p-3 mb-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      <div className="text-xs font-bold mb-1 px-1" style={{ color: C.ink }}>{t("plan.routeTitle")}</div>
      <svg viewBox={`0 0 330 ${H}`} width="100%" style={{ display: "block" }}>
        <path d={path} fill="none" stroke={C.green} strokeWidth="2.5" strokeDasharray="1 7" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            {i > 0 && p.from && (
              <text x={(p.x + pts[i - 1].x) / 2} y={(p.y + pts[i - 1].y) / 2 - 6}
                fontSize="8.5" fill={C.sub} textAnchor="middle" fontFamily="DM Sans,sans-serif">
                {p.from.split(" (")[0]}
              </text>
            )}
            <circle cx={p.x} cy={p.y} r="12" fill={p.isHotel ? C.ink : C.green} />
            <text x={p.x} y={p.y + 3.5} fontSize={p.isHotel ? 8 : 10} fontWeight="700" fill="#fff" textAnchor="middle"
              fontFamily="DM Sans,sans-serif">{p.isHotel ? "🏨" : i}</text>
            <text x={p.x} y={p.y + 24} fontSize="9" fontWeight="600" fill={C.ink} textAnchor="middle" fontFamily="DM Sans,sans-serif">
              {p.label.length > 24 ? p.label.slice(0, 23) + "…" : p.label}
            </text>
          </g>
        ))}
      </svg>
      <a href={routeUrl} target="_blank" rel="noreferrer"
        className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
        style={{ background: C.green }}>
        <Map size={13} /> {t("plan.openFullRoute")}
      </a>
      <div className="text-center text-xs mt-1.5" style={{ color: C.sub }}>
        {t("plan.opensNavigation")}
      </div>
    </div>
  );
}
