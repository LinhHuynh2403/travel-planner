import { useState } from "react";
import { Map, Star, AlertTriangle, Clock, Camera, X, Wallet, ChevronRight, Sparkles, Cloud, CloudRain, CloudSun, Sun, CloudSnow, CloudLightning, Wind, Droplets, Thermometer, UtensilsCrossed, Landmark, Palette, Image as ImageIcon, Leaf, ShoppingBag, Compass, BedDouble, MapPin, NotebookText } from "lucide-react";
import { C, display, font } from "./jourzy-theme";
import MemorySheet from "./memory-sheet";
import { useLiveWeatherWeek } from "../../utils/live-weather";
import { formatTemp, windUnitLabel } from "../../utils/units";
import { useTranslation } from "../../utils/translations";

// Real line icons instead of platform emoji — the emoji set (🍜⛩️🛌 etc.)
// rendered inconsistently across OSes and read as decorative/childish rather
// than as a real app's category system.
const CAT_ICON: Record<string, any> = {
  food: UtensilsCrossed, culture: Landmark, museum: Palette, exhibition: ImageIcon,
  nature: Leaf, shopping: ShoppingBag, activity: Compass, rest: BedDouble,
};
const WEATHER_ICON: Record<string, any> = { sunny: Sun, partly: CloudSun, cloudy: Cloud, rainy: CloudRain, snowy: CloudSnow, stormy: CloudLightning };
const enc = encodeURIComponent;

// A verified address is always preferred over a bare name — bare names are
// what caused Google Maps to fail to resolve routes or silently fall back to
// the browser's live location instead of the intended origin.
export function addressOf(entity: any, fallback?: string): string {
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

// Catmull-Rom -> cubic bezier, so the hourly trend reads as one continuous
// curve (like iOS Weather's graph) instead of a jagged point-to-point line.
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

const HOUR_LABEL = ["12a", "3a", "6a", "9a", "12p", "3p", "6p", "9p"];

function hour12Label(h: number): string {
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${period}`;
}

export default function PlanView({ tripData, onSaveMemory }: { tripData: any, onSaveMemory: (row: any) => void }) {
  const { t } = useTranslation();
  const [day, setDay] = useState(0);
  const [showCostDetail, setShowCostDetail] = useState(false);
  const [showHotelDetail, setShowHotelDetail] = useState(false);
  const [weatherDayIdx, setWeatherDayIdx] = useState<number | null>(null);
  const [memoryForIdx, setMemoryForIdx] = useState<number | null>(null);

  // Real forecast wins the moment it loads; the AI's seasonal-typical guess
  // (weatherWeek) is only a placeholder until then — same precedent as
  // prep-view.tsx, which this weather strip replaces.
  const liveWeather = useLiveWeatherWeek(tripData?.plan?.region || "");
  const weather = (liveWeather && liveWeather.length > 0) ? liveWeather : (tripData?.insights?.weatherWeek || []);

  const d = tripData?.days?.[day];
  if (!d) return <div className="p-4">{t("plan.noItineraryData")}</div>;

  const hotel = tripData.hotelRecommendation;
  const hotelAddr = hotel ? addressOf(hotel, tripData.plan?.region) : tripData.plan?.region;
  const airportName = tripData.logisticsGuide?.airportName;

  const uidFor = (a: any, idx: number) => a.id || `${day}-${idx}`;
  const memoryFor = (dayNumber: number, activityIndex: number) =>
    (tripData.memories || []).find((m: any) => m.day_number === dayNumber && m.activity_index === activityIndex);

  const dayTotal = (d.activities || []).reduce((sum: number, raw: any) => sum + (raw.cost || 0), 0);

  return (
    <div className="px-4">
      {hotel && (
        <button onClick={() => setShowHotelDetail(true)}
          className="w-full flex items-center gap-3 rounded-jz-card p-3.5 mb-3 text-left text-white"
          style={{ background: "#22283A" }}>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] opacity-70 uppercase">{t("plan.yourBase")}</div>
            <div className="text-sm font-bold truncate" style={{ ...display }}>{hotel.name}</div>
          </div>
          {hotel.pricePerNight && (
            <div className="text-xs font-bold opacity-90 shrink-0">${hotel.pricePerNight}{t("ui.perNight")}</div>
          )}
          <ChevronRight size={16} className="opacity-50 shrink-0" />
        </button>
      )}

      {weather.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto jz-scroll pb-0.5">
          {weather.slice(0, tripData.days.length).map((w: any, i: number) => {
            const Icon = WEATHER_ICON[w.icon] || Cloud;
            return (
              <button key={i} onClick={() => setWeatherDayIdx(i)}
                className="flex-1 min-w-[64px] flex flex-col items-center justify-center p-2 rounded-2xl shrink-0"
                style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="text-[10px] font-bold" style={{ color: C.sub }}>{t("ui.day")} {i + 1}</div>
                <Icon size={17} color={C.green} className="my-0.5" />
                <div className="text-[11px] font-bold" style={{ color: C.ink }}>{formatTemp(w.hi)} <span style={{ color: C.sub, fontWeight: 600 }}>{formatTemp(w.lo)}</span></div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 mb-3 overflow-x-auto jz-scroll">
        {tripData.days.map((dd: any, i: number) => (
          <button key={i} onClick={() => setDay(i)} className="px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
            style={i === day ? { background: C.green, color: "#fff" } : { background: C.card, color: C.sub, border: `1px solid ${C.line}` }}>
            {t("ui.day")} {i + 1}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
          {d.backupTip && (
            <div className="rounded-jz-card p-3 flex items-start gap-2.5 mb-2" style={{ background: "var(--color-jz-goldTint)", border: "1px solid var(--color-jz-gold)", color: "var(--color-jz-goldInk)" }}>
              <AlertTriangle size={16} className="mt-0.5 shrink-0" color={C.amber} />
              <div className="text-xs font-medium leading-relaxed">
                <span className="font-bold">{t("plan.backupLabel")}</span> {d.backupTip}
              </div>
            </div>
          )}
          {d.activities?.map((a: any, idx: number) => {
            const uid = uidFor(a, idx);
            const memory = memoryFor(d.dayNumber, idx);
            const photoCount = memory?.photos?.length || 0;
            // A caption saved with zero photos is still a real memory — it
            // used to be visually identical to "nothing saved yet" here,
            // which is exactly backwards from what was actually recorded.
            const noteOnly = photoCount === 0 && !!memory?.caption?.trim();
            return (
              <div key={uid} className="rounded-jz-card p-3.5 transition-all cursor-pointer" onClick={() => setMemoryForIdx(idx)}
                style={{ background: C.card, border: `${a.requested ? "2px" : "1px"} solid ${a.requested ? C.green : "transparent"}` }}>
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
                    style={{ background: photoCount > 0 ? "rgba(196, 58, 47, 0.15)" : noteOnly ? "var(--color-jz-goldTint)" : C.greenSoft }}>
                    {(() => { const CatIcon = CAT_ICON[a.category] || MapPin; return <CatIcon size={16} color={photoCount > 0 ? C.hanko : noteOnly ? "var(--color-jz-goldInk)" : C.green} />; })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm" style={{ color: C.ink }}>{a.title}</div>
                    <a href={a.place?.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${enc(addressOf(a))}`}
                      target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                      className="text-xs mt-0.5 block truncate" style={{ color: C.sub }}>
                      {addressOf(a)}
                    </a>
                    {a.requested && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full mt-1.5"
                        style={{ background: C.greenSoft, color: C.green }}>
                        <Sparkles size={10} /> {t("plan.requestedBadge")}
                      </span>
                    )}
                    {a.gem && (
                      <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-1.5"
                        style={{ background: "rgba(196, 58, 47, 0.15)", color: C.hanko }}>{t("plan.localGem")}</span>
                    )}
                    <p className="text-xs mt-1.5 leading-relaxed" style={{ color: C.sub }}>{a.description}</p>
                    {photoCount > 0 ? (
                      <span onClick={(e) => e.stopPropagation()} className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-jz-label font-bold"
                        style={{ background: "var(--color-jz-goldTint)", color: "var(--color-jz-goldInk)" }}>
                        <span className="flex">
                          {memory.photos.slice(0, 3).map((p: any, i: number) => (
                            <span key={i} className="-ml-1.5 first:ml-0 h-5 w-5 rounded-full border-2 bg-cover bg-center"
                              style={{ borderColor: "var(--color-jz-goldTint)", backgroundImage: `url(${p.url})` }} />
                          ))}
                        </span>
                        {t("plan.photoCount").replace("{{n}}", String(photoCount))}
                      </span>
                    ) : noteOnly ? (
                      <span onClick={(e) => e.stopPropagation()} className="mt-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-jz-label font-bold max-w-full"
                        style={{ background: "var(--color-jz-goldTint)", color: "var(--color-jz-goldInk)" }}>
                        <NotebookText size={13} className="shrink-0" />
                        <span className="truncate">{memory.caption}</span>
                      </span>
                    ) : (
                      <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-jz-label font-semibold"
                        style={{ borderColor: C.line, color: C.sub }}>
                        <Camera size={13} /> {t("plan.addAMemory")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {dayTotal > 0 && (
            <button onClick={() => setShowCostDetail(true)} className="w-full rounded-jz-card p-3.5 flex items-center justify-between gap-3 transition-transform active:scale-[0.98]" style={{ background: "#22283A" }}>
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

      {showHotelDetail && hotel && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end" style={{ background: "rgba(20,25,40,0.45)" }} onClick={() => setShowHotelDetail(false)}>
          <div className="rounded-t-jz-card p-5 pb-7" style={{ background: C.paper }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start gap-2 mb-1">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.sub }}>
                  {t("plan.yourBase")} {hotel.neighborhood ? `· ${hotel.neighborhood}` : ""}
                </div>
                <div className="text-lg font-bold" style={{ ...display, color: C.ink }}>{hotel.name}</div>
              </div>
              <button onClick={() => setShowHotelDetail(false)}><X size={18} style={{ color: C.sub }} /></button>
            </div>
            {(hotel.place?.rating || hotel.pricePerNight) && (
              <div className="text-xs mt-1 flex items-center gap-1" style={{ color: C.sub }}>
                {hotel.place?.rating && <><Star size={11} fill="#FFC94D" color="#FFC94D" /> {hotel.place.rating.toFixed(1)}{hotel.pricePerNight ? " • " : ""}</>}
                {hotel.pricePerNight && `$${hotel.pricePerNight}${t("ui.perNight")}`}
              </div>
            )}
            {hotel.reasoning && <p className="text-xs mt-3 leading-relaxed" style={{ color: C.ink }}>{hotel.reasoning}</p>}
            {hotel.checkInNote && (
              <p className="text-xs mt-3 pt-3 leading-relaxed flex gap-1.5" style={{ borderTop: `1px solid ${C.line}`, color: C.sub }}>
                <Clock size={12} className="shrink-0 mt-0.5" />{hotel.checkInNote}
              </p>
            )}
            <a href={day === 0
                ? directionsUrl(airportName || `Airport near ${tripData.plan?.region}`, hotelAddr, "transit")
                : `https://www.google.com/maps/search/?api=1&query=${enc(hotelAddr)}`}
              target="_blank" rel="noreferrer"
              className="mt-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              style={{ background: C.greenSoft, color: C.green }}>
              <Map size={12} /> {day === 0 ? t("plan.directionsToHotel").replace("{{airport}}", airportName || t("plan.airportFallback")) : t("plan.viewHotelOnMap")}
            </a>
          </div>
        </div>
      )}

      {showCostDetail && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end" style={{ background: "rgba(20,25,40,0.45)" }} onClick={() => setShowCostDetail(false)}>
          <div className="rounded-t-jz-card p-5 pb-7" style={{ background: C.paper }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-1">
              <div className="font-bold text-sm" style={{ color: C.ink }}>{t("plan.costBreakdownTitle").replace("{{day}}", String(day + 1))}</div>
              <button onClick={() => setShowCostDetail(false)}><X size={18} style={{ color: C.sub }} /></button>
            </div>
            <div className="text-xs mb-3" style={{ color: C.sub }}>{t("plan.costBreakdownDesc")}</div>
            <div className="space-y-2">
              {d.activities?.map((a: any, idx: number) => {
                const uid = uidFor(a, idx);
                if (!a.cost) return null;
                return (
                  <div key={uid} className="flex justify-between items-center gap-3 rounded-jz-card p-3.5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-bold text-sm" style={{ color: C.ink }}>
                        {a.category && CAT_ICON[a.category] && (() => { const CatIcon = CAT_ICON[a.category]; return <CatIcon size={13} color={C.sub} className="shrink-0" />; })()}
                        {a.title}
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

      {weatherDayIdx !== null && weather[weatherDayIdx] && (() => {
        const w = weather[weatherDayIdx];
        const Icon = WEATHER_ICON[w.icon] || Cloud;
        const pts: number[] | undefined = w.hourlyTemps;
        const sample = pts && pts.length >= 24 ? [0, 3, 6, 9, 12, 15, 18, 21].map(h => pts[h]) : pts;
        const min = sample ? Math.min(...sample) : 0;
        const max = sample ? Math.max(...sample) : 1;
        // topPad reserves headroom for the "H 40°" label above the peak dot;
        // bottomPad keeps the trough dot (and its own label, when the low
        // sits near the very end of the curve) clear of the fill's flat base.
        const chartW = 320, chartH = 60, topPad = 22, bottomPad = 10;
        const svgH = topPad + chartH + bottomPad;
        const stepX = sample && sample.length > 1 ? chartW / (sample.length - 1) : chartW;
        const norm = (v: number) => topPad + chartH - ((v - min) / Math.max(1, max - min)) * chartH;
        const linePts = sample?.map((v, i) => ({ x: i * stepX, y: norm(v) }));
        const curve = linePts ? smoothPath(linePts) : "";
        const fill = linePts ? `${curve} L ${linePts[linePts.length - 1].x},${topPad + chartH} L 0,${topPad + chartH} Z` : "";
        const maxIdx = sample ? sample.indexOf(max) : -1;
        const minIdx = sample ? sample.indexOf(min) : -1;
        return (
          <div className="fixed inset-0 z-30 flex flex-col justify-end" style={{ background: "rgba(20,25,40,0.45)" }} onClick={() => setWeatherDayIdx(null)}>
            <div className="rounded-t-jz-card p-5 pb-7" style={{ background: C.paper }} onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: C.greenSoft }}>
                    <Icon size={26} color={C.green} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.sub }}>{t("ui.day")} {weatherDayIdx + 1}</div>
                    <div className="text-sm font-bold" style={{ color: C.ink }}>{w.note}</div>
                  </div>
                </div>
                <button onClick={() => setWeatherDayIdx(null)} className="shrink-0 mt-0.5"><X size={18} style={{ color: C.sub }} /></button>
              </div>

              <div className="flex items-baseline gap-2 mb-5" style={{ ...font, fontVariantNumeric: "tabular-nums" }}>
                <span className="text-4xl font-bold" style={{ color: C.ink }}>{formatTemp(w.hi)}</span>
                <span className="text-lg font-semibold" style={{ color: C.sub }}>{formatTemp(w.lo)}</span>
              </div>

              {/* Hour-by-hour icon + temp for this specific date, same shape
                  as iOS Weather's hourly strip — the curve below only shows
                  the trend, not what's actually happening each hour. */}
              {w.hourlyTemps && w.hourlyIcons && w.hourlyTemps.length === w.hourlyIcons.length && (
                <div className="flex gap-2 overflow-x-auto jz-scroll mb-5 pb-0.5">
                  {w.hourlyTemps.map((temp: number, i: number) => {
                    const HourIcon = WEATHER_ICON[w.hourlyIcons![i]] || Cloud;
                    return (
                      <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 rounded-xl px-2.5 py-2.5"
                        style={{ background: C.card, border: `1px solid ${C.line}`, minWidth: 46 }}>
                        <div className="text-[10px] font-bold" style={{ color: C.sub }}>{hour12Label(i)}</div>
                        <HourIcon size={16} color={C.green} />
                        <div className="text-xs font-bold" style={{ ...font, fontVariantNumeric: "tabular-nums", color: C.ink }}>{formatTemp(temp)}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {curve && (
                <div className="mb-5">
                  <svg viewBox={`0 0 ${chartW} ${svgH}`} style={{ width: "100%", height: svgH }}>
                    <defs>
                      <linearGradient id="jzWeatherFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.green} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <path d={fill} fill="url(#jzWeatherFill)" stroke="none" />
                    <path d={curve} fill="none" stroke={C.green} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    {/* Highest/lowest points on the plotted curve, called out the
                        same way iOS Weather does — a small dot plus its actual
                        temperature right on the graph, not just in the header. */}
                    {[[maxIdx, "H", C.amber], [minIdx, "L", C.sub]].map(([idx, label, color]: any) =>
                      idx >= 0 && idx !== undefined && (
                        <g key={label}>
                          <circle cx={linePts![idx].x} cy={linePts![idx].y} r={3.2} fill={color} stroke={C.paper} strokeWidth={1.5} />
                          <text x={Math.min(Math.max(linePts![idx].x, 20), chartW - 20)} y={linePts![idx].y - 9}
                            textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="'DM Sans','Helvetica Neue',system-ui,sans-serif" fill={color}>
                            {label} {formatTemp(sample![idx])}
                          </text>
                        </g>
                      )
                    )}
                  </svg>
                  <div className="flex justify-between mt-1.5" style={{ ...font, fontVariantNumeric: "tabular-nums" }}>
                    {HOUR_LABEL.slice(0, sample!.length).map((h, i) => (
                      <span key={i} className="text-[10px] font-semibold" style={{ color: C.sub }}>{h}</span>
                    ))}
                  </div>
                </div>
              )}

              {(w.feelsLike != null || w.windMph != null || w.humidityPct != null || w.cloudPct != null) && (
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    [Thermometer, t("weather.feelsLike"), w.feelsLike != null ? formatTemp(w.feelsLike) : "—"],
                    [Wind, t("weather.wind"), w.windMph != null ? `${w.windMph}${windUnitLabel()}` : "—"],
                    [Droplets, t("weather.humidity"), w.humidityPct != null ? `${w.humidityPct}%` : "—"],
                    [Cloud, t("weather.cloud"), w.cloudPct != null ? `${w.cloudPct}%` : "—"],
                  ].map(([DetailIcon, label, val]: any, i) => (
                    <div key={i} className="rounded-2xl p-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <DetailIcon size={13} color={C.green} />
                        <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: C.sub }}>{label}</div>
                      </div>
                      <div className="text-lg font-bold" style={{ ...font, fontVariantNumeric: "tabular-nums", color: C.ink }}>{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {memoryForIdx !== null && d.activities?.[memoryForIdx] && (
        <MemorySheet
          activity={d.activities[memoryForIdx]}
          dayNumber={d.dayNumber}
          activityIndex={memoryForIdx}
          tripId={tripData.tripId}
          existingMemory={memoryFor(d.dayNumber, memoryForIdx)}
          onSave={(row) => { onSaveMemory(row); setMemoryForIdx(null); }}
          onClose={() => setMemoryForIdx(null)}
        />
      )}
    </div>
  );
}
