import { useState } from "react";
import { Share2, X, Image as ImageIcon, UtensilsCrossed, Landmark, Palette, Leaf, ShoppingBag, Compass, BedDouble, MapPin, MessageCircle, MessageSquare, Link as LinkIcon, Check, MoreHorizontal, Facebook, NotebookText, Trash2 } from "lucide-react";
import { C, display } from "./jourzy-theme";
import { tripTile } from "./trip-row";
import { shareContent, shareImage, whatsappUrl, smsUrl, twitterIntentUrl, facebookShareUrl, canUseNativeShare } from "../../utils/share";
import { apiFetch } from "../../utils/api";
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

// "empty" only ever means "marked visited, nothing else recorded" — a
// caption saved with no photo is real content and gets its own "note" look
// (text preview, not a bare icon), not lumped in with the truly-empty case.
// dayNumber/activityIndex/path only exist on a real photo tile — they're
// exactly what the delete-photo endpoint needs to identify it.
type Tile = {
  url: string | null; caption: string; title: string; icon: any; key: string; kind: "photo" | "note" | "empty";
  dayNumber: number; activityIndex: number; path?: string;
};

type ShareTarget = { title: string; text: string; url?: string; imageUrl?: string };

export default function MemoriesView({ tripData, onSaveMemory }: { tripData: any; onSaveMemory?: (row: any) => void }) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
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
  // 'local' is what a guest's never-saved-to-the-backend trip gets (see
  // new-trip-chat.tsx's handleGenerate) — there's no real row for
  // /api/trips/:id/public to look up, so there's nothing real to link to.
  const hasSavedTrip = !!tripData.tripId && tripData.tripId !== "local";
  // What the link actually opens: the real trip recap (region, dates, every
  // shared memory/photo) — not just JourZy's homepage, which is what this
  // used to point at and the whole reason a recipient couldn't see anything.
  const sharePageUrl = hasSavedTrip ? `${appUrl}/shared/${tripData.tripId}` : undefined;

  const openTripShare = () => {
    setCopied(false);
    setMoreUnavailable(false);
    setShareTarget({ title: tripData.plan?.region || "", text: tripShareText, url: sharePageUrl });
  };
  const openMemoryShare = (tile: Tile) => {
    setCopied(false);
    setMoreUnavailable(false);
    setShareTarget({ title: tile.title, text: tile.caption ? `${tile.title} — ${tile.caption}` : tile.title, url: sharePageUrl, imageUrl: tile.url || undefined });
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
      ? await shareImage({ title: target.title, text: target.text, imageUrl: target.imageUrl, pageUrl: target.url })
      : await shareContent({ title: target.title, text: target.text, url: target.url });
    if (ok) setShareTarget(null);
    // else: traveler dismissed the real native sheet themselves — that's a
    // deliberate cancel, not a failure, so no message here.
  };

  // Immediate, not deferred like the Plan tab's edit sheet — there's no
  // "Save" step in this view, so the confirm dialog IS the commit point.
  const deletePhoto = async (tile: Tile) => {
    if (!tile.path || deleting) return;
    if (!window.confirm(t("memories.deletePhotoConfirm"))) return;
    setDeleting(true);
    try {
      const resp = await apiFetch(`/api/trips/${tripData.tripId}/memories/photo`, {
        method: "DELETE",
        body: JSON.stringify({ dayNumber: tile.dayNumber, activityIndex: tile.activityIndex, path: tile.path }),
      });
      if (resp.ok) {
        const row = await resp.json();
        onSaveMemory?.(row);
        setLightbox(null);
      }
    } catch (e) {
      console.error("Failed to delete memory photo:", e);
    } finally {
      setDeleting(false);
    }
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
              url: p.url, caption: p.caption || "", title: m.activity_title, icon, key: `${m.id}-${i}`, kind: "photo" as const,
              dayNumber: m.day_number, activityIndex: m.activity_index, path: p.path,
            }));
          }
          const hasNote = !!m.caption?.trim();
          return [{
            url: null,
            caption: hasNote ? m.caption : t("memories.visitedNoPhoto"),
            title: m.activity_title, icon, key: `${m.id}-novisit`,
            kind: (hasNote ? "note" : "empty") as const,
            dayNumber: m.day_number, activityIndex: m.activity_index,
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
      })}

      {lightbox && (
        <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "#0e0d0b" }} onClick={() => setLightbox(null)}>
          {/* This is a real full-screen overlay (not a bottom sheet, which
              never reaches the true top edge) — px-4 pb-4 handle the sides
              and bottom, but the top needs env(safe-area-inset-top) added on
              top of the visual padding, or these buttons render underneath
              the status bar / notch on any phone that has one. */}
          <div className="flex justify-end gap-2 px-4 pb-4" style={{ paddingTop: "calc(16px + env(safe-area-inset-top))" }}>
            {lightbox.kind === "photo" && onSaveMemory && (
              <button onClick={(e) => { e.stopPropagation(); deletePhoto(lightbox); }} disabled={deleting}
                className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}>
                <Trash2 size={13} color="#fff" />
              </button>
            )}
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
