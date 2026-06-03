import { useState } from 'react';
import { DayItinerary, ItineraryActivity } from '../types/travel';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { MapPin, Navigation, ArrowRight, ExternalLink } from 'lucide-react';

interface MapTabProps {
  days: DayItinerary[];
  selectedActivity: ItineraryActivity | null;
  onActivitySelect: (activity: ItineraryActivity) => void;
}

export function MapTab({ days, selectedActivity, onActivitySelect }: MapTabProps) {
  const allActivities = days.flatMap(d => d.activities);

  // Find previous activity to show route
  let previousActivity: ItineraryActivity | null = null;
  if (selectedActivity) {
    const currentIndex = allActivities.findIndex(a => a === selectedActivity);
    if (currentIndex > 0) {
      previousActivity = allActivities[currentIndex - 1];
    }
  }

  const hasSelectedCoords = selectedActivity?.place?.lat && selectedActivity?.place?.lng;
  const hasPrevCoords = previousActivity?.place?.lat && previousActivity?.place?.lng;

  const mapQuery = hasSelectedCoords
    ? `${selectedActivity.place!.lat},${selectedActivity.place!.lng}(${encodeURIComponent(selectedActivity.title)})`
    : encodeURIComponent(selectedActivity?.location || selectedActivity?.title || days[0]?.activities[0]?.location || 'Paris, France');

  // Only attempt routing if both have valid coordinates to prevent geocoding failures from resetting zoom
  const routeQuery = previousActivity && selectedActivity && hasPrevCoords && hasSelectedCoords
    ? `saddr=${previousActivity.place!.lat},${previousActivity.place!.lng}&daddr=${selectedActivity.place!.lat},${selectedActivity.place!.lng}`
    : `q=${mapQuery}`;

  const mapUrl = `https://maps.google.com/maps?${routeQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-4">
      {/* Map Area */}
      <div className="flex-1 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 relative">
        <iframe
          src={mapUrl}
          className="w-full h-full border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>

      {/* Sidebar with details */}
      <div className="w-80 flex flex-col gap-4 overflow-y-auto pr-2">
        {selectedActivity ? (
          <>
            <Card className="bg-zinc-900 border-zinc-800 text-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-lg">{selectedActivity.title}</h3>
                  <div className="bg-zinc-800 p-2 rounded-full">
                    <MapPin className="size-4 text-emerald-400" />
                  </div>
                </div>

                <p className="text-zinc-400 text-sm mb-6">{selectedActivity.location}</p>

                {previousActivity && (
                  <div className="bg-zinc-950 p-4 rounded-lg mb-6 border border-zinc-800">
                    <div className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">Route Info</div>
                    <div className="flex items-center gap-3 text-sm text-zinc-300">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
                        <div className="w-0.5 h-6 bg-zinc-700"></div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      </div>
                      <div className="flex flex-col gap-3">
                        <div>From {previousActivity.title}</div>
                        <div>To {selectedActivity.title}</div>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => window.open(selectedActivity.place?.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${mapQuery}`, '_blank')}
                >
                  Open in Google Maps
                  <ExternalLink className="ml-2 size-4" />
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="bg-zinc-900 border-zinc-800 border rounded-xl p-6 text-center text-zinc-400 flex flex-col items-center justify-center h-40">
            <MapPin className="size-8 mb-3 opacity-50" />
            <p>Select an activity on the map or schedule to view details</p>
          </div>
        )}

        {/* List of all pins for quick selection */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">All Stops</h4>
          <div className="flex flex-col gap-2">
            {allActivities.map((act, idx) => (
              <button
                key={idx}
                onClick={() => onActivitySelect(act)}
                className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${selectedActivity === act
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800/80 border border-transparent'
                  }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${selectedActivity === act ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800'
                  }`}>
                  {idx + 1}
                </div>
                <div className="truncate flex-1">
                  <div className="text-sm font-medium truncate">{act.title}</div>
                  <div className="text-xs opacity-70 truncate">{act.time}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
