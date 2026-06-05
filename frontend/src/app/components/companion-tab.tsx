import { useState, useEffect, useRef, useCallback } from 'react';
import { GeneratedItinerary, ItineraryActivity } from '../types/travel';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import {
  Navigation,
  MapPin,
  Utensils,
  Coffee,
  Building2,
  Trees,
  ShoppingBag,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Radio,
  Loader2,
  X,
  Clock,
  AlertTriangle,
  Hotel
} from 'lucide-react';

interface CompanionTabProps {
  itinerary: GeneratedItinerary;
  onSwapActivity?: (dayNumber: number, activityIdx: number, newData: Partial<ItineraryActivity>) => void;
}

interface NearbyPlace {
  placeId: string;
  name: string;
  rating?: number;
  priceLevel?: number;
  isOpenNow?: boolean;
  vicinity: string;
  photoUrl?: string | null;
}

interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

type DiscoveryCategory = {
  id: string;
  label: string;
  icon: React.ElementType;
  keyword: string;
  color: string;
  bg: string;
  border: string;
};

const DISCOVERY_CATEGORIES: DiscoveryCategory[] = [
  { id: 'food', label: 'Restaurants', icon: Utensils, keyword: 'restaurant', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  { id: 'cafe', label: 'Cafes', icon: Coffee, keyword: 'cafe', color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { id: 'museum', label: 'Museums', icon: Building2, keyword: 'museum', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { id: 'park', label: 'Parks', icon: Trees, keyword: 'park', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, keyword: 'shopping mall', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  { id: 'hotel', label: 'Hotels', icon: Hotel, keyword: 'hotel', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
];

export function CompanionTab({ itinerary, onSwapActivity }: CompanionTabProps) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isTrackingLive, setIsTrackingLive] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const [activeCategory, setActiveCategory] = useState<DiscoveryCategory>(DISCOVERY_CATEGORIES[0]);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [customKeyword, setCustomKeyword] = useState('');

  const [swapTarget, setSwapTarget] = useState<{ dayNumber: number; activityIdx: number; activity: ItineraryActivity } | null>(null);
  const [swapSuccess, setSwapSuccess] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const API_BASE = import.meta.env.VITE_API_URL || '';

  // Get the next upcoming activity based on current time
  const getNextActivity = useCallback((): { activity: ItineraryActivity; dayNumber: number; actIdx: number } | null => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    for (const day of itinerary.days) {
      for (let i = 0; i < day.activities.length; i++) {
        const act = day.activities[i];
        const timeStr = act.time || '';
        const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
          let hours = parseInt(match[1]);
          const mins = parseInt(match[2]);
          const period = match[3].toUpperCase();
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          const actMinutes = hours * 60 + mins;
          if (actMinutes >= nowMinutes) {
            return { activity: act, dayNumber: day.dayNumber, actIdx: i };
          }
        }
      }
    }
    return null;
  }, [itinerary.days]);

  // Fetch nearby places
  const fetchNearby = useCallback(async (lat: number, lng: number, keyword: string) => {
    setIsLoadingNearby(true);
    try {
      const res = await fetch(`${API_BASE}/api/nearby?lat=${lat}&lng=${lng}&keyword=${encodeURIComponent(keyword)}`);
      const data = await res.json();
      setNearbyPlaces(data.places || []);
    } catch (err) {
      console.error('Nearby fetch failed:', err);
      setNearbyPlaces([]);
    } finally {
      setIsLoadingNearby(false);
    }
  }, [API_BASE]);

  // Start live location tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLoadingLocation(true);
    setLocationError(null);
    setIsTrackingLive(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: UserLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        setUserLocation(loc);
        setIsLoadingLocation(false);
        fetchNearby(loc.lat, loc.lng, activeCategory.keyword);
      },
      (err) => {
        setLocationError(`Location error: ${err.message}`);
        setIsLoadingLocation(false);
        setIsTrackingLive(false);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
    );
  };

  // Stop live tracking
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTrackingLive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Refresh nearby when category changes (if location is available)
  useEffect(() => {
    if (userLocation) {
      fetchNearby(userLocation.lat, userLocation.lng, activeCategory.keyword);
    }
  }, [activeCategory, userLocation, fetchNearby]);

  const handleCustomSearch = () => {
    if (!customKeyword.trim() || !userLocation) return;
    fetchNearby(userLocation.lat, userLocation.lng, customKeyword.trim());
  };

  const handleSwap = (place: NearbyPlace) => {
    if (!swapTarget || !onSwapActivity) return;
    onSwapActivity(swapTarget.dayNumber, swapTarget.activityIdx, {
      title: place.name,
      location: place.vicinity,
      description: `Spontaneously discovered nearby: ${place.name} — ${place.vicinity}. Swapped in via Live Companion mode.`,
      place: {
        placeId: place.placeId,
        address: place.vicinity,
        lat: userLocation?.lat || 0,
        lng: userLocation?.lng || 0,
        mapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.placeId}`,
      },
    });
    setSwapSuccess(`"${place.name}" swapped into Day ${swapTarget.dayNumber}!`);
    setSwapTarget(null);
    setTimeout(() => setSwapSuccess(null), 4000);
  };

  const mapEmbedUrl = userLocation
    ? `https://maps.google.com/maps?q=${userLocation.lat},${userLocation.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(itinerary.plan.region)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

  const nextActivity = getNextActivity();
  const regionName = itinerary.plan.region;

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-32">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Radio className="size-5 text-emerald-400 animate-pulse" />
              Live Companion Mode
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Real-time location tracking, dynamic replanning, and spontaneous discovery in {regionName.split(',')[0]}.
            </p>
          </div>

          {/* Live Tracking Toggle */}
          <div className="flex items-center gap-3">
            {isTrackingLive ? (
              <Button
                onClick={stopTracking}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-2"
                variant="outline"
              >
                <X className="size-4" /> Stop Tracking
              </Button>
            ) : (
              <Button
                onClick={startTracking}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-zinc-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {isLoadingLocation ? <Loader2 className="size-4 animate-spin" /> : <Navigation className="size-4" />}
                {isLoadingLocation ? 'Locating...' : 'Start Live Tracking'}
              </Button>
            )}
          </div>
        </div>

        {/* Success Toast */}
        {swapSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2 animate-in fade-in duration-300">
            <Sparkles className="size-4 text-emerald-400 shrink-0" />
            {swapSuccess}
          </div>
        )}

        {/* Location Error */}
        {locationError && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            {locationError}
          </div>
        )}

        {/* Swap Target Banner */}
        {swapTarget && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-400 shrink-0 animate-pulse" />
              <span>Tap <strong>"Swap In"</strong> on any nearby place to replace <strong>"{swapTarget.activity.title}"</strong> (Day {swapTarget.dayNumber})</span>
            </div>
            <button onClick={() => setSwapTarget(null)} className="text-amber-400/60 hover:text-amber-400 transition-colors">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Main Grid: Map + Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Live Map */}
          <div className="md:col-span-2 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 relative" style={{ minHeight: '340px' }}>
            <iframe
              src={mapEmbedUrl}
              className="w-full h-full border-0"
              style={{ minHeight: '340px' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            {isTrackingLive && userLocation && (
              <div className="absolute top-3 left-3 bg-zinc-950/90 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm shadow-lg">
                <span className="size-2 rounded-full bg-emerald-400 animate-ping absolute inline-flex" />
                <span className="size-2 rounded-full bg-emerald-400 relative inline-flex" />
                LIVE
              </div>
            )}
            {!isTrackingLive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/70 backdrop-blur-sm">
                <Navigation className="size-10 text-zinc-500 mb-3" />
                <p className="text-zinc-400 text-sm font-semibold">Start tracking to see your live position</p>
                <p className="text-zinc-600 text-xs mt-1">Showing destination overview</p>
              </div>
            )}
          </div>

          {/* Status Panel */}
          <div className="flex flex-col gap-4">
            {/* GPS Status Card */}
            <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
              <CardContent className="p-5 space-y-4">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">GPS Status</h4>
                {userLocation ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                      <span className="text-xs text-emerald-300 font-semibold">Signal Acquired</span>
                    </div>
                    <div className="space-y-1 text-[11px] text-zinc-400">
                      <p>Lat: <span className="text-white font-mono">{userLocation.lat.toFixed(5)}</span></p>
                      <p>Lng: <span className="text-white font-mono">{userLocation.lng.toFixed(5)}</span></p>
                      <p>Accuracy: <span className="text-amber-300 font-semibold">±{Math.round(userLocation.accuracy)}m</span></p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 flex items-center gap-1.5"
                      onClick={() => window.open(`https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}`, '_blank')}
                    >
                      <ExternalLink className="size-3" /> Open in Google Maps
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="size-2.5 rounded-full bg-zinc-600 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500">No signal</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Start tracking to activate</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Next Activity Card */}
            <Card className="bg-zinc-900 border-zinc-800 shadow-xl flex-1">
              <CardContent className="p-5 space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="size-3.5 text-indigo-400" /> Up Next
                </h4>
                {nextActivity ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">{nextActivity.activity.title}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">{nextActivity.activity.time} · Day {nextActivity.dayNumber}</p>
                      <p className="text-[10px] text-zinc-400 mt-1 truncate">{nextActivity.activity.location}</p>
                    </div>
                    {onSwapActivity && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-[10px] border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-bold flex items-center gap-1.5"
                        onClick={() => setSwapTarget({ dayNumber: nextActivity.dayNumber, activityIdx: nextActivity.actIdx, activity: nextActivity.activity })}
                      >
                        <Sparkles className="size-3" /> Skip & Discover Alternative
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 text-center py-4">No upcoming activities found for today.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Nearby Discovery Section */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
            <h3 className="font-bold text-sm text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="size-4 text-amber-400" /> Nearby Discovery Engine
              {!userLocation && <span className="text-[10px] font-normal text-zinc-500 normal-case">(Start tracking to enable live discovery)</span>}
            </h3>
            {userLocation && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customKeyword}
                  onChange={e => setCustomKeyword(e.target.value)}
                  placeholder="Search anything nearby..."
                  onKeyDown={e => e.key === 'Enter' && handleCustomSearch()}
                  className="bg-zinc-950 border border-zinc-800 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 placeholder-zinc-600 w-48"
                />
                <Button
                  size="sm"
                  onClick={handleCustomSearch}
                  className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs px-3 h-8"
                >
                  Go
                </Button>
              </div>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mb-5">
            {DISCOVERY_CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory.id === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${isActive
                    ? `${cat.bg} ${cat.color} ${cat.border} shadow-sm`
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
                >
                  <Icon className="size-3.5" /> {cat.label}
                </button>
              );
            })}
          </div>

          {/* Results */}
          {!userLocation ? (
            <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-3">
              <Navigation className="size-10 text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-400">Activate Live Tracking</p>
              <p className="text-xs text-zinc-600 max-w-xs">Your live GPS location is needed to discover restaurants, cafes, parks, and more nearby.</p>
              <Button
                onClick={startTracking}
                className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-extrabold text-xs mt-2 flex items-center gap-2"
              >
                <Navigation className="size-4" /> Start Tracking Now
              </Button>
            </div>
          ) : isLoadingNearby ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-36 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : nearbyPlaces.length === 0 ? (
            <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-10 text-center">
              <p className="text-sm text-zinc-500">No results found nearby. Try a different category or search term.</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4 border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs flex items-center gap-1.5 mx-auto"
                onClick={() => fetchNearby(userLocation.lat, userLocation.lng, activeCategory.keyword)}
              >
                <RefreshCw className="size-3.5" /> Retry
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nearbyPlaces.map(place => {
                const Icon = activeCategory.icon;
                const isSwapTarget = swapTarget !== null;

                return (
                  <div
                    key={place.placeId}
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl overflow-hidden transition-all shadow-md flex flex-col"
                  >
                    {/* Photo or Placeholder */}
                    {place.photoUrl ? (
                      <img src={place.photoUrl} alt={place.name} className="w-full h-28 object-cover" />
                    ) : (
                      <div className={`w-full h-28 flex items-center justify-center ${activeCategory.bg}`}>
                        <Icon className={`size-8 ${activeCategory.color} opacity-50`} />
                      </div>
                    )}

                    {/* Info */}
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <div>
                        <p className="text-xs font-extrabold text-white leading-tight truncate">{place.name}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{place.vicinity}</p>
                      </div>

                      {/* Metadata row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {place.rating && (
                          <span className="text-[10px] text-amber-400 font-semibold">★ {place.rating.toFixed(1)}</span>
                        )}
                        {place.priceLevel !== undefined && place.priceLevel > 0 && (
                          <span className="text-[10px] text-zinc-400 font-bold">{'$'.repeat(place.priceLevel)}</span>
                        )}
                        {place.isOpenNow !== undefined && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${place.isOpenNow ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {place.isOpenNow ? 'Open' : 'Closed'}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-auto pt-2">
                        <a
                          href={`https://www.google.com/maps/place/?q=place_id:${place.placeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button size="sm" variant="outline" className="w-full text-[10px] border-zinc-700 text-zinc-400 hover:bg-zinc-800 h-7 flex items-center gap-1">
                            <ExternalLink className="size-3" /> Maps
                          </Button>
                        </a>
                        {isSwapTarget && onSwapActivity && (
                          <Button
                            size="sm"
                            className="flex-1 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-extrabold h-7"
                            onClick={() => handleSwap(place)}
                          >
                            Swap In ✓
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
