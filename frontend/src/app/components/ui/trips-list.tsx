import { useState, useEffect } from "react";
import { Bookmark, History } from "lucide-react";
import { C, display } from "./jourzy-theme";
import { Seal } from "./jourzy-seal";
import { apiFetch } from "../../utils/api";
import { useTranslation } from "../../utils/translations";

export default function TripsList({ open, goChat }: { open: (id: string) => void, goChat: () => void }) {
  const { t } = useTranslation();
  const [savedTrips, setSavedTrips] = useState<any[]>([]);
  const [loadingTripId, setLoadingTripId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const resp = await apiFetch(`/api/trips`);
        if (resp.ok) {
          const data = await resp.json();
          setSavedTrips(data.trips || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchTrips();
  }, []);

  const openTrip = async (trip: any) => {
    setLoadingTripId(trip.id);
    try {
      const resp = await apiFetch(`/api/trips/${trip.id}`);
      if (!resp.ok) throw new Error('Failed to load trip');
      const { trip: tripRow, itinerary } = await resp.json();
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
      };
      
      localStorage.setItem('generatedItinerary', JSON.stringify(generated));
      localStorage.setItem('travelPlan', JSON.stringify(generated.plan));
      localStorage.setItem('viewingPastTrip', JSON.stringify(isPast));

      if (isPast || localStorage.getItem('itineraryChatTripId') !== String(trip.id)) {
        localStorage.removeItem('itineraryChatMessages');
        localStorage.setItem('itineraryChatTripId', String(trip.id));
      }
      open(String(trip.id));
    } catch (e) {
      console.error('Failed to open trip:', e);
    } finally {
      setLoadingTripId(null);
    }
  };

  const today = new Date();
  const upcomingTrips = savedTrips.filter(t => new Date(t.leave_date) >= today);
  const historyTrips = savedTrips.filter(t => new Date(t.leave_date) < today);

  return (
    <div className="px-4 pb-4 pt-4">
      <div className="flex items-center gap-2 text-xs font-bold tracking-widest mt-1 mb-2" style={{ color: C.green }}>
        <Bookmark size={13} /> {t("nav.upcoming")}
      </div>
      
      {upcomingTrips.length > 0 ? (
        <div className="space-y-3">
          {upcomingTrips.map((trip: any) => (
            <button key={trip.id} onClick={() => openTrip(trip)} disabled={loadingTripId === trip.id} className="w-full text-left rounded-2xl p-4 text-white relative overflow-hidden" style={{ background: C.ink }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div style={{ ...display, fontSize: 20 }} className="capitalize">{trip.region}</div>
                  <div className="text-xs opacity-75 mt-0.5">
                    {new Date(trip.arrival_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {new Date(trip.leave_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {' · '}{Math.floor((new Date(trip.leave_date).getTime() - new Date(trip.arrival_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                    {' · '}{trip.who_traveling}
                  </div>
                </div>
                <Seal />
              </div>
              <div className="flex justify-between items-center text-[11px] opacity-90">
                <div className="flex gap-3">
                  <span className="px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.1)" }}>
                    {trip.itineraries?.[0]?.days?.reduce((acc: number, d: any) => acc + d.activities.length, 0) || 0} verified places
                  </span>
                  {trip.itineraries?.[0]?.insights?.budgetSummary?.totalEstimatedCost ? (
                    <span className="px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.1)" }}>
                      ${trip.itineraries[0].insights.budgetSummary.totalEstimatedCost} of {trip.budget || "budget"}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.1)" }}>
                      {trip.budget || "Budget not set"}
                    </span>
                  )}
                </div>
                <span className="px-3 py-1 rounded-full font-bold" style={{ background: C.green, color: "#fff" }}>
                  {loadingTripId === trip.id ? t("nav.loading") : "Open →"}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl p-5 text-center" style={{ background: C.card, border: `1px dashed ${C.line}` }}>
          <div className="text-sm font-bold mb-1" style={{ color: C.ink }}>No upcoming trips yet</div>
          <p className="text-xs mb-3" style={{ color: C.sub }}>Plan one in the Chat tab — it saves here automatically, so you can keep it and plan more.</p>
          <button onClick={goChat} className="px-5 py-2 rounded-full text-xs font-bold text-white" style={{ background: C.green }}>Start planning</button>
        </div>
      )}

      {historyTrips.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest mt-5 mb-2" style={{ color: C.sub }}>
            <History size={13} /> {t("nav.history")}
          </div>
          <div className="space-y-3">
            {historyTrips.map((trip: any) => (
              <button key={trip.id} onClick={() => openTrip(trip)} disabled={loadingTripId === trip.id} className="w-full text-left rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="flex justify-between items-center">
                  <div>
                    <div style={{ ...display, fontSize: 18, color: C.ink }} className="capitalize">{trip.region}</div>
                    <div className="text-xs mt-0.5" style={{ color: C.sub }}>
                      {new Date(trip.arrival_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – {new Date(trip.leave_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{trip.itineraries?.[0]?.days?.reduce((acc: number, d: any) => acc + d.activities.length, 0) || 0} places visited
                    </div>
                  </div>
                  <span className="text-xs font-bold" style={{ color: C.green }}>
                    {loadingTripId === trip.id ? t("nav.loading") : "Relive →"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
