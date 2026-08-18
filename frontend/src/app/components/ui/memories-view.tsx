import { useState } from "react";
import { Share2, X, Image as ImageIcon } from "lucide-react";
import { C, display } from "./jourzy-theme";
import { tripTile } from "./trip-row";
import { useTranslation } from "../../utils/translations";

const CAT_ICON: Record<string, string> = { food: "🍜", culture: "⛩️", museum: "🏛️", exhibition: "🖼️", nature: "🌿", shopping: "🛍️", activity: "✨", rest: "🛌" };

function dateForDay(arrivalDate: string | undefined, dayNumber: number): Date | null {
  if (!arrivalDate) return null;
  const d = new Date(arrivalDate);
  d.setDate(d.getDate() + (dayNumber - 1));
  return d;
}

type Tile = { url: string | null; caption: string; title: string; emoji: string; key: string };

export default function MemoriesView({ tripData }: { tripData: any }) {
  const { t } = useTranslation();
  const [shareOpen, setShareOpen] = useState(false);
  const [lightbox, setLightbox] = useState<Tile | null>(null);

  const memories: any[] = tripData.memories || [];
  const touched = memories.filter((m) => m.visited || (m.photos?.length || 0) > 0);
  const totalPhotos = memories.reduce((sum, m) => sum + (m.photos?.length || 0), 0);
  const placesCount = touched.length;

  const dayNumbers = Array.from(new Set(touched.map((m) => m.day_number))).sort((a, b) => a - b);

  const categoryFor = (dayNumber: number, activityIndex: number): string | undefined =>
    tripData.days?.find((d: any) => d.dayNumber === dayNumber)?.activities?.[activityIndex]?.category;

  if (touched.length === 0) {
    return (
      <div className="px-4 pt-6 text-center">
        <ImageIcon size={28} style={{ color: C.sub }} className="mx-auto mb-3" />
        <div className="font-bold text-sm mb-1" style={{ color: C.ink }}>{t("memories.emptyTitle")}</div>
        <div className="text-xs" style={{ color: C.sub }}>{t("memories.emptyBody")}</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4">
      <div className="text-jz-label font-bold tracking-widest mb-1 uppercase" style={{ color: C.green }}>
        {t("memories.eyebrow")}
      </div>
      <div className="text-jz-hero font-bold mb-1 capitalize" style={{ ...display, color: C.ink }}>
        {tripData.plan?.region}
      </div>
      <div className="text-jz-label mb-4" style={{ color: C.sub }}>
        {tripData.plan?.arrivalDate && tripData.plan?.leaveDate &&
          `${new Date(tripData.plan.arrivalDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(tripData.plan.leaveDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
        {tripData.plan?.whoTraveling ? ` · ${tripData.plan.whoTraveling}` : ""}
      </div>

      <div className="rounded-jz-card p-4 mb-5" style={{ background: C.greenSoft }}>
        <div className="text-jz-title font-bold" style={{ color: C.ink }}>{tripData.plan?.region}</div>
        <div className="mt-1 text-jz-label font-bold" style={{ color: C.green }}>
          {t("memories.statLine").replace("{{n}}", String(totalPhotos)).replace("{{m}}", String(placesCount))}
        </div>
      </div>

      <button
        onClick={() => setShareOpen(true)}
        className="w-full py-2.5 rounded-full text-jz-label font-bold flex items-center justify-center gap-1.5 mb-5"
        style={{ background: C.amber, color: "#fff" }}
      >
        <Share2 size={13} /> {t("memories.shareTrip")}
      </button>

      {dayNumbers.map((dayNumber) => {
        const dayMemories = touched.filter((m) => m.day_number === dayNumber);
        const date = dateForDay(tripData.plan?.arrivalDate, dayNumber);
        const tiles: Tile[] = dayMemories.flatMap((m) => {
          const emoji = CAT_ICON[categoryFor(m.day_number, m.activity_index) || ""] || "📍";
          if ((m.photos?.length || 0) > 0) {
            return m.photos.map((p: any, i: number) => ({
              url: p.url, caption: m.caption || "", title: m.activity_title, emoji, key: `${m.id}-${i}`,
            }));
          }
          return [{ url: null, caption: m.caption || t("memories.visitedNoPhoto"), title: m.activity_title, emoji, key: `${m.id}-novisit` }];
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
                  style={tile.url ? undefined : { background: tripTile(tile.title).background }}>
                  {tile.url ? (
                    <img src={tile.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,.25))" }}>{tile.emoji}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}

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
                <span className="text-6xl" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,.25))" }}>{lightbox.emoji}</span>
              </div>
            )}
          </div>
          <div className="p-5 pb-8" style={{ color: "#FBF6EC" }} onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold" style={{ ...display }}>{lightbox.title}</div>
            {lightbox.caption && <div className="text-sm mt-1 opacity-85 leading-relaxed">{lightbox.caption}</div>}
          </div>
        </div>
      )}

      {shareOpen && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end" style={{ background: "rgba(20,25,40,0.45)" }} onClick={() => setShareOpen(false)}>
          <div className="rounded-t-jz-card p-5 pb-7" style={{ background: C.paper }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <div className="font-bold text-sm" style={{ color: C.ink }}>{t("memories.shareTrip")}</div>
              <button onClick={() => setShareOpen(false)}><X size={18} style={{ color: C.sub }} /></button>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "#22283A" }}>
              <div className="text-white font-bold text-lg capitalize" style={{ ...display }}>{tripData.plan?.region}</div>
              {tripData.plan?.arrivalDate && tripData.plan?.leaveDate && (
                <div className="text-xs opacity-70 text-white mt-0.5">
                  {new Date(tripData.plan.arrivalDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {new Date(tripData.plan.leaveDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
              <div className="text-xs font-bold text-white opacity-90 mt-2">
                {t("memories.statLine").replace("{{n}}", String(totalPhotos)).replace("{{m}}", String(placesCount))}
              </div>
            </div>
            <button onClick={() => setShareOpen(false)} className="w-full text-center text-xs font-bold py-3 mt-3" style={{ color: C.sub }}>
              {t("memories.shareClose")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
