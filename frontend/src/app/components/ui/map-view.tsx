import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { C } from "./jourzy-theme";
import PlaceDetailSheet from "./place-detail-sheet";
import { useTranslation } from "../../utils/translations";

export default function MapView({ tripData }: { tripData: any }) {
  const { t } = useTranslation();
  const [day, setDay] = useState(0);
  const [selectedStop, setSelectedStop] = useState<any | null>(null);

  const d = tripData?.days?.[day];
  if (!d) return <div className="p-4">{t("plan.noItineraryData")}</div>;

  const hotel = tripData.hotelRecommendation;
  const stops = d.activities || [];

  // The "Check-in & Settle at Hotel" stop shares the hotel's own place data
  // (see enrichItineraryPlaces on the backend) but not its pricePerNight,
  // which only ever lives on hotelRecommendation itself -- attach it here so
  // the detail sheet can show the same price a traveler already saw on the
  // Plan tab's hotel card, instead of silently having no price for that stop.
  const openStop = (s: any) => {
    setSelectedStop(s.category === "rest" && hotel?.pricePerNight ? { ...s, pricePerNight: hotel.pricePerNight } : s);
  };

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

      {stops.length === 0 ? (
        <div className="rounded-jz-card p-6 text-center text-xs" style={{ background: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
          {t("plan.nothingPicked")}
        </div>
      ) : (
        <>
          <div className="text-xs font-bold uppercase tracking-wide mb-2 mt-1 px-1" style={{ color: C.sub }}>
            {t("plan.stopsInOrder")}
          </div>
          <div className="space-y-2 pb-4">
            {stops.map((s: any, i: number) => (
              <button key={i}
                onClick={() => openStop(s)}
                className="w-full flex items-center gap-3 rounded-jz-card p-3 text-left transition-transform active:scale-[0.98]"
                style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold"
                  style={{ background: C.greenSoft, color: C.green }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0 text-sm font-bold truncate" style={{ color: C.ink }}>{s.title}</div>
                <ChevronRight size={15} style={{ color: C.green }} className="shrink-0" />
              </button>
            ))}
          </div>
        </>
      )}

      {selectedStop && <PlaceDetailSheet stop={selectedStop} onClose={() => setSelectedStop(null)} />}
    </div>
  );
}
