import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { C } from "./jourzy-theme";
import DayMap from "./day-map";
import { addressOf } from "./plan-view";
import { useTranslation } from "../../utils/translations";

const enc = encodeURIComponent;

export default function MapView({ tripData }: { tripData: any }) {
  const { t } = useTranslation();
  const [day, setDay] = useState(0);

  const d = tripData?.days?.[day];
  if (!d) return <div className="p-4">{t("plan.noItineraryData")}</div>;

  const hotel = tripData.hotelRecommendation;
  const hotelAddr = hotel ? addressOf(hotel, tripData.plan?.region) : tripData.plan?.region;
  const stops = d.activities || [];

  return (
    <div className="px-4">
      <div className="flex gap-2 mb-3 overflow-x-auto jz-scroll">
        {tripData.days.map((dd: any, i: number) => (
          <button key={i} onClick={() => setDay(i)} className="px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
            style={i === day ? { background: C.green, color: "#fff" } : { background: C.card, color: C.sub, border: `1px solid ${C.line}` }}>
            {t("ui.day")} {i + 1}
          </button>
        ))}
      </div>

      <DayMap stops={stops} hotelName={hotel?.name || t("plan.yourBase")} hotelAddr={hotelAddr} />

      {stops.length > 0 && (
        <>
          <div className="text-xs font-bold uppercase tracking-wide mb-2 mt-4 px-1" style={{ color: C.sub }}>
            {t("plan.stopsInOrder")}
          </div>
          <div className="space-y-2 pb-4">
            {stops.map((s: any, i: number) => (
              <a key={i}
                href={s.place?.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${enc(addressOf(s))}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-3 rounded-jz-card p-3 transition-transform active:scale-[0.98]"
                style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold"
                  style={{ background: C.greenSoft, color: C.green }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0 text-sm font-bold truncate" style={{ color: C.ink }}>{s.title}</div>
                <ChevronRight size={15} style={{ color: C.green }} className="shrink-0" />
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
