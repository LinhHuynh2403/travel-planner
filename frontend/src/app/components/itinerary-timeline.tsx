import { DayItinerary, ItineraryActivity, HotelRecommendation } from "../types/travel";
import { Clock, MapPin, Building2, ExternalLink } from "lucide-react";

interface ItineraryTimelineProps {
  days: DayItinerary[];
  region: string;
  onViewOnMap: (activity: ItineraryActivity) => void;
  onSelectActivity: (activity: ItineraryActivity, dayNumber: number, activityIdx: number) => void;
  hotelRecommendation?: HotelRecommendation;
  onSelectHotel: (hotel: HotelRecommendation) => void;
}

export function ItineraryTimeline({ days, onViewOnMap, onSelectActivity, hotelRecommendation, onSelectHotel }: ItineraryTimelineProps) {
  return (
    <div className="space-y-6">
      {hotelRecommendation && (
        <div className="bg-jz-card border-[1.5px] border-jz-line rounded-jz-card p-5 space-y-3 shadow-sm" onClick={() => onSelectHotel(hotelRecommendation)}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-jz-teal font-black tracking-wider uppercase">Recommended Base Base</span>
              <h4 className="font-black text-jz-title text-jz-ink mt-0.5">{hotelRecommendation.name}</h4>
            </div>
            <span className="px-2.5 py-1 rounded bg-jz-tealTint text-jz-teal font-extrabold text-xs">Stay</span>
          </div>
          <p className="text-jz-body text-jz-soft font-medium leading-relaxed">{hotelRecommendation.reasoning}</p>
          <div className="pt-3 border-t border-jz-line flex justify-between items-center text-xs font-bold text-jz-soft">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-jz-teal" /> {hotelRecommendation.neighborhood}</span>
          </div>
        </div>
      )}

      {days.map((day) => (
        <div key={day.dayNumber} className="space-y-3">
          <div className="px-1 flex justify-between items-baseline mt-4">
            <h3 className="text-jz-title font-black text-jz-ink">Day {day.dayNumber} Sequence</h3>
            <span className="text-xs font-black text-jz-soft bg-jz-card px-2 py-0.5 rounded border border-jz-line">{day.activities.length} Stops</span>
          </div>

          {day.activities.map((activity, idx) => (
            <div
              key={idx}
              onClick={() => onSelectActivity(activity, day.dayNumber, idx)}
              className="bg-jz-card border-[1.5px] border-jz-line rounded-jz-card p-5 space-y-3 shadow-sm hover:border-jz-teal transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-jz-soft">
                    <Clock className="w-3.5 h-3.5 text-jz-teal" />
                    <span>{activity.time}</span>
                  </div>
                  <h4 className="font-black text-jz-title text-jz-ink leading-tight">{activity.title}</h4>
                </div>
                <span className="px-2 py-0.5 text-[11px] font-black tracking-wider uppercase bg-jz-bg border border-jz-line rounded text-jz-soft">{activity.category}</span>
              </div>
              
              <p className="text-jz-body text-jz-soft font-semibold leading-relaxed">
                <span className="font-extrabold text-jz-teal">Because · </span>{activity.description}
              </p>

              <div className="pt-3 border-t border-jz-line flex justify-between items-center text-xs font-bold text-jz-soft">
                <span className="truncate max-w-[60%]">📍 {activity.location}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onViewOnMap(activity); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-jz-tealTint text-jz-tealDark font-extrabold"
                >
                  <MapPin className="w-3.5 h-3.5" /> Track Location
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}