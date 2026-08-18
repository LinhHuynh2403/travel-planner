import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "";

// Module-level cache (not localStorage — a photo reference from Google is
// only valid for a limited time, so it's not worth persisting across
// sessions) so every TripRow/hero card showing the same destination in the
// same session only triggers one Places lookup, not one per mount.
const cache = new Map<string, string | null>();

// A user's trip can be anywhere, unlike Home's curated destination pool
// (which has real photoRefs hand-picked and baked in) — this resolves one
// live via the backend's own Places proxy so no traveler's trip is stuck
// with a generic gradient tile just because it wasn't one of the 18
// pre-picked cities.
export function useDestinationPhoto(region: string): string | null {
  const [ref, setRef] = useState<string | null>(cache.get(region) ?? null);

  useEffect(() => {
    if (!region) return;
    if (cache.has(region)) {
      setRef(cache.get(region) ?? null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/destination-photo?region=${encodeURIComponent(region)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        cache.set(region, data.photoRef || null);
        if (!cancelled) setRef(data.photoRef || null);
      } catch (e) {
        console.error("Failed to load destination photo:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [region]);

  return ref;
}
