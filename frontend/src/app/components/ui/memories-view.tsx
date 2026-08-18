import { useState } from "react";
import { Share2, X, Image as ImageIcon, UtensilsCrossed, Landmark, Palette, Leaf, ShoppingBag, Compass, BedDouble, MapPin, MessageCircle, MessageSquare, Link as LinkIcon, Check, MoreHorizontal, Facebook } from "lucide-react";
import { C, display } from "./jourzy-theme";
import { tripTile } from "./trip-row";
import { shareContent, shareImage, whatsappUrl, smsUrl, twitterIntentUrl, facebookShareUrl, canUseNativeShare } from "../../utils/share";
import { useTranslation } from "../../utils/translations";

// Same real line-icon set as plan-view.tsx's activity cards, not emoji.
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

type Tile = { url: string | null; caption: string; title: string; icon: any; key: string };

type ShareTarget = { title: string; text: string; url?: string; imageUrl?: string };

export default function MemoriesView({ tripData }: { tripData: any }) {
  const { t } = useTranslation();
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [copied, setCopied] = useState(false);
  // "More" hands off to the real OS share sheet (Instagram/Messenger live
  // there, not as a direct link) — but that mechanism plainly doesn't exist
  // on some browsers (notably desktop Chrome on macOS, which never shipped
  // the Web Share API others did). Surface that instead of the button
  // silently doing nothing, which is what it did before this flag existed.
  const [moreUnavailable, setMoreUnavailable] = useState(false);
  const [lightbox, setLightbox] = useState<Tile | null>(null);

  const memories: any[] = tripData.memories || [];
  const touched = memories.filter((m) => m.visited || (m.photos?.length || 0) > 0);
  const totalPhotos = memories.reduce((sum, m) => sum + (m.photos?.length || 0), 0);
  const placesCount = touched.length;

  const tripShareText = t("memories.shareText")
    .replace("{{region}}", tripData.plan?.region || "")
    .replace("{{n}}", String(totalPhotos)).replace("{{m}}", String(placesCount));
  const appUrl = typeof window !== "undefined" ? window.location.origin : undefined;

  const openTripShare = () => {
    setCopied(false);
    setMoreUnavailable(false);
    setShareTarget({ title: tripData.plan?.region || "", text: tripShareText, url: appUrl });
  };
  const openMemoryShare = (tile: Tile) => {
    setCopied(false);
    setMoreUnavailable(false);
    setShareTarget({ title: tile.title, text: tile.caption ? `${tile.title} — ${tile.caption}` : tile.title, imageUrl: tile.url || undefined });
  };

  const shareCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareTarget!.url || shareTarget!.text);
      setCopied(true);
    } catch (e) { console.error("Copy failed:", e); }
  };
  const shareMore = async () => {
    if (!canUseNativeShare()) { setMoreUnavailable(true); return; }
    const target = shareTarget!;
    const ok = target.imageUrl
      ? await shareImage({ title: target.title, text: target.text, imageUrl: target.imageUrl })
      : await shareContent({ title: target.title, text: target.text, url: target.url });
    if (ok) setShareTarget(null);
    // else: traveler dismissed the real native sheet themselves — that's a
    // deliberate cancel, not a failure, so no message here.
  };

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
        onClick={openTripShare}
        className="w-full py-2.5 rounded-full text-jz-label font-bold flex items-center justify-center gap-1.5 mb-5"
        style={{ background: C.amber, color: "#fff" }}
      >
        <Share2 size={13} /> {t("memories.shareTrip")}
      </button>

      {dayNumbers.map((dayNumber) => {
        const dayMemories = touched.filter((m) => m.day_number === dayNumber);
        const date = dateForDay(tripData.plan?.arrivalDate, dayNumber);
        const tiles: Tile[] = dayMemories.flatMap((m) => {
          const icon = CAT_ICON[categoryFor(m.day_number, m.activity_index) || ""] || MapPin;
          if ((m.photos?.length || 0) > 0) {
            return m.photos.map((p: any, i: number) => ({
              url: p.url, caption: m.caption || "", title: m.activity_title, icon, key: `${m.id}-${i}`,
            }));
          }
          return [{ url: null, caption: m.caption || t("memories.visitedNoPhoto"), title: m.activity_title, icon, key: `${m.id}-novisit` }];
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
                    <tile.icon size={26} color="#FBF6EC" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,.25))" }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {lightbox && (
        <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "#0e0d0b" }} onClick={() => setLightbox(null)}>
          <div className="flex justify-end gap-2 p-4">
            <button onClick={(e) => { e.stopPropagation(); openMemoryShare(lightbox); }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}>
              <Share2 size={13} color="#fff" />
            </button>
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

      {/* z-50: must sit above the photo lightbox (z-40) too, since sharing a
          memory photo opens this while the lightbox is still open behind it. */}
      {shareTarget && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(20,25,40,0.45)" }} onClick={() => setShareTarget(null)}>
          <div className="rounded-t-jz-card p-5 pb-7" style={{ background: C.paper }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div className="font-bold text-sm truncate pr-3" style={{ color: C.ink }}>{shareTarget.title}</div>
              <button onClick={() => setShareTarget(null)} className="shrink-0"><X size={18} style={{ color: C.sub }} /></button>
            </div>

            {/* WhatsApp/Messages/X open directly with the content pre-filled —
                real, public, keyless links each platform documents itself.
                Instagram/Messenger have no such link; "More" hands off to the
                real OS share sheet, which is the only legitimate way to reach
                those — same mechanism Apple's/Google's own Share button uses. */}
            <div className="flex gap-3 overflow-x-auto jz-scroll pb-1 -mx-1 px-1">
              <a href={whatsappUrl(shareTarget.text, shareTarget.url)} target="_blank" rel="noreferrer"
                className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 64 }}>
                <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#25D366" }}>
                  <MessageCircle size={24} color="#fff" />
                </span>
                <span className="text-[10.5px] font-semibold text-center leading-tight" style={{ color: C.ink }}>{t("memories.shareWhatsapp")}</span>
              </a>
              <a href={facebookShareUrl(shareTarget.url || appUrl || "")} target="_blank" rel="noreferrer"
                className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 64 }}>
                <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#1877F2" }}>
                  <Facebook size={22} color="#fff" fill="#fff" />
                </span>
                <span className="text-[10.5px] font-semibold text-center leading-tight" style={{ color: C.ink }}>Facebook</span>
              </a>
              <a href={smsUrl(shareTarget.text)}
                className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 64 }}>
                <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#0B93F6" }}>
                  <MessageSquare size={22} color="#fff" />
                </span>
                <span className="text-[10.5px] font-semibold text-center leading-tight" style={{ color: C.ink }}>{t("memories.shareMessages")}</span>
              </a>
              <a href={twitterIntentUrl(shareTarget.text)} target="_blank" rel="noreferrer"
                className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 64 }}>
                <span className="w-14 h-14 rounded-full flex items-center justify-center bg-black">
                  <X size={22} color="#fff" />
                </span>
                <span className="text-[10.5px] font-semibold text-center leading-tight" style={{ color: C.ink }}>X</span>
              </a>
              <button onClick={shareCopyLink} className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 64 }}>
                <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                  {copied ? <Check size={20} color={C.green} /> : <LinkIcon size={20} style={{ color: C.ink }} />}
                </span>
                <span className="text-[10.5px] font-semibold text-center leading-tight" style={{ color: copied ? C.green : C.ink }}>
                  {copied ? t("memories.shareCopied") : t("memories.shareCopyLink")}
                </span>
              </button>
              <button onClick={shareMore} className="flex flex-col items-center gap-1.5 shrink-0" style={{ width: 64 }}>
                <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                  <MoreHorizontal size={22} style={{ color: C.ink }} />
                </span>
                <span className="text-[10.5px] font-semibold text-center leading-tight" style={{ color: C.ink }}>{t("memories.shareMore")}</span>
              </button>
            </div>

            {moreUnavailable && (
              <div className="text-xs mt-4 leading-relaxed" style={{ color: C.sub }}>
                {t("memories.shareMoreUnavailable")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
