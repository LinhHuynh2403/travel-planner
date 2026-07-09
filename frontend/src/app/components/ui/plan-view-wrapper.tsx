import { useState, useEffect } from "react";
import { ChevronLeft, MessageCircle } from "lucide-react";
import { C } from "./jourzy-theme";
import PlanView from "./plan-view";
import BudgetView from "./budget-view";
import PrepView from "./prep-view";
import CompanionSheet from "./companion-sheet";
import { useTranslation } from "../../utils/translations";

export default function PlanViewWrapper({ tripId, goBack }: { tripId: string, goBack: () => void }) {
  const { t } = useTranslation();
  const [sub, setSub] = useState<"plan" | "budget" | "prep">("plan");
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

  return (
    <>
      {/* trip header */}
      <div className="flex items-center gap-2 px-4 py-2 sticky top-0 bg-[#F5F6F2] z-10">
        <button onClick={goBack} className="flex items-center text-xs font-bold" style={{ color: C.green }}>
          <ChevronLeft size={16} /> Trips
        </button>
        <div className="flex-1 text-center text-sm font-bold capitalize" style={{ color: C.ink }}>
          {tripData.plan?.region}
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-bold"
          style={!isPast ? { background: C.greenSoft, color: C.green } : { background: "#EEE", color: C.sub }}>
          {!isPast ? t("nav.upcoming") : t("nav.history")}
        </span>
      </div>

      {/* segmented control inside Upcoming Trip */}
      {!isPast && (
        <div className="flex mx-4 mb-2 rounded-full p-1" style={{ background: "#E9EBE5" }}>
          {[
            ["plan", t("nav.myPlan")],
            ["budget", t("ui.budget")],
            ["prep", t("nav.prep")]
          ].map(([k, l]) => (
            <button key={k} onClick={() => setSub(k as any)} className="flex-1 py-1.5 rounded-full text-xs font-bold"
              style={sub === k ? { background: C.card, color: C.ink, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { color: C.sub }}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Sub Views */}
      <div className="pb-24">
        {isPast ? (
          <div className="pt-4">
            <div className="mx-4 mb-6 p-5 rounded-2xl" style={{ background: "#22283A", color: "#FFFFFF" }}>
              <div className="text-[10px] font-bold tracking-wider mb-1" style={{ color: "#8E99B0", textTransform: "uppercase" }}>
                Completed Trip
              </div>
              <div className="text-3xl font-bold mb-2" style={{ fontFamily: "Fraunces, serif" }}>
                {tripData.plan?.region || "Seoul"}
              </div>
              <div className="text-xs" style={{ color: "#8E99B0" }}>
                {tripData.dates || "May 8–12, 2026"} · {tripData.plan?.days?.reduce((acc: number, d: any) => acc + d.activities.length, 0) || 14} verified places visited
              </div>
            </div>

            <div className="mx-4 bg-white rounded-2xl p-5 shadow-sm border border-[#E4E6E0]">
              <h3 className="font-bold text-[#1B2333] mb-4 text-base">Your highlights</h3>
              <div className="space-y-3">
                {(tripData.plan?.days?.[0]?.activities?.slice(0, 3).map((a: any) => a.title) || [
                  "Bukchon Hanok stay",
                  "Gwangjang Market bindaetteok",
                  "Bukhansan sunrise hike"
                ]).map((hl: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-sm" style={{ color: C.sub }}>
                    <span style={{ color: "#FBBF24" }}>★</span>
                    <span className="leading-tight mt-0.5">{hl}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-10 mt-10 text-center text-sm leading-relaxed" style={{ color: C.sub }}>
              This trip is read-only now. Tap the chat bubble to reminisce — JourZy remembers what you loved for next time.
            </div>
          </div>
        ) : (
          <>
            {sub === "plan" && <PlanView tripData={tripData} />}
            {sub === "budget" && <BudgetView tripData={tripData} />}
            {sub === "prep" && <PrepView tripData={tripData} />}
          </>
        )}
      </div>

      {/* floating companion chat bubble */}
      {!bubble && (
        <button onClick={() => setBubble(true)}
          className="fixed rounded-full shadow-xl flex items-center justify-center z-10"
          style={{ right: 18, bottom: 86, width: 54, height: 54, background: !isPast ? C.green : C.ink }}>
          <MessageCircle size={24} color="#fff" />
          <span className="absolute rounded-full" style={{ top: 4, right: 4, width: 10, height: 10, background: C.hanko, border: "2px solid #fff" }} />
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
