import { useState, useEffect } from "react";
import { ChevronLeft, Plus, X, CalendarDays, Map, Backpack, BookOpen, Image as ImageIcon } from "lucide-react";
import { C } from "./jourzy-theme";
import PlanView from "./plan-view";
import MapView from "./map-view";
import PackingView from "./packing-view";
import GuideView from "./guide-view";
import MemoriesView from "./memories-view";
import CompanionSheet from "./companion-sheet";
import { useTranslation } from "../../utils/translations";

export default function PlanViewWrapper({ tripId, goBack, notice, onDismissNotice }: { tripId: string, goBack: () => void, notice?: string | null, onDismissNotice?: () => void }) {
  const { t } = useTranslation();
  const [sub, setSub] = useState<"plan" | "map" | "packing" | "guide" | "memories">("plan");
  const [bubble, setBubble] = useState(false);
  const [isPast, setIsPast] = useState(false);
  const [tripData, setTripData] = useState<any>(null);

  useEffect(() => {
    try {
      const generated = JSON.parse(localStorage.getItem('generatedItinerary') || '{}');
      const past = JSON.parse(localStorage.getItem('viewingPastTrip') || 'false');
      setTripData(generated);
      setIsPast(past);
    } catch (e) {
      console.error(e);
    }
  }, [tripId]);

  if (!tripData) return null;

  const handleReplaceActivity = (dayNumber: number, activityIdx: number, newData: { title: string; location: string; description: string; place: any }) => {
    setTripData((prev: any) => {
      if (!prev) return prev;
      const updatedDays = prev.days.map((d: any) =>
        d.dayNumber !== dayNumber ? d : {
          ...d,
          activities: d.activities.map((act: any, idx: number) => idx === activityIdx ? { ...act, ...newData } : act),
        }
      );
      const updated = { ...prev, days: updatedDays };
      localStorage.setItem('generatedItinerary', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSaveMemory = (updatedRow: any) => {
    setTripData((prev: any) => {
      if (!prev) return prev;
      const rest = (prev.memories || []).filter((m: any) =>
        !(m.day_number === updatedRow.day_number && m.activity_index === updatedRow.activity_index));
      const updated = { ...prev, memories: [...rest, updatedRow] };
      localStorage.setItem('generatedItinerary', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <>
      {/* trip header — truly fixed (not sticky) so it can never show scroll
          bleed-through behind it, the same class of WebKit rendering glitch
          `translateZ(0)` alone didn't fully stop. Sized to match the bottom
          tab bar's now-taller, thumb-friendlier footprint (see below) rather
          than the old cramped py-2 bar. */}
      <div className="fixed top-0 left-0 right-0 z-20 flex items-center gap-2 px-4 pb-3.5"
        style={{ background: C.paper, borderBottom: `1px solid ${C.line}`, paddingTop: "calc(14px + env(safe-area-inset-top))" }}>
        <button onClick={goBack} className="flex items-center text-sm font-bold shrink-0" style={{ color: C.green }}>
          <ChevronLeft size={20} /> {t("nav.backToTrips")}
        </button>
        <div className="flex-1 text-center text-base font-bold capitalize truncate px-1" style={{ color: C.ink }}>
          {tripData.plan?.region}
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-bold shrink-0"
          style={!isPast ? { background: C.greenSoft, color: C.green } : { background: C.line, color: C.sub }}>
          {!isPast ? t("nav.upcoming") : t("nav.history")}
        </span>
      </div>

      {/* Sub Views — top padding clears the now-fixed header above. Only the
          header's own ~56px (padding + content), not another
          env(safe-area-inset-top) on top of it — the scrollable container
          this renders inside (see jourzy-app.tsx) already applies that once
          via its own pt-[env(safe-area-inset-top)]; adding it here too would
          double the gap under the notch/Dynamic Island. Bottom padding
          clears both the (now taller, thumb-friendlier) tab bar AND the
          floating companion FAB above it (which sits 108-162px above the
          bottom edge), so the FAB never ends up hovering over real content
          at max scroll. */}
      <div className="pt-14 pb-48">
        {notice && (
          <div className="mx-4 mb-2 px-3 py-2.5 rounded-xl text-xs flex items-start gap-2" style={{ background: C.greenSoft, color: C.ink }}>
            <span className="flex-1 leading-relaxed">{notice}</span>
            <button onClick={onDismissNotice} className="shrink-0" style={{ color: C.sub }}>
              <X size={14} />
            </button>
          </div>
        )}
        {sub === "plan" && <PlanView tripData={tripData} onSaveMemory={handleSaveMemory} />}
        {sub === "map" && <MapView tripData={tripData} />}
        {sub === "packing" && <PackingView tripData={tripData} />}
        {sub === "guide" && <GuideView tripData={tripData} />}
        {sub === "memories" && <MemoriesView tripData={tripData} onSaveMemory={handleSaveMemory} />}
      </div>

      {/* trip-level bottom tab bar — replaces the global app tab bar while a
          trip is open. Taller than a typical web tab bar on purpose: iOS's
          swipe-up-to-home gesture lives right along the bottom edge, so
          targets that only clear it via safe-area padding (and are
          otherwise thumb-sized) end up too close for a comfortable tap. */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-3 px-2 pb-[env(safe-area-inset-bottom)] z-20"
        style={{ background: C.card, borderTop: `1px solid ${C.line}` }}>
        {[
          ["plan", CalendarDays, t("nav.plan")],
          ["map", Map, t("nav.map")],
          ["packing", Backpack, t("nav.packing")],
          ["guide", BookOpen, t("nav.guide")],
          ["memories", ImageIcon, t("nav.memories")],
        ].map(([k, Icon, lbl]) => {
          const active = sub === k;
          const IconComp = Icon as any;
          return (
            <button key={k as string} onClick={() => setSub(k as any)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors"
              style={{ color: active ? C.green : C.sub, background: active ? C.greenSoft : "transparent" }}>
              <IconComp size={21} strokeWidth={active ? 2.4 : 1.8} />
              <span className="font-medium" style={{ fontSize: 10.5 }}>{lbl as string}</span>
            </button>
          );
        })}
      </div>

      {/* floating companion chat bubble */}
      {!bubble && (
        <button onClick={() => setBubble(true)}
          className="fixed rounded-full shadow-xl flex items-center justify-center z-10"
          style={{ right: 18, bottom: "calc(108px + env(safe-area-inset-bottom))", width: 54, height: 54, background: C.amber, color: "#3d2705" }}>
          <Plus size={24} />
        </button>
      )}

      {/* companion chat sheet */}
      {bubble && (
        <CompanionSheet
          tripId={tripId}
          isPast={isPast}
          tripData={tripData}
          close={() => setBubble(false)}
          onReplaceActivity={handleReplaceActivity}
        />
      )}
    </>
  );
}
