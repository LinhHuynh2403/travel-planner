import { useState, useEffect } from 'react';
import { GeneratedItinerary } from '../types/travel';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  Sparkles,
  Music,
  ShoppingBag,
  Trophy,
  Image,
  PartyPopper,
  ExternalLink,
  RefreshCw,
  Calendar,
  MapPin,
  Star,
  Loader2
} from 'lucide-react';

interface EventsTabProps {
  itinerary: GeneratedItinerary;
}

interface DiscoveredEvent {
  id: string;
  type: 'festival' | 'concert' | 'market' | 'sports' | 'exhibition';
  title: string;
  location: string;
  description: string;
  date?: string;
  mapsUrl?: string;
  rating?: number;
  imageUrl?: string | null;
}

const EVENT_TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  festival: { icon: PartyPopper, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', label: 'Festival' },
  concert: { icon: Music, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'Concert' },
  market: { icon: ShoppingBag, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Market' },
  sports: { icon: Trophy, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', label: 'Sports' },
  exhibition: { icon: Image, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Exhibition' },
};

export function EventsTab({ itinerary }: EventsTabProps) {
  const [events, setEvents] = useState<DiscoveredEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const region = itinerary.plan.region;
  const arrivalDate = itinerary.plan.arrivalDate?.toISOString?.()?.split('T')[0] || '';
  const leaveDate = itinerary.plan.leaveDate?.toISOString?.()?.split('T')[0] || '';
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/events?region=${encodeURIComponent(region)}&arrivalDate=${arrivalDate}&leaveDate=${leaveDate}`
      );
      if (!res.ok) throw new Error('Failed to load events');
      const data = await res.json();
      setEvents(data.events || []);
    } catch (e: any) {
      setError(e.message || 'Could not load events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [region]);

  const allTypes = ['all', ...Array.from(new Set(events.map(e => e.type)))];
  const filtered = activeFilter === 'all' ? events : events.filter(e => e.type === activeFilter);

  const formatDate = (d?: string) => {
    if (!d) return null;
    try {
      return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return d; }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-32">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <PartyPopper className="size-6 text-pink-400" />
              Event Discovery — {region.split(',')[0]}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Festivals, concerts, markets, sports, and exhibitions happening in {region.split(',')[0]} during your trip
              {arrivalDate && leaveDate ? ` (${formatDate(arrivalDate)} – ${formatDate(leaveDate)})` : ''}.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchEvents}
            disabled={isLoading}
            className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 flex items-center gap-2 shrink-0"
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
        </div>

        {/* Date Range Banner */}
        <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 px-4 py-3 rounded-xl">
          <Calendar className="size-4 text-emerald-400 shrink-0" />
          <p className="text-xs text-zinc-300">
            Showing events and venues around your stay:&nbsp;
            <span className="font-bold text-white">{formatDate(arrivalDate)}</span>
            {leaveDate && arrivalDate !== leaveDate && (
              <> &rarr; <span className="font-bold text-white">{formatDate(leaveDate)}</span></>
            )}
          </p>
        </div>

        {/* Filter Pills */}
        {!isLoading && events.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTypes.map(type => {
              const meta = type === 'all' ? null : EVENT_TYPE_META[type];
              const isActive = activeFilter === type;
              const Icon = meta?.icon;
              return (
                <button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all capitalize ${isActive
                      ? meta
                        ? `${meta.bg} ${meta.color} ${meta.border}`
                        : 'bg-zinc-800 text-white border-zinc-700'
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
                >
                  {Icon && <Icon className="size-3.5" />}
                  {type === 'all' ? `All Events (${events.length})` : meta?.label || type}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-zinc-900/60 border border-zinc-800/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
            <Sparkles className="size-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-400">No events found for this filter</p>
            <p className="text-xs text-zinc-600 mt-1">Try selecting a different category or refreshing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(event => {
              const meta = EVENT_TYPE_META[event.type] || EVENT_TYPE_META.festival;
              const Icon = meta.icon;

              return (
                <Card key={event.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all shadow-lg overflow-hidden flex flex-col">
                  {/* Image / Placeholder header */}
                  {event.imageUrl ? (
                    <img src={event.imageUrl} alt={event.title} className="w-full h-36 object-cover" />
                  ) : (
                    <div className={`w-full h-36 flex flex-col items-center justify-center gap-2 ${meta.bg}`}>
                      <Icon className={`size-10 ${meta.color} opacity-60`} />
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.color} opacity-70`}>{meta.label}</span>
                    </div>
                  )}

                  <CardContent className="p-5 flex flex-col gap-3 flex-1">
                    {/* Type badge + title */}
                    <div>
                      <div className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} ${meta.border} border mb-2`}>
                        <Icon className="size-2.5" /> {meta.label}
                      </div>
                      <h3 className="font-bold text-sm text-white leading-tight line-clamp-2">{event.title}</h3>
                    </div>

                    {/* Location */}
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1 truncate">
                      <MapPin className="size-3 shrink-0 text-zinc-600" />
                      {event.location}
                    </p>

                    {/* Description */}
                    <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-3 flex-1">{event.description}</p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-800 mt-auto">
                      <div className="flex items-center gap-2">
                        {event.rating && (
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-semibold">
                            <Star className="size-3 fill-amber-400" /> {event.rating.toFixed(1)}
                          </span>
                        )}
                        {event.date && (
                          <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
                            <Calendar className="size-3" /> {formatDate(event.date)}
                          </span>
                        )}
                      </div>
                      {event.mapsUrl && (
                        <a href={event.mapsUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="text-[10px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-7 px-2 flex items-center gap-1">
                            <ExternalLink className="size-3" /> View
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
