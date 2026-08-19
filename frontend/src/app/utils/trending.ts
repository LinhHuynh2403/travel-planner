import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "";

export type TrendingPlace = {
  placeId: string;
  title: string;
  photo: string | null;
  visitorCount: number;
  mapsUrl: string;
};

// Real specific-place trending within one destination — places other real
// travelers actually visited and publicly shared (see memories-view.tsx's
// markShared), not a fabricated "trending on social media" list. Empty
// unless the backend actually has qualifying data — no placeholder filler.
export function useTrendingPlaces(region: string): TrendingPlace[] {
  const [places, setPlaces] = useState<TrendingPlace[]>([]);
  useEffect(() => {
    if (!region) { setPlaces([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/trending-places?region=${encodeURIComponent(region)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (!cancelled) setPlaces(data.places || []);
      } catch (e) {
        console.error("Failed to load trending places:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [region]);
  return places;
}

export type TrendingDestination = { region: string; count: number };

// Destination-level trending for Home's new-user branch. Fetches the
// popularity-only result immediately (no permission prompt needed, so first
// paint is never blocked), then silently re-fetches with the traveler's
// current location if/when geolocation resolves — progressive enhancement,
// never a blocking prompt on first load.
export function useTrendingDestinations(enabled: boolean): TrendingDestination[] {
  const [destinations, setDestinations] = useState<TrendingDestination[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const fetchTrending = async (lat?: number, lng?: number) => {
      try {
        const qs = lat != null && lng != null ? `?lat=${lat}&lng=${lng}` : "";
        const resp = await fetch(`${API_BASE}/api/trending-destinations${qs}`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (!cancelled) setDestinations(data.destinations || []);
      } catch (e) {
        console.error("Failed to load trending destinations:", e);
      }
    };

    fetchTrending();

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { if (!cancelled) fetchTrending(pos.coords.latitude, pos.coords.longitude); },
        () => { /* denied or unavailable — the popularity-only result already loaded stands */ },
        { timeout: 5000, maximumAge: 10 * 60 * 1000 }
      );
    }

    return () => { cancelled = true; };
  }, [enabled]);
  return destinations;
}
