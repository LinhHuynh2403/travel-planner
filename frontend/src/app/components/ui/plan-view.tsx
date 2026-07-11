import { useState } from "react";
import { Train, Footprints, Check, Map, Send, Star, AlertTriangle, Clock, RefreshCw, X, Wallet, ChevronRight, Sparkles } from "lucide-react";
import { C, display } from "./jourzy-theme";
import { Seal } from "./jourzy-seal";
import DayMap from "./day-map";
import { useTranslation } from "../../utils/translations";

const CAT_ICON: Record<string, string> = { food: "🍜", culture: "⛩️", museum: "🏛️", exhibition: "🖼️", nature: "🌿", shopping: "🛍️", activity: "✨", rest: "🛌" };
const enc = encodeURIComponent;

// A verified address is always preferred over a bare name — bare names are
// what caused Google Maps to fail to resolve routes or silently fall back to
// the browser's live location instead of the intended origin.
function addressOf(entity: any, fallback?: string): string {
  if (entity?.place?.address) return entity.place.address;
  if (entity?.address) return entity.address;
  // No verified place — a bare neighborhood/district string alone (e.g.
  // "Jongno District, Seoul, South Korea") is too vague a point for Google
  // Maps' walking directions to resolve and can trigger a false "outside our
  // coverage area" error. Pairing it with the venue name/title gives Maps a
  // real, specific string to geocode instead of just an administrative area.
  const name = entity?.name || entity?.title;
  if (entity?.location && name && entity.location !== name) return `${name}, ${entity.location}`;
  return entity?.location || name || fallback || "";
}

function directionsUrl(originAddr: string, destAddr: string, mode: "walking" | "transit" | "driving" = "walking") {
  return `https://www.google.com/maps/dir/?api=1&origin=${enc(originAddr)}&destination=${enc(destAddr)}&travelmode=${mode}`;
}

export default function PlanView({ tripData }: { tripData: any }) {
  const { t } = useTranslation();
  const [day, setDay] = useState(0);
  const [view, setView] = useState<"list" | "map">("list");
  const [picked, setPicked] = useState(() => new Set<string>());
  const [swaps, setSwaps] = useState<Record<string, any>>({});
  const [altFor, setAltFor] = useState<string | null>(null);
  const [showCostDetail, setShowCostDetail] = useState(false);

  const d = tripData?.days?.[day];
  if (!d) return <div className="p-4">{t("plan.noItineraryData")}</div>;

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
  const dayTotal = (d.activities || []).reduce((sum: number, raw: any, idx: number) => sum + (eff(raw, uidFor(raw, idx)).cost || 0), 0);

  return (
    <div className="px-4">
      {hotel && (
        <div className="rounded-2xl p-4 mb-3 text-white" style={{ background: C.ink }}>
          <div className="flex justify-between items-start gap-2">
            <div>
              <div className="text-xs opacity-70 uppercase">{t("plan.yourBase")} {hotel.neighborhood ? `· ${hotel.neighborhood}` : ""}</div>
              <div style={{ ...display, fontSize: 19 }}>{hotel.name}</div>
              {(hotel.place?.rating || hotel.pricePerNight) && (
                <div className="text-xs mt-1 opacity-80 flex items-center gap-1">
                  {hotel.place?.rating && <><Star size={11} fill="#FFC94D" color="#FFC94D" /> {hotel.place.rating.toFixed(1)}{hotel.pricePerNight ? " • " : ""}</>}
                  {hotel.pricePerNight && `$${hotel.pricePerNight}${t("ui.perNight")}`}
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
          <a href={day === 0
              ? directionsUrl(airportName || `Airport near ${tripData.plan?.region}`, hotelAddr, "transit")
              : `https://www.google.com/maps/search/?api=1&query=${enc(hotelAddr)}`}
            target="_blank" rel="noreferrer"
            className="mt-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}>
            <Map size={12} /> {day === 0 ? t("plan.directionsToHotel").replace("{{airport}}", airportName || t("plan.airportFallback")) : t("plan.viewHotelOnMap")}
          </a>
        </div>
      )}

      <div className="flex gap-2 mb-3 items-center">
        <div className="flex gap-2 overflow-x-auto jz-scroll flex-1">
          {tripData.days.map((dd: any, i: number) => (
            <button key={i} onClick={() => setDay(i)} className="px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
              style={i === day ? { background: C.green, color: "#fff" } : { background: C.card, color: C.sub, border: `1px solid ${C.line}` }}>
              {t("ui.day")} {i + 1}
            </button>
          ))}
        </div>
        <div className="flex rounded-full overflow-hidden shrink-0" style={{ border: `1px solid ${C.line}` }}>
          {[["list", t("plan.listView")], ["map", t("plan.routeView")]].map(([k, lbl]) => (
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
          hotelName={hotel?.name || t("plan.hotelFallback")}
          hotelAddr={hotelAddr}
        />
      )}

      {view === "list" && (
        <div className="space-y-2.5">
          {d.backupTip && (
            <div className="rounded-2xl p-3 flex items-start gap-2.5 mb-2" style={{ background: "#FDF8E7", border: "1px solid #FDE68A", color: "#92400E" }}>
              <AlertTriangle size={16} className="mt-0.5 shrink-0" color="#D97706" />
              <div className="text-xs font-medium leading-relaxed">
                <span className="font-bold">{t("plan.backupLabel")}</span> {d.backupTip}
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
            const originLabel = prev ? t("plan.fromPreviousStop") : t("plan.fromHotel");
            const mode = (a.travelTimeFromPrevious || "").toLowerCase().includes("drive") ? "driving" : (a.travelTimeFromPrevious || "").toLowerCase().includes("walk") ? "walking" : "transit";
            return (
              <div key={uid} className="rounded-2xl p-3.5 transition-all" style={{ background: C.card, border: `${a.requested ? "2px" : "1px"} solid ${a.requested && !on ? C.green : (on ? C.line : "transparent")}`, opacity: on ? 0.45 : 1 }}>
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
                    {a.requested && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full mt-1.5"
                        style={{ background: C.greenSoft, color: C.green }}>
                        <Sparkles size={10} /> {t("plan.requestedBadge")}
                      </span>
                    )}
                    {a.gem && (
                      <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1.5"
                        style={{ background: "#FBEDEB", color: C.hanko }}>{t("plan.localGem")}</span>
                    )}
                    <p className="text-xs mt-1.5 leading-relaxed" style={{ color: C.sub }}>{a.description}</p>
                    <div className="flex gap-3 mt-2 text-xs font-bold items-center flex-wrap">
                      <a href={a.place?.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${enc(addressOf(a))}`} target="_blank" rel="noreferrer" className="flex items-center gap-1" style={{ color: C.ink }}>
                        <Map size={11} /> {t("plan.map")}
                      </a>
                      <a href={directionsUrl(originAddr, addressOf(a), mode as any)} target="_blank" rel="noreferrer" className="flex items-center gap-1" style={{ color: C.green }}>
                        <Send size={11} /> {t("plan.directions")} {originLabel}
                      </a>
                      {raw.alternatives && raw.alternatives.length > 0 && (
                        <button onClick={() => setAltFor(uid)} className="flex items-center gap-1" style={{ color: C.amber }}>
                          <RefreshCw size={11} /> {t("plan.swap")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {dayTotal > 0 && (
            <button onClick={() => setShowCostDetail(true)} className="w-full rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-transform active:scale-[0.98]" style={{ background: C.ink }}>
              <div className="flex items-center gap-2.5 text-left">
                <Wallet size={14} className="text-white opacity-80 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-white opacity-80">{t("plan.dayTotalLabel")}</div>
                  <div className="text-[10px] font-medium text-white opacity-50">{t("plan.tapForBreakdown")}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div className="font-bold text-base font-serif text-white">${dayTotal}</div>
                <ChevronRight size={16} className="text-white opacity-50" />
              </div>
            </button>
          )}
        </div>
      )}
      <div className="text-center text-xs mt-3 pb-1" style={{ color: C.sub }}>
        {t("plan.menuNotSchedule")}
      </div>

      {showCostDetail && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end" style={{ background: "rgba(20,25,40,0.45)" }} onClick={() => setShowCostDetail(false)}>
          <div className="rounded-t-3xl p-5 pb-7" style={{ background: C.paper }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-1">
              <div className="font-bold text-sm" style={{ color: C.ink }}>{t("plan.costBreakdownTitle").replace("{{day}}", String(day + 1))}</div>
              <button onClick={() => setShowCostDetail(false)}><X size={18} style={{ color: C.sub }} /></button>
            </div>
            <div className="text-xs mb-3" style={{ color: C.sub }}>{t("plan.costBreakdownDesc")}</div>
            <div className="space-y-2">
              {d.activities?.map((raw: any, idx: number) => {
                const uid = uidFor(raw, idx);
                const a = eff(raw, uid);
                if (!a.cost) return null;
                return (
                  <div key={uid} className="flex justify-between items-center gap-3 rounded-2xl p-3.5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                    <div className="min-w-0">
                      <div className="font-bold text-sm" style={{ color: C.ink }}>
                        {(a.category && CAT_ICON[a.category]) ? CAT_ICON[a.category] + " " : ""}{a.title}
                      </div>
                      {a.description && <div className="text-xs mt-0.5 leading-relaxed" style={{ color: C.sub }}>{a.description}</div>}
                    </div>
                    <div className="font-bold text-sm shrink-0" style={{ color: C.ink }}>${a.cost}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center mt-3 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
              <div className="font-bold text-sm" style={{ color: C.ink }}>{t("plan.total")}</div>
              <div className="font-bold text-base font-serif" style={{ color: C.ink }}>${dayTotal}</div>
            </div>
          </div>
        </div>
      )}

      {altFor && swapTargetRaw && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end" style={{ background: "rgba(20,25,40,0.45)" }} onClick={() => setAltFor(null)}>
          <div className="rounded-t-3xl p-5 pb-7" style={{ background: C.paper }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-1">
              <div className="font-bold text-sm" style={{ color: C.ink }}>{t("plan.swapTitle").replace("{{title}}", eff(swapTargetRaw, altFor).title)}</div>
              <button onClick={() => setAltFor(null)}><X size={18} style={{ color: C.sub }} /></button>
            </div>
            <div className="text-xs mb-3" style={{ color: C.sub }}>{t("plan.verifiedAlternatives")}</div>
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
