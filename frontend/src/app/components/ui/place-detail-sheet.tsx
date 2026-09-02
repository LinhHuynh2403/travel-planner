import { Star, X, Map, ImageOff } from "lucide-react";
import { C, display } from "./jourzy-theme";
import { addressOf } from "./plan-view";
import { useTranslation } from "../../utils/translations";

const API_BASE = import.meta.env.VITE_API_URL || "";
const enc = encodeURIComponent;

// Google's price_level is a 0-4 scale with no currency attached (unlike our
// own hotel pricePerNight/activity cost, which are real estimated dollar
// amounts) -- rendered as repeated $ signs the same way Google's own Maps/
// Search UI does, so a traveler already reads it correctly at a glance.
function priceLevelLabel(level: number): string {
  if (level === 0) return "Free";
  return "$".repeat(level);
}

export default function PlaceDetailSheet({ stop, onClose }: { stop: any; onClose: () => void }) {
  const { t } = useTranslation();
  const place = stop?.place;
  const address = addressOf(stop);
  const mapsUrl = place?.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${enc(address)}`;

  const priceText = stop?.pricePerNight
    ? `$${stop.pricePerNight}${t("ui.perNight")}`
    : typeof stop?.cost === "number" && stop.cost > 0
      ? `$${stop.cost}`
      : typeof place?.priceLevel === "number"
        ? priceLevelLabel(place.priceLevel)
        : null;

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end" style={{ background: "rgba(20,25,40,0.45)" }} onClick={onClose}>
      <div className="rounded-t-jz-card overflow-hidden" style={{ background: C.paper }} onClick={(e) => e.stopPropagation()}>
        <div className="relative h-40 w-full flex items-center justify-center" style={{ background: C.greenSoft }}>
          <ImageOff size={28} style={{ color: C.green, opacity: 0.5 }} />
          {place?.photoReference && (
            <img
              src={`${API_BASE}/api/photo?reference=${place.photoReference}`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <button onClick={onClose} className="absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center" style={{ background: "rgba(20,25,40,0.55)" }}>
            <X size={15} color="#fff" />
          </button>
        </div>

        <div className="p-5 pb-7">
          <div className="text-lg font-bold" style={{ ...display, color: C.ink }}>{stop?.title}</div>
          <div className="text-xs mt-0.5" style={{ color: C.sub }}>{address}</div>

          {(place?.rating || priceText) && (
            <div className="text-xs mt-2 flex items-center gap-1" style={{ color: C.sub }}>
              {place?.rating && (
                <>
                  <Star size={11} fill="#FFC94D" color="#FFC94D" /> {place.rating.toFixed(1)}
                  {place.userRatingsTotal ? ` (${place.userRatingsTotal})` : ""}
                  {priceText ? " • " : ""}
                </>
              )}
              {priceText}
            </div>
          )}

          {stop?.description && <p className="text-xs mt-3 leading-relaxed" style={{ color: C.ink }}>{stop.description}</p>}

          <a href={mapsUrl} target="_blank" rel="noreferrer"
            className="mt-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ background: C.greenSoft, color: C.green }}>
            <Map size={12} /> {t("plan.getDirections")}
          </a>
        </div>
      </div>
    </div>
  );
}
