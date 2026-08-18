import { Bookmark, History } from "lucide-react";
import { C } from "./jourzy-theme";
import { TripRow } from "./trip-row";
import { useSavedTrips } from "../../utils/useSavedTrips";
import { useTranslation } from "../../utils/translations";

export default function TripsList({ open, goChat }: { open: (id: string) => void, goChat: () => void }) {
  const { t } = useTranslation();
  const { upcomingTrips, historyTrips, loadingTripId, deletingTripId, fetchError, loading, fetchTrips, deleteTrip, openTrip, isBroken } = useSavedTrips(open);

  return (
    <div className="px-4 pb-4 pt-4">
      {fetchError && (
        <div className="rounded-jz-card p-3.5 mb-3 flex items-center justify-between gap-3" style={{ background: "rgba(196, 58, 47, 0.15)", color: C.hanko }}>
          <span className="text-xs leading-relaxed flex-1">{t("nav.tripsLoadError")}</span>
          <button onClick={fetchTrips} className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: C.hanko, color: "#fff" }}>
            {t("nav.retry")}
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 text-jz-label font-bold tracking-widest mt-1 mb-2" style={{ color: C.green }}>
        <Bookmark size={13} /> {t("nav.upcoming")}
      </div>

      {upcomingTrips.length > 0 ? (
        <div className="space-y-2.5">
          {upcomingTrips.map((trip: any) => (
            <TripRow
              key={trip.id}
              trip={trip}
              onOpen={() => !isBroken(trip) && openTrip(trip)}
              onDelete={(e) => deleteTrip(trip, e)}
              loading={loadingTripId === trip.id}
              deleting={deletingTripId === trip.id}
              broken={isBroken(trip)}
            />
          ))}
        </div>
      ) : !loading && (
        // Guarded on !loading so this doesn't flash before the (now cached,
        // usually instant) fetch has actually confirmed there's nothing —
        // same fix as Home's isNewUser hero.
        <div className="rounded-jz-card p-5 text-center" style={{ background: C.card, border: `1px dashed ${C.line}` }}>
          <div className="text-jz-body-big font-bold mb-1" style={{ color: C.ink }}>{t("nav.noUpcomingTrips")}</div>
          <p className="text-jz-label mb-3" style={{ color: C.sub }}>{t("nav.planInChatTab")}</p>
          <button onClick={goChat} className="px-5 py-2 rounded-full text-jz-label font-bold text-white" style={{ background: C.green }}>{t("nav.startPlanning")}</button>
        </div>
      )}

      {historyTrips.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-jz-label font-bold tracking-widest mt-5 mb-2" style={{ color: C.sub }}>
            <History size={13} /> {t("nav.history")}
          </div>
          <div className="space-y-2.5">
            {historyTrips.map((trip: any) => (
              <TripRow
                key={trip.id}
                trip={trip}
                onOpen={() => !isBroken(trip) && openTrip(trip)}
                onDelete={(e) => deleteTrip(trip, e)}
                loading={loadingTripId === trip.id}
                deleting={deletingTripId === trip.id}
                broken={isBroken(trip)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
