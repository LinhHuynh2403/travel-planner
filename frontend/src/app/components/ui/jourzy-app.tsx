import { useState, useEffect } from "react";
import { MessageCircle, Bookmark, Plane, Settings } from "lucide-react";
import { C, font, display } from "./jourzy-theme";
import NewTripChat from "./new-trip-chat";
import TripsList from "./trips-list";
import PlanViewWrapper from "./plan-view-wrapper";
import SettingsPage from "../../pages/settings-new"; // We will rename or recreate the settings page
import { useTranslation } from "../../utils/translations";

export default function JourZyApp() {
  const { t } = useTranslation();
  // Global state for bottom nav and current open trip
  const [tab, setTab] = useState<"chat" | "trips" | "settings">("chat");
  const [openTripId, setOpenTripId] = useState<string | null>(null);

  // When a trip is opened, the bottom tab bar is hidden in the prototype
  // Wait, in prototype it shows ChevronLeft to go back to "Trips".
  // The tab bar is hidden? No, tab bar is at the bottom.
  // Wait, the prototype shows the tab bar always. Let's keep it that way, or hide it when inside a trip.

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-6" style={{ background: "#22283A", ...font }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=DM+Sans:wght@400;500;700&display=swap');
        .jz-scroll::-webkit-scrollbar{display:none}`}</style>

      <div className="relative flex flex-col overflow-hidden shadow-2xl"
        style={{ width: 390, height: 780, borderRadius: 40, background: C.paper, border: "10px solid #0d1120", transform: "translateZ(0)" }}>

        {/* main screens */}
        <div className="flex-1 overflow-y-auto jz-scroll relative">
          {openTripId ? (
            <PlanViewWrapper tripId={openTripId} goBack={() => setOpenTripId(null)} />
          ) : (
            <>
              {tab === "chat" && <NewTripChat goTrips={() => setTab("trips")} />}
              {tab === "trips" && <TripsList open={(id) => setOpenTripId(id)} goChat={() => setTab("chat")} />}
              {tab === "settings" && <SettingsPage />}
            </>
          )}
        </div>

        {/* tab bar */}
        <div className="flex justify-around items-center py-2 px-2" style={{ background: C.card, borderTop: `1px solid ${C.line}` }}>
          {[
            ["chat", MessageCircle, t("nav.newTrip")],
            ["trips", Bookmark, t("nav.myTrips")],
            ["settings", Settings, t("settings.title")]
          ].map(([k, Icon, lbl]) => {
            const active = tab === k;
            const IconComp = Icon as any;
            return (
              <button key={k as string} onClick={() => {
                if (k === "trips" && openTripId) {
                  setOpenTripId(null);
                } else if (k === "chat" && openTripId) {
                  setOpenTripId(null);
                  setTab(k as any);
                } else {
                  setTab(k as any);
                }
              }}
                className="flex flex-col items-center gap-0.5 px-6 py-1 rounded-xl transition-colors z-20"
                style={{ color: active ? C.green : C.sub, background: active ? C.greenSoft : "transparent" }}>
                <IconComp size={20} strokeWidth={active ? 2.4 : 1.8} />
                <span className="font-medium" style={{ fontSize: 10 }}>{lbl as string}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
