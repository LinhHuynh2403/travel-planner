import { useEffect, useState } from "react";
import { apiFetch } from "./api";
import { useTranslation } from "./translations";

// Shared by home-view.tsx and trips-list.tsx so both screens fetch/delete/open
// trips through one implementation instead of drifting apart. Each screen
// still calls this independently (they're never mounted at the same time —
// the tab bar fully unmounts the inactive tab), so there's no shared-state
// synchronization to manage, just no duplicated logic.
export function useSavedTrips(onOpened: (tripId: string) => void) {
  const { t } = useTranslation();
  const [savedTrips, setSavedTrips] = useState<any[]>([]);
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
    try {
      const resp = await apiFetch(`/api/trips`);
      if (resp.ok) {
        const data = await resp.json();
        setSavedTrips(data.trips || []);
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
      if (resp.ok) setSavedTrips(prev => prev.filter(saved => saved.id !== trip.id));
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
  const upcomingTrips = savedTrips.filter(t => new Date(t.leave_date) >= today);
  const historyTrips = savedTrips.filter(t => new Date(t.leave_date) < today);

  return {
    savedTrips, upcomingTrips, historyTrips,
    loadingTripId, deletingTripId, fetchError,
    fetchTrips, deleteTrip, openTrip, isBroken,
  };
}
