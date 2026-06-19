import { format } from "date-fns";
import { DayItinerary, ItineraryActivity, HotelRecommendation } from "../types/travel";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Clock, Utensils, Building2, Image, Trees, Activity as ActivityIcon, Coffee, MapPin, ExternalLink } from "lucide-react";

interface ItineraryTimelineProps {
  days: DayItinerary[];
  region: string;
  onViewOnMap: (activity: ItineraryActivity) => void;
  onSelectActivity: (activity: ItineraryActivity, dayNumber: number, activityIdx: number) => void;
  hotelRecommendation?: HotelRecommendation;
  onSelectHotel: (hotel: HotelRecommendation) => void;
  selectedDetailId?: string | null;
}

const categoryIcons = {
  food: Utensils,
  museum: Building2,
  exhibition: Image,
  nature: Trees,
  activity: ActivityIcon,
  rest: Coffee,
} as const;

const categoryColors: Record<string, string> = {
  food: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  museum: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  exhibition: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  nature: "bg-green-500/10 text-green-400 border-green-500/20",
  activity: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  rest: "bg-zinc-800 text-zinc-300 border-zinc-700",
};

const categoryIconColors: Record<string, string> = {
  food: "text-orange-400 border-orange-500/30",
  museum: "text-purple-400 border-purple-500/30",
  exhibition: "text-pink-400 border-pink-500/30",
  nature: "text-green-400 border-green-500/30",
  activity: "text-blue-400 border-blue-500/30",
  rest: "text-zinc-400 border-zinc-700",
};

function ActivityCard({
  activity,
  activityIdx,
  dayNumber,
  onClick,
  onViewOnMap,
  isSelected
}: {
  activity: ItineraryActivity;
  activityIdx: number;
  dayNumber: number;
  onClick: () => void;
  onViewOnMap: () => void;
  isSelected: boolean;
}) {
  const cat = String(activity.category || "activity").toLowerCase();
  const Icon = (categoryIcons as any)[cat] ?? ActivityIcon;
  const badgeClass = categoryColors[cat] ?? categoryColors.activity;
  const iconClass = categoryIconColors[cat] ?? categoryIconColors.activity;

  return (
    <div id={`activity-${dayNumber}-${activityIdx}`} className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div className={`flex items-center justify-center size-10 rounded-full bg-zinc-900 border-2 ${iconClass}`}>
          <Icon className="size-5" />
        </div>
        <div className="w-0.5 h-full bg-zinc-800 mt-2 group-last:hidden" />
      </div>

      <Card
        onClick={onClick}
        role="button"
        tabIndex={0}
        className={`flex-1 mb-6 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group/card text-zinc-300 ${isSelected ? "ring-2 ring-emerald-500 border-transparent bg-zinc-800/40" : ""
          }`}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Clock className="size-4 text-zinc-500" />
                <span className="font-semibold text-sm text-zinc-300">{activity.time}</span>
                {activity.travelTimeFromPrevious && activity.travelTimeFromPrevious.length <= 45 && (
                  <Badge variant="outline" className="ml-2 bg-zinc-950/85 text-zinc-400 border-zinc-800/80 text-[10px] py-0.5 px-2 font-medium">
                    ⏱ {activity.travelTimeFromPrevious}
                  </Badge>
                )}
                {activity.place?.isOpenNow === true && (
                  <Badge variant="secondary" className="ml-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-0">🟢 Open Now</Badge>
                )}
                {activity.place?.isOpenNow === false && (
                  <Badge variant="secondary" className="ml-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border-0">🔴 Closed</Badge>
                )}
              </div>
              {activity.travelTimeFromPrevious && activity.travelTimeFromPrevious.length > 45 && (
                <div className="mb-3 text-[11px] text-zinc-400 bg-zinc-950/50 border border-zinc-800/80 rounded-lg p-2.5 flex items-start gap-2 max-w-full whitespace-normal">
                  <span className="text-zinc-500 mt-0.5 shrink-0">⏱</span>
                  <span className="leading-relaxed">{activity.travelTimeFromPrevious}</span>
                </div>
              )}
              <h4 className="font-semibold text-lg text-white">
                {activity.title || (activity.category === 'rest' ? 'Rest & Relaxation' : activity.category === 'food' ? 'Dining Stop' : 'Activity Stop')}
              </h4>
            </div>
            <Badge variant="outline" className={`${badgeClass} capitalize`}>
              {cat}
            </Badge>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed mt-1">{activity.description}</p>

          {/* 🌟 NEW WORKFLOW: SOCIAL MEDIA METRICS & PLATFORM SIGNATURE DISHES */}
          <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
            {activity.category === 'food' && (
              <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded border border-amber-500/20">
                🍳 Signature Item: Try the signature local dish!
              </span>
            )}
            {activity.title.toLowerCase().includes('park') || activity.category === 'nature' ? (
              <span className="text-[10px] bg-sky-500/10 text-sky-400 font-bold px-2 py-0.5 rounded border border-sky-500/20">
                📸 Top Photo Spot: High Aesthetic Value
              </span>
            ) : (
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                #AuthenticLocalGem
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            {activity.location ? (
              <p className="text-xs text-zinc-550 flex items-center gap-1.5 truncate max-w-[70%]">
                <span className="inline-block size-1.5 rounded-full bg-zinc-600 shrink-0" />
                {activity.location}
              </p>
            ) : (
              <div />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-8"
              onClick={(e) => {
                e.stopPropagation();
                onViewOnMap();
              }}
            >
              <MapPin className="mr-1.5 size-3.5" />
              View on map
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ItineraryTimeline({
  days,
  region,
  onViewOnMap,
  onSelectActivity,
  hotelRecommendation,
  onSelectHotel,
  selectedDetailId
}: ItineraryTimelineProps) {
  return (
    <div className="space-y-8">
      {/* Hotel Recommendation block at top, styled just like activity cards */}
      {hotelRecommendation && (
        <div className="flex gap-4 group">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center size-10 rounded-full bg-zinc-900 border-2 text-emerald-400 border-emerald-500/30">
              <Building2 className="size-5" />
            </div>
            <div className="w-0.5 h-full bg-zinc-800 mt-2" />
          </div>

          <Card
            onClick={() => onSelectHotel(hotelRecommendation)}
            role="button"
            tabIndex={0}
            className={`flex-1 mb-6 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group/card text-zinc-300 ${selectedDetailId === "hotel" ? "ring-2 ring-emerald-500 border-transparent bg-zinc-800/40" : ""
              }`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                    Recommended Accommodation Base
                  </div>
                  <h4 className="font-semibold text-lg text-white">{hotelRecommendation.name}</h4>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  Stay
                </Badge>
              </div>

              <p className="text-sm text-zinc-400 mb-4">{hotelRecommendation.reasoning}</p>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 flex items-center gap-1.5 truncate max-w-[70%]">
                  <span className="inline-block size-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {hotelRecommendation.neighborhood}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotelRecommendation.name + ", " + (hotelRecommendation.neighborhood || ""))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-8"
                  >
                    <ExternalLink className="mr-1.5 size-3.5" />
                    Open Maps
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily Schedule Timeline */}
      {days.map((day) => (
        <Card key={day.dayNumber} className="bg-zinc-950 border-0 shadow-none">
          <div className="mb-6 pl-2">
            <div className="text-xs font-semibold text-zinc-500 tracking-wider uppercase mb-1">
              Day {day.dayNumber}
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">{format(day.date, "EEEE, MMMM d, yyyy")}</h3>
              <Badge variant="secondary" className="bg-zinc-900 border border-zinc-800 text-zinc-300">
                {day.activities.length} activities
              </Badge>
            </div>
          </div>

          <div className="pl-2">
            {day.activities.map((activity, idx) => {
              const uniqueId = `activity-${day.dayNumber}-${idx}`;
              return (
                <ActivityCard
                  key={idx}
                  activity={activity}
                  activityIdx={idx}
                  dayNumber={day.dayNumber}
                  onClick={() => onSelectActivity(activity, day.dayNumber, idx)}
                  onViewOnMap={() => onViewOnMap(activity)}
                  isSelected={selectedDetailId === uniqueId}
                />
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
