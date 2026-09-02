import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import { supabase } from "./supabaseClient";
import { useTranslation } from "./translations";

// Module-level, not per-hook-instance: Home and Trips each mount their own
// useSavedTrips() (they're never mounted at the same time — the tab bar
// fully unmounts the inactive tab), and without this, every single tab
// switch re-fetched from empty, flashing the "no trips yet" / new-user state
// for the ~1s round trip before showing what was already known a moment
// ago. Seeding state from this cache on mount kills that flash; fetchTrips
// still runs in the background every mount to keep it current.
let tripsCache: any[] | null = null;

// Shared by home-view.tsx and trips-list.tsx so both screens fetch/delete/open
// trips through one implementation instead of drifting apart.
export function useSavedTrips(onOpened: (tripId: string) => void) {
  const { t } = useTranslation();
  const [savedTrips, setSavedTrips] = useState<any[]>(tripsCache ?? []);
  // Only true before the very first fetch of the session has resolved
  // (tripsCache still null) — lets a caller avoid confidently declaring
  // "new user, no trips" before it actually knows that.
  const [loading, setLoading] = useState(tripsCache === null);
  const [loadingTripId, setLoadingTripId] = useState<string | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);

  // A trip can end up with no itinerary at all if generation succeeded but
  // saving it failed partway (see the /api/trips POST route) — before the
  // rollback fix, that left a permanent "ghost" trip stuck showing "No
  // itinerary data" with no way to open or remove it. Flag it so the
  // traveler can tell it's broken, and delete below so it isn't stuck.
  const isBroken = (trip: any) => !trip.itineraries || trip.itineraries.length === 0;

  const fetchTrips = async () => {
    // Signed out (e.g. right after tapping "Sign out", or a guest who never
    // signed in) is not an error — there's simply no session to fetch trips
    // with. Only treat a failure as "your session may have expired" when a
    // session actually existed and the call still failed.
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      tripsCache = [];
      setSavedTrips([]);
      setFetchError(false);
      setLoading(false);
      return;
    }
    try {
      const resp = await apiFetch(`/api/trips`);
      if (resp.ok) {
        const json = await resp.json();
        const trips = json.trips || [];
        tripsCache = trips;
        setSavedTrips(trips);
        setFetchError(false);
      } else {
        // A non-401 failure here used to look identical to "you have no
        // trips" — an expired/unrefreshed session (see the auto-refresh
        // wiring in jourzy-app.tsx) silently emptied this list with zero
        // indication anything went wrong. Surface it instead.
        setFetchError(true);
      }
    } catch (e) {
      console.error(e);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const deleteTrip = async (trip: any, e: any) => {
    e.stopPropagation();
    if (!window.confirm(t("nav.deleteTripConfirm"))) return;
    setDeletingTripId(trip.id);
    try {
      const resp = await apiFetch(`/api/trips/${trip.id}`, { method: "DELETE" });
      if (resp.ok) {
        setSavedTrips(prev => {
          const next = prev.filter(saved => saved.id !== trip.id);
          tripsCache = next;
          return next;
        });
      }
    } catch (e) {
      console.error("Failed to delete trip:", e);
    } finally {
      setDeletingTripId(null);
    }
  };

  const openTrip = async (trip: any) => {
    setLoadingTripId(trip.id);
    try {
      const resp = await apiFetch(`/api/trips/${trip.id}`);
      if (!resp.ok) throw new Error('Failed to load trip');
      const { trip: tripRow, itinerary, memories } = await resp.json();
      const isPast = new Date(tripRow.leave_date) < new Date();
      const generated = {
        tripId: String(trip.id),
        plan: {
          region: tripRow.region,
          arrivalDate: tripRow.arrival_date,
          leaveDate: tripRow.leave_date,
          budget: tripRow.budget,
          whoTraveling: tripRow.who_traveling,
        },
        days: itinerary?.days || [],
        packingList: itinerary?.packing_list,
        hotelRecommendation: itinerary?.hotel_recommendation,
        insights: itinerary?.insights,
        logisticsGuide: itinerary?.logistics_guide,
        memories: memories || [],
      };

      localStorage.setItem('generatedItinerary', JSON.stringify(generated));
      localStorage.setItem('travelPlan', JSON.stringify(generated.plan));
      localStorage.setItem('viewingPastTrip', JSON.stringify(isPast));

      if (isPast || localStorage.getItem('itineraryChatTripId') !== String(trip.id)) {
        localStorage.removeItem('itineraryChatMessages');
        localStorage.setItem('itineraryChatTripId', String(trip.id));
      }
      onOpened(String(trip.id));
    } catch (e) {
      console.error('Failed to open trip:', e);
    } finally {
      setLoadingTripId(null);
    }
  };

  const today = new Date();
  // The backend returns trips ordered by created_at (see idx_trips_user_created
  // in schema.sql), which is when a trip was PLANNED, not when it's actually
  // happening — a trip generated last week for next month showed above one
  // generated yesterday for tomorrow. Travelers care about departure order,
  // not planning order: soonest-upcoming first, most-recently-completed first.
  const upcomingTrips = savedTrips
    .filter(t => new Date(t.leave_date) >= today)
    .sort((a, b) => new Date(a.arrival_date).getTime() - new Date(b.arrival_date).getTime());
  const historyTrips = savedTrips
    .filter(t => new Date(t.leave_date) < today)
    .sort((a, b) => new Date(b.leave_date).getTime() - new Date(a.leave_date).getTime());

  return {
    savedTrips, upcomingTrips, historyTrips,
    loadingTripId, deletingTripId, fetchError, loading,
    fetchTrips, deleteTrip, openTrip, isBroken,
  };
}
