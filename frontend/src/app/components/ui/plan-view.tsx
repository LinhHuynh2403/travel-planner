import { useState } from "react";
import { Train, Footprints, Check, Map, Send, Star, AlertTriangle, Clock, RefreshCw, X } from "lucide-react";
import { C, display } from "./jourzy-theme";
import { Seal } from "./jourzy-seal";
import DayMap from "./day-map";

const CAT_ICON: Record<string, string> = { food: "🍜", culture: "⛩️", museum: "🏛️", exhibition: "🖼️", nature: "🌿", shopping: "🛍️", activity: "✨", rest: "🛌" };
const enc = encodeURIComponent;

// A verified address is always preferred over a bare name — bare names are
// what caused Google Maps to fail to resolve routes or silently fall back to
// the browser's live location instead of the intended origin.
function addressOf(entity: any, fallback?: string): string {
  return entity?.place?.address || entity?.address || entity?.location || entity?.name || entity?.title || fallback || "";
}

function directionsUrl(originAddr: string, destAddr: string, mode: "walking" | "transit" | "driving" = "walking") {
  return `https://www.google.com/maps/dir/?api=1&origin=${enc(originAddr)}&destination=${enc(destAddr)}&travelmode=${mode}`;
}

export default function PlanView({ tripData }: { tripData: any }) {
  const [day, setDay] = useState(0);
  const [view, setView] = useState<"list" | "map">("list");
  const [picked, setPicked] = useState(() => new Set<string>());
  const [swaps, setSwaps] = useState<Record<string, any>>({});
  const [altFor, setAltFor] = useState<string | null>(null);

  const d = tripData?.days?.[day];
  if (!d) return <div className="p-4">No itinerary data.</div>;

  const hotel = tripData.hotelRecommendation;
  const hotelAddr = hotel ? addressOf(hotel, tripData.plan?.region) : tripData.plan?.region;
  const airportName = tripData.logisticsGuide?.airportName;

  const togglePick = (id: string) => setPicked(p => {
    const n = new Set(p);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const uidFor = (a: any, idx: number) => a.id || `${day}-${idx}`;
  const eff = (a: any, uid: string) => swaps[uid] ? { ...a, ...swaps[uid] } : a;

  const doSwap = (uid: string, alt: any) => {
    setSwaps(s => ({ ...s, [uid]: { title: alt.title, description: alt.description, location: alt.location, place: alt.place } }));
    setAltFor(null);
  };

  const swapTargetRaw = altFor ? d.activities.find((a: any, i: number) => uidFor(a, i) === altFor) : null;

  return (
    <div className="px-4">
      {day === 0 && hotel && (
        <div className="rounded-2xl p-4 mb-3 text-white" style={{ background: C.ink }}>
          <div className="flex justify-between items-start gap-2">
            <div>
              <div className="text-xs opacity-70 uppercase">YOUR BASE {hotel.neighborhood ? `· ${hotel.neighborhood}` : ""}</div>
              <div style={{ ...display, fontSize: 19 }}>{hotel.name}</div>
              {(hotel.place?.rating || hotel.pricePerNight) && (
                <div className="text-xs mt-1 opacity-80 flex items-center gap-1">
                  {hotel.place?.rating && <><Star size={11} fill="#FFC94D" color="#FFC94D" /> {hotel.place.rating.toFixed(1)}{hotel.pricePerNight ? " • " : ""}</>}
                  {hotel.pricePerNight && `$${hotel.pricePerNight}/night`}
                </div>
              )}
            </div>
            <Seal show={!!hotel.place?.placeId} />
          </div>
          {hotel.reasoning && <p className="text-xs mt-2 opacity-85 leading-relaxed">{hotel.reasoning}</p>}
          {hotel.checkInNote && (
            <p className="text-xs mt-2 pt-2 leading-relaxed flex gap-1.5 opacity-85" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
              <Clock size={12} className="shrink-0 mt-0.5" />{hotel.checkInNote}
            </p>
          )}
          <a href={directionsUrl(airportName || `Airport near ${tripData.plan?.region}`, hotelAddr, "transit")}
            target="_blank" rel="noreferrer"
            className="mt-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}>
            <Map size={12} /> Directions: {airportName || "Airport"} → hotel
          </a>
        </div>
      )}

      <div className="flex gap-2 mb-3 items-center">
        <div className="flex gap-2 overflow-x-auto jz-scroll flex-1">
          {tripData.days.map((dd: any, i: number) => (
            <button key={i} onClick={() => setDay(i)} className="px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
              style={i === day ? { background: C.green, color: "#fff" } : { background: C.card, color: C.sub, border: `1px solid ${C.line}` }}>
              Day {i + 1}
            </button>
          ))}
        </div>
        <div className="flex rounded-full overflow-hidden shrink-0" style={{ border: `1px solid ${C.line}` }}>
          {[["list", "List"], ["map", "Route"]].map(([k, lbl]) => (
            <button key={k} onClick={() => setView(k as any)} className="px-3 py-1.5 text-xs font-bold"
              style={k === view ? { background: C.ink, color: "#fff" } : { background: C.card, color: C.sub }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {view === "map" && (
        <DayMap
          stops={d.activities.map((a: any, i: number) => eff(a, uidFor(a, i)))}
          hotelName={hotel?.name || "Hotel"}
          hotelAddr={hotelAddr}
        />
      )}

      {view === "list" && (
        <div className="space-y-2.5">
          {d.backupTip && (
            <div className="rounded-2xl p-3 flex items-start gap-2.5 mb-2" style={{ background: "#FDF8E7", border: "1px solid #FDE68A", color: "#92400E" }}>
              <AlertTriangle size={16} className="mt-0.5 shrink-0" color="#D97706" />
              <div className="text-xs font-medium leading-relaxed">
                <span className="font-bold">Backup:</span> {d.backupTip}
              </div>
            </div>
          )}
          {d.activities?.map((raw: any, idx: number) => {
            const uid = uidFor(raw, idx);
            const a = eff(raw, uid);
            const on = picked.has(uid);
            const prevRaw = idx > 0 ? d.activities[idx - 1] : null;
            const prev = prevRaw ? eff(prevRaw, uidFor(prevRaw, idx - 1)) : null;
            const originAddr = prev ? addressOf(prev) : hotelAddr;
            const originLabel = prev ? "from previous stop" : "from hotel";
            const mode = (a.travelTimeFromPrevious || "").toLowerCase().includes("drive") ? "driving" : (a.travelTimeFromPrevious || "").toLowerCase().includes("walk") ? "walking" : "transit";
            return (
              <div key={uid} className="rounded-2xl p-3.5 transition-all" style={{ background: C.card, border: `1px solid ${on ? C.line : "transparent"}`, opacity: on ? 0.45 : 1 }}>
                {a.travelTimeFromPrevious && (
                  <div className="text-xs mb-2 flex items-center gap-1.5 font-medium" style={{ color: C.green }}>
                    {mode === "walking" ? <Footprints size={12} /> : <Train size={12} />} {a.travelTimeFromPrevious} {originLabel}
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => togglePick(uid)} className="w-5 h-5 rounded-md shrink-0 mt-0.5 flex items-center justify-center"
                    style={{ border: `2px solid ${on ? C.green : C.line}`, background: on ? C.green : "transparent" }}>
                    {on && <Check size={13} color="#fff" strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-bold text-sm" style={{ color: C.ink }}>
                        {(a.category && CAT_ICON[a.category]) ? CAT_ICON[a.category] + " " : ""}{a.title}
                      </div>
                      <Seal small show={!!a.place?.placeId} />
                    </div>
                    {a.gem && (
                      <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1.5"
                        style={{ background: "#FBEDEB", color: C.hanko }}>local gem</span>
                    )}
                    <p className="text-xs mt-1.5 leading-relaxed" style={{ color: C.sub }}>{a.description}</p>
                    <div className="flex gap-3 mt-2 text-xs font-bold items-center flex-wrap">
                      <a href={a.place?.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${enc(addressOf(a))}`} target="_blank" rel="noreferrer" className="flex items-center gap-1" style={{ color: C.ink }}>
                        <Map size={11} /> Map
                      </a>
                      <a href={directionsUrl(originAddr, addressOf(a), mode as any)} target="_blank" rel="noreferrer" className="flex items-center gap-1" style={{ color: C.green }}>
                        <Send size={11} /> Directions {originLabel}
                      </a>
                      {raw.alternatives && raw.alternatives.length > 0 && (
                        <button onClick={() => setAltFor(uid)} className="flex items-center gap-1" style={{ color: C.amber }}>
                          <RefreshCw size={11} /> Swap
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="text-center text-xs mt-3 pb-1" style={{ color: C.sub }}>
        Pick what you like — it's a menu, not a schedule.
      </div>

      {altFor && swapTargetRaw && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end" style={{ background: "rgba(20,25,40,0.45)" }} onClick={() => setAltFor(null)}>
          <div className="rounded-t-3xl p-5 pb-7" style={{ background: C.paper }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-1">
              <div className="font-bold text-sm" style={{ color: C.ink }}>Swap "{eff(swapTargetRaw, altFor).title}"</div>
              <button onClick={() => setAltFor(null)}><X size={18} style={{ color: C.sub }} /></button>
            </div>
            <div className="text-xs mb-3" style={{ color: C.sub }}>Verified alternatives nearby.</div>
            <div className="space-y-2">
              {swapTargetRaw.alternatives.map((alt: any, i: number) => (
                <button key={i} onClick={() => doSwap(altFor, alt)}
                  className="w-full text-left rounded-2xl p-3.5 flex justify-between items-center gap-3"
                  style={{ background: C.card, border: `1px solid ${C.line}` }}>
                  <div className="min-w-0">
                    <div className="font-bold text-sm" style={{ color: C.ink }}>{alt.title}</div>
                    {alt.description && <div className="text-xs mt-0.5 truncate" style={{ color: C.sub }}>{alt.description}</div>}
                  </div>
                  <Seal small show={!!alt.place?.placeId} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
