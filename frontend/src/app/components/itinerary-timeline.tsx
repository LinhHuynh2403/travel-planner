import { useState } from "react";
import { format } from "date-fns";
import { DayItinerary, ItineraryActivity } from "../types/travel";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Clock, Utensils, Building2, Image, Trees, Activity as ActivityIcon, Coffee } from "lucide-react";

interface ItineraryTimelineProps {
  days: DayItinerary[];
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
  food: "bg-orange-100 text-orange-700 border-orange-200",
  museum: "bg-purple-100 text-purple-700 border-purple-200",
  exhibition: "bg-pink-100 text-pink-700 border-pink-200",
  nature: "bg-green-100 text-green-700 border-green-200",
  activity: "bg-blue-100 text-blue-700 border-blue-200",
  rest: "bg-gray-100 text-gray-700 border-gray-200",
};

function ActivityCard({
  activity,
  onClick,
}: {
  activity: ItineraryActivity;
  onClick: () => void;
}) {
  const cat = String(activity.category || "activity").toLowerCase();
  const Icon = (categoryIcons as any)[cat] ?? ActivityIcon; // ✅ fallback
  const colorClass = categoryColors[cat] ?? categoryColors.activity; // ✅ fallback

  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div className={`flex items-center justify-center size-10 rounded-full ${colorClass} border-2`}>
          <Icon className="size-5" />
        </div>
        <div className="w-0.5 h-full bg-gray-200 mt-2 group-last:hidden" />
      </div>

      <Card
        onClick={onClick}
        role="button"
        tabIndex={0}
        className="flex-1 mb-4 hover:shadow-md transition-shadow cursor-pointer"
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="size-4 text-gray-500" />
                <span className="font-semibold text-sm text-gray-700">{activity.time}</span>
              </div>
              <h4 className="font-semibold text-base">{activity.title}</h4>
            </div>
            <Badge variant="outline" className={`${colorClass} capitalize`}>
              {cat}
            </Badge>
          </div>

          <p className="text-sm text-gray-600 mb-2">{activity.description}</p>

          <p className="text-xs text-gray-500 flex items-center gap-1">
            <span className="inline-block size-1 rounded-full bg-gray-400" />
            {activity.location}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function ItineraryTimeline({ days }: ItineraryTimelineProps) {
  const [selected, setSelected] = useState<ItineraryActivity | null>(null);

  return (
    <div className="space-y-8">
      {days.map((day) => (
        <Card key={day.dayNumber} className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
            <CardTitle className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">Day {day.dayNumber}</div>
                <div className="text-xl">{format(day.date, "EEEE, MMMM d, yyyy")}</div>
              </div>
              <Badge variant="secondary" className="text-sm">
                {day.activities.length} activities
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            <div className="space-y-2">
              {day.activities.map((activity, idx) => (
                <ActivityCard key={idx} activity={activity} onClick={() => setSelected(activity)} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* ✅ Popup */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm text-gray-600">{selected?.description}</div>

            <div className="text-sm">
              <span className="font-medium">Location:</span>{" "}
              <span className="text-gray-700">{selected?.location}</span>
            </div>

            {/* If backend gave a direct maps link */}
            {selected?.place?.mapsUrl && (
              <Button asChild className="w-full">
                <a href={selected.place.mapsUrl} target="_blank" rel="noreferrer">
                  Open in Google Maps
                </a>
              </Button>
            )}

            {/* If no place found, fall back to a search link */}
            {!selected?.place?.mapsUrl && selected?.location && (
              <Button asChild className="w-full">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.location)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Search this on Google Maps
                </a>
              </Button>
            )}

            {/* Category-specific actions */}
            {selected?.category === "rest" && (
              <Button asChild variant="outline" className="w-full">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `hotels near ${selected.location}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Show nearby hotels
                </a>
              </Button>
            )}

            {selected?.category === "food" && (
              <Button asChild variant="outline" className="w-full">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `restaurant ${selected.location}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Find restaurants here
                </a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
