import { useState, useEffect } from 'react';
import { DayItinerary, ItineraryActivity, TravelPlan } from '../types/travel';
import { fetchSpontaneousBackup } from '../utils/generate-itinerary';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { MapPin, ExternalLink, ArrowLeft, Utensils, Hotel, Sparkles } from 'lucide-react';

interface NearbyPlace {
  placeId: string;
  name: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  isOpenNow?: boolean;
  vicinity: string;
  photoUrl?: string | null;
}

interface MapTabProps {
  days: DayItinerary[];
  plan: TravelPlan;
  selectedActivity: ItineraryActivity | null;
  onActivitySelect: (activity: ItineraryActivity) => void;
  onBack: () => void;
  onReplaceActivity?: (newActivityData: Partial<ItineraryActivity>) => void;
}

export function MapTab({ days, plan, selectedActivity, onActivitySelect, onBack, onReplaceActivity }: MapTabProps) {
  const allActivities = days.flatMap(d => d.activities);

  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [customKeyword, setCustomKeyword] = useState('');

  const handleSpontaneousSearch = async (keyword: string) => {
    if (!keyword.trim()) return;
    setIsLoadingNearby(true);
    try {
      // Use selected activity coordinates if selected, fallback to live geolocation
      if (selectedActivity?.place?.lat && selectedActivity?.place?.lng) {
        const data = await fetchSpontaneousBackup(
          selectedActivity.place.lat,
          selectedActivity.place.lng,
          keyword
        );
        setNearbyPlaces(data.places || []);
      } else {
        if (!navigator.geolocation) {
          alert("Geolocation not supported by your browser");
          setIsLoadingNearby(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude, longitude } = pos.coords;
          const data = await fetchSpontaneousBackup(latitude, longitude, keyword);
          setNearbyPlaces(data.places || []);
          setIsLoadingNearby(false);
        }, () => setIsLoadingNearby(false));
      }
    } catch (err) {
      console.error("Spontaneous search failed:", err);
      setIsLoadingNearby(false);
    }
  };

  // Helper to dynamically extract the search keyword for nearby suggestions
  const getNearbyKeyword = (): string => {
    if (!selectedActivity) return 'restaurant';

    const titleLower = (selectedActivity.title || '').toLowerCase();
    const descLower = (selectedActivity.description || '').toLowerCase();

    // 1. Check for rest/hotel category or check-in tags
    const category = String(selectedActivity.category || '').toLowerCase();
    if (category === 'rest' || titleLower.includes('hotel') || titleLower.includes('accommodation') || titleLower.includes('check-in') || titleLower.includes('stay') || titleLower.includes('lodging')) {
      return 'hotel';
    }

    // 2. Check for specific cuisines in activity details
    const cuisines = [
      { key: 'vietnamese', match: ['vietnamese', 'pho', 'viet'] },
      { key: 'mexican', match: ['mexican', 'taco', 'taqueria', 'burrito'] },
      { key: 'japanese', match: ['japanese', 'sushi', 'ramen'] },
      { key: 'italian', match: ['italian', 'pizza', 'pasta'] },
      { key: 'korean', match: ['korean', 'bbq'] },
      { key: 'indian', match: ['indian', 'curry'] },
      { key: 'thai', match: ['thai'] },
      { key: 'chinese', match: ['chinese', 'dim sum'] },
      { key: 'american', match: ['american', 'burger', 'steakhouse'] }
    ];

    for (const cuisine of cuisines) {
      if (cuisine.match.some(m => titleLower.includes(m) || descLower.includes(m))) {
        return `${cuisine.key} restaurant`;
      }
    }

    // 3. Check the user's travel plan's favorite food / culinary preferences
    if (selectedActivity.category === 'food' && plan) {
      if (plan.favoriteFood && plan.favoriteFood.length > 0) {
        return `${plan.favoriteFood[0]} restaurant`;
      }
      if (plan.restaurantPreferences && plan.restaurantPreferences.length > 0) {
        return `${plan.restaurantPreferences[0]} restaurant`;
      }
    }

    // 4. Category matching
    if (category === 'museum' || category === 'exhibition') return 'museum';
    if (category === 'nature') return 'park';
    if (category === 'shopping') return 'shopping center';

    return 'restaurant';
  };

  const currentKeyword = getNearbyKeyword();

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
    ? `${selectedActivity.place!.lat},${selectedActivity.place!.lng}`
    : encodeURIComponent(selectedActivity?.location || selectedActivity?.title || days[0]?.activities[0]?.location || 'Paris, France');

  const mapUrl = `https://maps.google.com/maps?q=${mapQuery}&t=&z=16&ie=UTF8&iwloc=&output=embed`;

  // Fetch nearby places when selected activity changes
  useEffect(() => {
    if (!selectedActivity?.place?.lat || !selectedActivity?.place?.lng) {
      setNearbyPlaces([]);
      return;
    }

    setIsLoadingNearby(true);
    const API_BASE = import.meta.env.VITE_API_URL || "";
    fetch(`${API_BASE}/api/nearby?lat=${selectedActivity.place.lat}&lng=${selectedActivity.place.lng}&keyword=${encodeURIComponent(currentKeyword)}`)
      .then(res => res.json())
      .then(data => {
        setNearbyPlaces(data.places || []);
        setIsLoadingNearby(false);
      })
      .catch(err => {
        console.error("Error fetching nearby places:", err);
        setIsLoadingNearby(false);
      });
  }, [selectedActivity, currentKeyword]);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-4 text-zinc-300">
      {/* Prominent Top Navigation Header */}
      <div className="flex items-center gap-3 bg-zinc-950 pb-2 border-b border-zinc-900">
        <Button
          variant="outline"
          size="sm"
          className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800 hover:text-white flex items-center gap-2 h-9 rounded-lg"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
          Back to Timeline
        </Button>
        <span className="text-zinc-700">|</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Route Map & Nearby Recommendations</span>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center text-zinc-400 flex flex-col items-center justify-center h-40">
              <MapPin className="size-8 mb-3 opacity-50" />
              <p className="text-sm">Select an activity on the map or schedule to view details</p>
            </div>
          )}

          {/* List of elements (Nearby suggestions if selected, else All Stops) */}
          <div className="mt-2">
            {selectedActivity ? (
              <>
                <h4 className="text-xs font-bold text-zinc-550 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  {currentKeyword === 'hotel' ? (
                    <>
                      <Hotel className="size-3.5 text-emerald-400" />
                      Similar Stays Nearby
                    </>
                  ) : (
                    <>
                      <Utensils className="size-3.5 text-emerald-400" />
                      Suggested Near Stop
                    </>
                  )}
                </h4>

                {/* 🌟 NEW WORKFLOW: SPONTANEOUS AD-HOC SEARCH OVERRIDE INPUT */}
                <div className="flex gap-1.5 mb-4">
                  <input
                    type="text"
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    placeholder="Search spontaneous (e.g. coffee, park, food)..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 placeholder-zinc-550"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSpontaneousSearch(customKeyword);
                    }}
                  />
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-[30px] font-semibold px-3 rounded-lg"
                    onClick={() => handleSpontaneousSearch(customKeyword)}
                  >
                    Go
                  </Button>
                </div>

                {isLoadingNearby ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-20 bg-zinc-900/50 border border-zinc-800/40 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : nearbyPlaces.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {nearbyPlaces.map((place) => (
                      <div
                        key={place.placeId}
                        className="flex flex-col gap-2 p-3.5 bg-zinc-900 border border-zinc-800/80 rounded-xl hover:border-zinc-700/80 transition-all text-left"
                      >
                        <div className="flex gap-3">
                          {place.photoUrl ? (
                            <img
                              src={place.photoUrl}
                              alt={place.name}
                              className="w-16 h-16 object-cover rounded-lg shrink-0 border border-zinc-800"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-zinc-950 rounded-lg shrink-0 flex items-center justify-center border border-zinc-800/50">
                              {currentKeyword === 'hotel' ? (
                                <Hotel className="size-5 text-zinc-650" />
                              ) : (
                                <Utensils className="size-5 text-zinc-650" />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <div>
                              <div className="flex items-start justify-between gap-1.5">
                                <h5 
                                  className="text-xs font-semibold text-white truncate hover:text-emerald-400 cursor-pointer transition-colors"
                                  onClick={() => window.open(`https://www.google.com/maps/place/?q=place_id:${place.placeId}`, '_blank')}
                                >
                                  {place.name}
                                </h5>
                                <ExternalLink 
                                  className="size-3 text-zinc-600 shrink-0 cursor-pointer hover:text-zinc-355 transition-colors" 
                                  onClick={() => window.open(`https://www.google.com/maps/place/?q=place_id:${place.placeId}`, '_blank')}
                                />
                              </div>
                              <p className="text-[10px] text-zinc-500 truncate mt-0.5">{place.vicinity}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              {place.rating && (
                                <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-0.5">
                                  ★ {place.rating.toFixed(1)}
                                </span>
                              )}
                              {place.priceLevel !== undefined && place.priceLevel > 0 && (
                                <span className="text-[10px] text-zinc-400 font-bold tracking-wider">
                                  {'$'.repeat(place.priceLevel)}
                                </span>
                              )}
                              {place.isOpenNow !== undefined && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${place.isOpenNow ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                  {place.isOpenNow ? 'Open' : 'Closed'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {onReplaceActivity && selectedActivity && (
                          <Button
                            size="sm"
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-[10px] font-extrabold h-8 mt-1 rounded-lg"
                            onClick={() => onReplaceActivity({
                              title: place.name,
                              location: place.vicinity,
                              description: `Discovered nearby: ${place.name} located at ${place.vicinity}.`,
                              place: {
                                placeId: place.placeId,
                                address: place.vicinity,
                                lat: selectedActivity.place?.lat || 0,
                                lng: selectedActivity.place?.lng || 0,
                                mapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.placeId}`
                              }
                            })}
                          >
                            Replace Current Stop
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
                    <Sparkles className="w-8 h-8 text-zinc-600 mb-3 animate-pulse" />
                    <p className="text-xs text-zinc-400 font-semibold mb-1">Looking for a change of pace?</p>
                    <p className="text-[11px] text-zinc-500 max-w-[220px] mb-4">
                      Ditch the planned itinerary! Grab your live location to fetch immediate local alternatives based on your profile.
                    </p>

                    <div className="flex flex-col gap-2 w-full max-w-[200px]">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] h-8 flex items-center gap-1.5"
                        onClick={() => {
                          if (!navigator.geolocation) return alert("Geolocation not supported by your browser");
                          setIsLoadingNearby(true);
                          navigator.geolocation.getCurrentPosition(async (pos) => {
                            try {
                              const { latitude, longitude } = pos.coords;
                              const data = await fetchSpontaneousBackup(latitude, longitude, "street-food");
                              setNearbyPlaces(data.places || []);
                            } catch (err) {
                              console.error("Spontaneous search failed:", err);
                            } finally {
                              setIsLoadingNearby(false);
                            }
                          }, () => setIsLoadingNearby(false));
                        }}
                      >
                        ✨ Find Nearby Street Food
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 font-medium text-[11px] h-8"
                        onClick={() => {
                          if (!navigator.geolocation) return alert("Geolocation not supported by your browser");
                          setIsLoadingNearby(true);
                          navigator.geolocation.getCurrentPosition(async (pos) => {
                            try {
                              const { latitude, longitude } = pos.coords;
                              const data = await fetchSpontaneousBackup(latitude, longitude, "cafe");
                              setNearbyPlaces(data.places || []);
                            } catch (err) {
                              console.error("Spontaneous search failed:", err);
                            } finally {
                              setIsLoadingNearby(false);
                            }
                          }, () => setIsLoadingNearby(false));
                        }}
                      >
                        ☕ Find Nearby Hidden Cafes
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">All Stops</h4>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
