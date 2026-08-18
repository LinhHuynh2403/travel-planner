import { useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  X, Image as ImageIcon, UtensilsCrossed, Landmark, Palette, Leaf, ShoppingBag, Compass, BedDouble, MapPin, NotebookText,
} from "lucide-react";
import { C, display, font } from "../components/ui/jourzy-theme";
import { tripTile } from "../components/ui/trip-row";
import { useTranslation } from "../utils/translations";

const API_BASE = import.meta.env.VITE_API_URL || "";

// Same real line-icon set as plan-view.tsx/memories-view.tsx's category
// tiles — duplicated locally rather than exported/shared, same precedent
// those two files already set for this small map.
const CAT_ICON: Record<string, any> = {
  food: UtensilsCrossed, culture: Landmark, museum: Palette, exhibition: ImageIcon,
  nature: Leaf, shopping: ShoppingBag, activity: Compass, rest: BedDouble,
};

function dateForDay(arrivalDate: string | undefined, dayNumber: number): Date | null {
  if (!arrivalDate) return null;
  const d = new Date(arrivalDate);
  d.setDate(d.getDate() + (dayNumber - 1));
  return d;
}

type Tile = { url: string | null; caption: string; title: string; icon: any; key: string; kind: "photo" | "note" | "empty" };

// The page a "Share trip" link actually opens — no login, no app shell, just
// the trip's real memories/photos, since that's the whole point of sharing:
// so whoever gets the link can actually see what was shared, not just land
// on JourZy's generic homepage.
export default function SharedTripView() {
  const { tripId } = useParams();
  const { t } = useTranslation();
  const [data, setData] = useState<{ trip: any; days: any[]; memories: any[] } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [lightbox, setLightbox] = useState<Tile | null>(null);

  useEffect(() => {
    if (!tripId) { setNotFound(true); return; }
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/trips/${tripId}/public`);
        if (!resp.ok) { setNotFound(true); return; }
        setData(await resp.json());
      } catch (e) {
        console.error("Failed to load shared trip:", e);
        setNotFound(true);
      }
    })();
  }, [tripId]);

  if (notFound) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center text-center px-6" style={{ background: C.paper, ...font }}>
        <MapPin size={32} style={{ color: C.sub }} className="mb-3" />
        <div className="font-bold text-lg mb-1" style={{ color: C.ink }}>{t("shared.notFoundTitle")}</div>
        <p className="text-sm mb-6" style={{ color: C.sub }}>{t("shared.notFoundBody")}</p>
        <a href="/" className="px-5 py-2.5 rounded-full text-sm font-bold text-white" style={{ background: C.green }}>{t("shared.tryJourzy")}</a>
      </div>
    );
  }

  if (!data) {
    return <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: C.paper }} />;
  }

  const { trip, days, memories } = data;
  const touched = memories.filter((m) => m.visited || (m.photos?.length || 0) > 0);
  const totalPhotos = memories.reduce((sum: number, m: any) => sum + (m.photos?.length || 0), 0);
  const placesCount = touched.length;
  const dayNumbers = Array.from(new Set(touched.map((m: any) => m.day_number))).sort((a: any, b: any) => a - b);
  const categoryFor = (dayNumber: number, activityIndex: number): string | undefined =>
    days?.find((d: any) => d.dayNumber === dayNumber)?.activities?.[activityIndex]?.category;

  return (
    <div className="min-h-[100dvh]" style={{ background: C.paper, ...font }}>
      <div className="max-w-md mx-auto px-4 pt-8 pb-16">
        <div className="text-jz-label font-bold tracking-widest mb-1 uppercase" style={{ color: C.green }}>
          {t("shared.eyebrow")}
        </div>
        <div className="text-jz-hero font-bold mb-1 capitalize" style={{ ...display, color: C.ink }}>
          {trip.region}
        </div>
        <div className="text-jz-label mb-4" style={{ color: C.sub }}>
          {trip.arrival_date && trip.leave_date &&
            `${new Date(trip.arrival_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(trip.leave_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
          {trip.who_traveling ? ` · ${trip.who_traveling}` : ""}
        </div>

        <div className="rounded-jz-card p-4 mb-6" style={{ background: C.greenSoft }}>
          <div className="text-jz-title font-bold capitalize" style={{ color: C.ink }}>{trip.region}</div>
          <div className="mt-1 text-jz-label font-bold" style={{ color: C.green }}>
            {t("memories.statLine").replace("{{n}}", String(totalPhotos)).replace("{{m}}", String(placesCount))}
          </div>
        </div>

        {dayNumbers.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: C.sub }}>{t("shared.noMemoriesYet")}</div>
        ) : (
          dayNumbers.map((dayNumber: any) => {
            const dayMemories = touched.filter((m: any) => m.day_number === dayNumber);
            const date = dateForDay(trip.arrival_date, dayNumber);
            const tiles: Tile[] = dayMemories.flatMap((m: any) => {
              const icon = CAT_ICON[categoryFor(m.day_number, m.activity_index) || ""] || MapPin;
              if ((m.photos?.length || 0) > 0) {
                return m.photos.map((p: any, i: number) => ({
                  url: p.url, caption: p.caption || "", title: m.activity_title, icon, key: `${m.id || dayNumber}-${i}`, kind: "photo" as const,
                }));
              }
              const hasNote = !!m.caption?.trim();
              return [{
                url: null,
                caption: hasNote ? m.caption : t("memories.visitedNoPhoto"),
                title: m.activity_title, icon, key: `${m.id || dayNumber}-novisit`,
                kind: (hasNote ? "note" : "empty") as const,
              }];
            });
            return (
              <div key={dayNumber} className="mb-5">
                <div className="text-[10px] font-bold tracking-widest mb-2" style={{ color: C.sub, textTransform: "uppercase" }}>
                  {date ? date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : `${t("ui.day")} ${dayNumber}`}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {tiles.map((tile) => (
                    <button key={tile.key} onClick={() => setLightbox(tile)}
                      className="rounded-2xl overflow-hidden relative aspect-square flex items-center justify-center"
                      style={
                        tile.kind === "photo" ? undefined
                          : tile.kind === "note" ? { background: C.greenSoft, padding: 8 }
                          : { background: tripTile(tile.title).background }
                      }>
                      {tile.kind === "photo" ? (
                        <img src={tile.url!} alt="" className="w-full h-full object-cover" />
                      ) : tile.kind === "note" ? (
                        <div className="w-full h-full flex flex-col items-start justify-between">
                          <NotebookText size={16} color={C.green} className="shrink-0" />
                          <p className="text-[10px] leading-tight text-left line-clamp-3" style={{ color: C.ink }}>{tile.caption}</p>
                        </div>
                      ) : (
                        <tile.icon size={26} color="#FBF6EC" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,.25))" }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}

        <a href="/" className="w-full mt-4 py-3 rounded-jz-btn font-bold text-white flex items-center justify-center gap-1.5" style={{ background: C.amber }}>
          {t("shared.tryJourzy")}
        </a>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "#0e0d0b" }} onClick={() => setLightbox(null)}>
          <div className="flex justify-end p-4">
            <button onClick={() => setLightbox(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}>
              <X size={15} color="#fff" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden relative">
            {lightbox.url ? (
              <img src={lightbox.url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: tripTile(lightbox.title).background }}>
                <lightbox.icon size={56} color="#FBF6EC" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,.25))" }} />
              </div>
            )}
          </div>
          <div className="p-5 pb-8" style={{ color: "#FBF6EC" }} onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold" style={{ ...display }}>{lightbox.title}</div>
            {lightbox.caption && <div className="text-sm mt-1 opacity-85 leading-relaxed">{lightbox.caption}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
