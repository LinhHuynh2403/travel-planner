import { Trash2, Cloud, CloudRain, CloudSun, Sun, CloudSnow, CloudLightning, Camera } from "lucide-react";
import { useLiveWeatherWeek } from "../../utils/live-weather";
import { useDestinationPhoto } from "../../utils/destinationPhoto";
import { formatTemp } from "../../utils/units";
import { useTranslation } from "../../utils/translations";

const API_BASE = import.meta.env.VITE_API_URL || "";

const WEATHER_ICON: Record<string, any> = { sunny: Sun, partly: CloudSun, cloudy: Cloud, rainy: CloudRain, snowy: CloudSnow, stormy: CloudLightning };

// Deterministic per-trip icon tile: no real cover photo exists for a trip,
// so a stable gradient + emoji (picked from the region name, not random) is
// used instead — the same trip always gets the same tile across renders.
const GRADIENT_PAIRS = [
  ["var(--color-jz-teal)", "var(--color-jz-tealDark)"],
  ["var(--color-jz-gold)", "#8a5a12"],
  ["#C43A2F", "var(--color-jz-gold)"],
  ["var(--color-jz-tealDark)", "var(--color-jz-teal)"],
  ["var(--color-jz-gold)", "var(--color-jz-teal)"],
  ["#C43A2F", "var(--color-jz-tealDark)"],
];
const EMOJIS = ["🏝️", "🏮", "🗻", "🏛️", "🌆", "🛶", "🏰", "🌴"];

function hashOf(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function tripTile(region: string) {
  const h = hashOf(region || "");
  const [c1, c2] = GRADIENT_PAIRS[h % GRADIENT_PAIRS.length];
  const emoji = EMOJIS[h % EMOJIS.length];
  return { background: `linear-gradient(150deg, ${c1}, ${c2})`, emoji };
}

export function TripRow({
  trip, onOpen, onDelete, loading, deleting, broken,
}: {
  trip: any;
  onOpen: () => void;
  onDelete: (e: any) => void;
  loading: boolean;
  deleting: boolean;
  broken: boolean;
}) {
  const { t } = useTranslation();
  const isUpcoming = new Date(trip.leave_date) >= new Date();
  const tile = tripTile(trip.region);
  const photoRef = useDestinationPhoto(trip.region);
  const days = Math.floor((new Date(trip.leave_date).getTime() - new Date(trip.arrival_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysAway = Math.max(0, Math.ceil((new Date(trip.arrival_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const placeCount = trip.itineraries?.[0]?.days?.reduce((acc: number, d: any) => acc + d.activities.length, 0) || 0;
  const memoryCount = trip.memoryCount || 0;
  const placesVisited = trip.placesCount || 0;

  // Only fetched for upcoming trips — a completed trip shows its real
  // memory count instead (see below), and fetching live weather for every
  // past trip in the list would be both wasted calls and meaningless data.
  const liveWeather = useLiveWeatherWeek(isUpcoming ? trip.region : "");
  const todayWeather = liveWeather?.[0];
  const WeatherIcon = todayWeather ? (WEATHER_ICON[todayWeather.icon] || Cloud) : null;

  return (
    <button
      onClick={onOpen}
      disabled={loading}
      className="w-full flex items-center gap-3 rounded-jz-card border border-jz-line bg-jz-card p-3.5 text-left"
    >
      <div
        className="relative w-11 h-11 rounded-2xl shrink-0 flex items-center justify-center text-xl overflow-hidden"
        style={{ background: tile.background }}
      >
        {tile.emoji}
        {photoRef && (
          <img
            src={`${API_BASE}/api/photo?reference=${photoRef}`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-jz-body-big font-bold text-jz-ink capitalize truncate">{trip.region}</h3>
        <div className="text-jz-label text-jz-soft truncate">
          {new Date(trip.arrival_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          {' – '}
          {new Date(trip.leave_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          {isUpcoming ? ` · ${t("nav.daysCount").replace("{{n}}", String(days))}` : ` · ${t("nav.placesVisited").replace("{{n}}", String(placeCount))}`}
        </div>
        {isUpcoming && todayWeather && WeatherIcon && (
          <div className="flex items-center gap-1 text-jz-label text-jz-soft mt-0.5">
            <WeatherIcon size={12} />
            {formatTemp(todayWeather.hi)} / {formatTemp(todayWeather.lo)}
          </div>
        )}
        {!isUpcoming && memoryCount > 0 && (
          <div className="flex items-center gap-1 text-jz-label font-bold mt-0.5" style={{ color: "var(--color-jz-goldInk)" }}>
            <Camera size={12} />
            {t("memories.statLine").replace("{{n}}", String(memoryCount)).replace("{{m}}", String(placesVisited))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          onClick={onDelete}
          className="p-1.5 rounded-full text-jz-soft"
          aria-label={t("nav.deleteTripConfirm")}
        >
          {deleting ? <span className="text-[10px]">…</span> : <Trash2 size={13} />}
        </span>
        {broken ? (
          <span className="flex-none rounded-full px-2.5 py-1 text-[10.5px] font-bold" style={{ background: "rgba(196, 58, 47, 0.15)", color: "#C43A2F" }}>
            {t("nav.tripBroken")}
          </span>
        ) : (
          <span
            className={isUpcoming
              ? "flex-none rounded-full bg-jz-tealTint px-2.5 py-1 text-[10.5px] font-bold text-jz-tealDark whitespace-nowrap"
              : "flex-none rounded-full border border-jz-line px-2.5 py-1 text-[10.5px] font-bold text-jz-soft whitespace-nowrap"}
          >
            {loading ? t("nav.loading") : isUpcoming ? t("home.daysAway").replace("{{n}}", String(daysAway)) : t("home.completed")}
          </span>
        )}
      </div>
    </button>
  );
}
