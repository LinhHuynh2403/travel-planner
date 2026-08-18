import { useState, useEffect } from "react";
import { Home as HomeIcon, Briefcase, User } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "../../utils/supabaseClient";
import { C, font, display } from "./jourzy-theme";
import NewTripChat from "./new-trip-chat";
import HomeView from "./home-view";
import TripsList from "./trips-list";
import PlanViewWrapper from "./plan-view-wrapper";
import ProfileView from "../../pages/profile-view";
import { useTranslation } from "../../utils/translations";

export default function JourZyApp() {
  const { t } = useTranslation();
  // Global state for bottom nav and current open trip
  const [tab, setTab] = useState<"home" | "trips" | "profile">("home");
  const [openTripId, setOpenTripId] = useState<string | null>(null);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  // The planning chat is no longer its own tab — it opens as a full-screen
  // overlay (same pattern PlanViewWrapper already uses over tab content),
  // reached via the Home FAB, the "Start planning" hero, or a destination/
  // vibe tap. seedText pre-fills the chat's input box on open.
  const [planningOpen, setPlanningOpen] = useState(false);
  const [seedText, setSeedText] = useState<string | undefined>(undefined);
  // Stays true from the moment a chat starts until a trip actually finishes
  // generating — keeps <NewTripChat> mounted (just hidden) across an
  // accidental back-tap instead of unmounting it, which used to wipe the
  // conversation's React state entirely. Only reset once generation
  // succeeds, since a genuinely new planning session should start clean.
  const [hasStartedPlanning, setHasStartedPlanning] = useState(false);

  const startPlanning = (seed?: string) => {
    setSeedText(seed);
    setPlanningOpen(true);
    setHasStartedPlanning(true);
  };

  // Match the native status bar to the app's theme, and make iOS reserve
  // real native space for it (overlaysWebView: false) rather than trusting
  // CSS safe-area-inset alone — the WKWebView's elastic scroll bounce can
  // briefly render content past the scroll boundary, and when the webview
  // extends behind the notch that bounce is visible peeking out from under
  // the status bar. Reserving native space makes that physically impossible.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setOverlaysWebView({ overlay: false });
  }, []);

  // Supabase's default auto-refresh relies on the browser's visibilitychange/
  // focus events to catch the access token up when a tab resumes — a
  // Capacitor WKWebView doesn't fire those reliably. Left alone, the token
  // quietly goes stale (e.g. after backgrounding the app) and every
  // authenticated call — including fetching trips that were already saved —
  // starts silently failing with 401, with no error surfaced anywhere. Tying
  // startAutoRefresh/stopAutoRefresh to Capacitor's own appStateChange event
  // is the fix Supabase documents for native wrappers.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    supabase.auth.startAutoRefresh();
    const listener = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => { listener.then(l => l.remove()); };
  }, []);

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center sm:py-6" style={{ background: "#22283A", ...font }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=DM+Sans:wght@400;500;700&display=swap');
        .jz-scroll::-webkit-scrollbar{display:none}`}</style>

      <div className="relative flex flex-col overflow-hidden w-full h-[100dvh] sm:h-[780px] sm:w-[390px] sm:rounded-[40px] sm:border-[10px] sm:shadow-2xl"
        style={{ background: C.paper, borderColor: "#0d1120", transform: "translateZ(0)" }}>

        {/* main screens */}
        <div className="flex-1 overflow-y-auto jz-scroll relative pt-[env(safe-area-inset-top)]">
          {openTripId && (
            <PlanViewWrapper
              tripId={openTripId}
              goBack={() => { setOpenTripId(null); setPlanNotice(null); }}
              notice={planNotice}
              onDismissNotice={() => setPlanNotice(null)}
            />
          )}
          {!openTripId && hasStartedPlanning && (
            <div style={{ display: planningOpen ? "block" : "none" }}>
              <NewTripChat
                goBack={() => setPlanningOpen(false)}
                seedText={seedText}
                openPlan={(id, notice) => {
                  setPlanningOpen(false);
                  setHasStartedPlanning(false);
                  setOpenTripId(id);
                  setPlanNotice(notice || null);
                }}
              />
            </div>
          )}
          {!openTripId && !planningOpen && (
            <>
              {tab === "home" && (
                <HomeView
                  openTrip={(id) => { setOpenTripId(id); setPlanNotice(null); }}
                  onStartPlanning={() => startPlanning()}
                  onSeedPlanning={(seed) => startPlanning(seed)}
                  onSeeAllTrips={() => setTab("trips")}
                />
              )}
              {tab === "trips" && <TripsList open={(id) => { setOpenTripId(id); setPlanNotice(null); }} goChat={() => startPlanning()} />}
              {tab === "profile" && <ProfileView />}
            </>
          )}
        </div>

        {/* tab bar — hidden while a trip or the planning chat is open */}
        {!openTripId && !planningOpen && (
          <div className="flex justify-around items-center py-2 px-2 pb-[env(safe-area-inset-bottom)]" style={{ background: C.card, borderTop: `1px solid ${C.line}` }}>
            {[
              ["home", HomeIcon, t("nav.home")],
              ["trips", Briefcase, t("nav.myTrips")],
              ["profile", User, t("nav.profile")]
            ].map(([k, Icon, lbl]) => {
              const active = tab === k;
              const IconComp = Icon as any;
              return (
                <button key={k as string} onClick={() => setTab(k as any)}
                  className="flex flex-col items-center gap-0.5 px-6 py-1 rounded-xl transition-colors z-20"
                  style={{ color: active ? C.green : C.sub, background: active ? C.greenSoft : "transparent" }}>
                  <IconComp size={20} strokeWidth={active ? 2.4 : 1.8} />
                  <span className="font-medium" style={{ fontSize: 10 }}>{lbl as string}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
