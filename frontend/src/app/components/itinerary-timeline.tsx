import { format } from "date-fns";
import { DayItinerary, ItineraryActivity, HotelRecommendation } from "../types/travel";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Clock, Utensils, Building2, Image, Trees, Activity as ActivityIcon, Coffee, MapPin } from "lucide-react";

interface ItineraryTimelineProps {
  days: DayItinerary[];
  region: string;
  onViewOnMap: (activity: ItineraryActivity) => void;
  onSwapActivity: (dayNumber: number, activityIdx: number, altIdx: number) => void;
  hotelRecommendation?: HotelRecommendation;
  onSwapHotel?: (altIdx: number) => void;
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
  onSwapActivity
}: {
  activity: ItineraryActivity;
  activityIdx: number;
  dayNumber: number;
  onClick: () => void;
  onSwapActivity: (dayNumber: number, activityIdx: number, altIdx: number) => void;
}) {
  const cat = String(activity.category || "activity").toLowerCase();
  const Icon = (categoryIcons as any)[cat] ?? ActivityIcon;
  const badgeClass = categoryColors[cat] ?? categoryColors.activity;
  const iconClass = categoryIconColors[cat] ?? categoryIconColors.activity;

  return (
    <div className="flex gap-4 group">
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
        className="flex-1 mb-6 bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group/card text-zinc-300"
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Clock className="size-4 text-zinc-500" />
                <span className="font-semibold text-sm text-zinc-300">{activity.time}</span>
                {activity.place?.isOpenNow === true && (
                  <Badge variant="secondary" className="ml-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-0">🟢 Open Now</Badge>
                )}
                {activity.place?.isOpenNow === false && (
                  <Badge variant="secondary" className="ml-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border-0">🔴 Closed</Badge>
                )}
              </div>
              <h4 className="font-semibold text-lg text-white">{activity.title}</h4>
            </div>
            <Badge variant="outline" className={`${badgeClass} capitalize`}>
              {cat}
            </Badge>
          </div>

          <p className="text-sm text-zinc-400 mb-4">{activity.description}</p>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 flex items-center gap-1.5 truncate max-w-[70%]">
              <span className="inline-block size-1.5 rounded-full bg-zinc-600 shrink-0" />
              {activity.location}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-8"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <MapPin className="mr-1.5 size-3.5" />
              View on map
            </Button>
          </div>

          {/* Alternatives Subsection */}
          {activity.alternatives && activity.alternatives.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800/80">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3">Alternative Recommendations</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activity.alternatives.map((alt, altIdx) => (
                  <div
                    key={altIdx}
                    className="bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800/60 hover:border-zinc-700/80 transition-colors flex flex-col justify-between"
                    onClick={(e) => e.stopPropagation()} // Prevent card selection when clicking alternative info
                  >
                    <div>
                      <h5 className="font-semibold text-xs text-white">{alt.title}</h5>
                      <p className="text-[9px] text-zinc-500 mt-0.5 truncate">{alt.location}</p>
                      <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">{alt.description}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 text-[10px] h-7 bg-zinc-900 hover:bg-zinc-800 hover:text-emerald-400 border-zinc-800 w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSwapActivity(dayNumber, activityIdx, altIdx);
                      }}
                    >
                      Swap with Main Option
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ItineraryTimeline({
  days,
  region,
  onViewOnMap,
  onSwapActivity,
  hotelRecommendation,
  onSwapHotel
}: ItineraryTimelineProps) {
  return (
    <div className="space-y-8">
      {/* Hotel Recommendation block at top */}
      {hotelRecommendation && (
        <Card className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-300">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                <Building2 className="size-3.5" />
                Recommended Accommodation Base
              </div>
              <h3 className="text-xl font-bold text-white">{hotelRecommendation.name}</h3>
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                {hotelRecommendation.neighborhood}
              </p>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{hotelRecommendation.reasoning}</p>
            </div>
          </div>

          {/* Alternatives Accommodation Subsection */}
          {hotelRecommendation.alternatives && hotelRecommendation.alternatives.length > 0 && (
            <div className="mt-5 pt-4 border-t border-zinc-800/80">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3">Alternative Stays</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hotelRecommendation.alternatives.map((alt, altIdx) => (
                  <div key={altIdx} className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-805 hover:border-zinc-800 transition-colors flex flex-col justify-between">
                    <div>
                      <h5 className="font-semibold text-xs text-white">{alt.name}</h5>
                      <p className="text-[9px] text-zinc-500 mt-0.5">{alt.neighborhood}</p>
                      <p className="text-[11px] text-zinc-400 mt-2.5 leading-relaxed">{alt.reasoning}</p>
                    </div>
                    {onSwapHotel && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3.5 text-[10px] h-7 bg-zinc-900 hover:bg-zinc-800 hover:text-emerald-400 border-zinc-800 w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSwapHotel(altIdx);
                        }}
                      >
                        Swap with Main Option
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Daily Schedule Timeline */}
      {days.map((day) => (
        <Card key={day.dayNumber} className="overflow-hidden bg-zinc-950 border-0 shadow-none">
          <div className="mb-6">
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
            {day.activities.map((activity, idx) => (
              <ActivityCard
                key={idx}
                activity={activity}
                activityIdx={idx}
                dayNumber={day.dayNumber}
                onClick={() => onViewOnMap(activity)}
                onSwapActivity={onSwapActivity}
              />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
