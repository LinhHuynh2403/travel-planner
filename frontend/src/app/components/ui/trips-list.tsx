import { useState, useEffect } from "react";
import { Bookmark, History, Trash2 } from "lucide-react";
import { C, display } from "./jourzy-theme";
import { Seal } from "./jourzy-seal";
import { apiFetch } from "../../utils/api";
import { useTranslation } from "../../utils/translations";

export default function TripsList({ open, goChat }: { open: (id: string) => void, goChat: () => void }) {
  const { t } = useTranslation();
  const [savedTrips, setSavedTrips] = useState<any[]>([]);
  const [loadingTripId, setLoadingTripId] = useState<string | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);

  // A trip can end up with no itinerary at all if generation succeeded but
  // saving it failed partway (see the /api/trips POST route) — before the
  // rollback fix, that left a permanent "ghost" trip stuck showing "No
  // itinerary data" with no way to open or remove it. Flag it so the
  // traveler can tell it's broken, and delete below so it isn't stuck.
  const isBroken = (trip: any) => !trip.itineraries || trip.itineraries.length === 0;

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
            <button key={trip.id} onClick={() => !isBroken(trip) && openTrip(trip)} disabled={loadingTripId === trip.id} className="w-full text-left rounded-2xl p-4 text-white relative overflow-hidden" style={{ background: C.ink }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div style={{ ...display, fontSize: 20 }} className="capitalize">{trip.region}</div>
                  <div className="text-xs opacity-75 mt-0.5">
                    {new Date(trip.arrival_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {new Date(trip.leave_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {' · '}{t("nav.daysCount").replace("{{n}}", String(Math.floor((new Date(trip.leave_date).getTime() - new Date(trip.arrival_date).getTime()) / (1000 * 60 * 60 * 24)) + 1))}
                    {' · '}{trip.who_traveling}
                  </div>
                </div>
                <Seal />
              </div>
              <div className="flex justify-between items-center gap-1.5 text-[11px] opacity-90">
                <div className="flex gap-1.5 min-w-0 overflow-hidden">
                  {isBroken(trip) ? (
                    <span className="px-2 py-0.5 rounded font-bold whitespace-nowrap" style={{ background: "rgba(239,68,68,0.25)", color: "#FCA5A5" }}>
                      {t("nav.tripBroken")}
                    </span>
                  ) : (
                    <>
                      <span className="px-2 py-0.5 rounded whitespace-nowrap shrink-0" style={{ background: "rgba(255,255,255,0.1)" }}>
                        {t("nav.places").replace("{{n}}", String(trip.itineraries?.[0]?.days?.reduce((acc: number, d: any) => acc + d.activities.length, 0) || 0))}
                      </span>
                      {trip.itineraries?.[0]?.insights?.budgetSummary?.totalEstimatedCost ? (
                        <span className="px-2 py-0.5 rounded whitespace-nowrap truncate" style={{ background: "rgba(255,255,255,0.1)" }}>
                          ${trip.itineraries[0].insights.budgetSummary.totalEstimatedCost} {t("ui.of")} {trip.budget || t("nav.budgetFallback")}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded whitespace-nowrap truncate" style={{ background: "rgba(255,255,255,0.1)" }}>
                          {trip.budget || t("nav.budgetNotSet")}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span onClick={(e) => deleteTrip(trip, e)} className="p-1.5 rounded-full shrink-0" style={{ background: "rgba(255,255,255,0.1)" }}>
                    {deletingTripId === trip.id ? <span className="text-[10px]">…</span> : <Trash2 size={12} />}
                  </span>
                  {!isBroken(trip) && (
                    <span className="px-3 py-1 rounded-full font-bold whitespace-nowrap" style={{ background: C.green, color: "#fff" }}>
                      {loadingTripId === trip.id ? t("nav.loading") : t("nav.openArrow")}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl p-5 text-center" style={{ background: C.card, border: `1px dashed ${C.line}` }}>
          <div className="text-sm font-bold mb-1" style={{ color: C.ink }}>{t("nav.noUpcomingTrips")}</div>
          <p className="text-xs mb-3" style={{ color: C.sub }}>{t("nav.planInChatTab")}</p>
          <button onClick={goChat} className="px-5 py-2 rounded-full text-xs font-bold text-white" style={{ background: C.green }}>{t("nav.startPlanning")}</button>
        </div>
      )}

      {historyTrips.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest mt-5 mb-2" style={{ color: C.sub }}>
            <History size={13} /> {t("nav.history")}
          </div>
          <div className="space-y-3">
            {historyTrips.map((trip: any) => (
              <button key={trip.id} onClick={() => !isBroken(trip) && openTrip(trip)} disabled={loadingTripId === trip.id} className="w-full text-left rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <div style={{ ...display, fontSize: 18, color: C.ink }} className="capitalize truncate">{trip.region}</div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: C.sub }}>
                      {new Date(trip.arrival_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – {new Date(trip.leave_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{isBroken(trip) ? t("nav.tripBroken") : t("nav.placesVisited").replace("{{n}}", String(trip.itineraries?.[0]?.days?.reduce((acc: number, d: any) => acc + d.activities.length, 0) || 0))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span onClick={(e) => deleteTrip(trip, e)} className="p-1.5 rounded-full shrink-0" style={{ color: C.sub }}>
                      {deletingTripId === trip.id ? <span className="text-[10px]">…</span> : <Trash2 size={12} />}
                    </span>
                    {!isBroken(trip) && (
                      <span className="text-xs font-bold whitespace-nowrap" style={{ color: C.green }}>
                        {loadingTripId === trip.id ? t("nav.loading") : t("nav.reliveArrow")}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
