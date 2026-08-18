import { AlertCircle, ShieldAlert, Wallet, Wifi, Clock, Search } from "lucide-react";
import { C, display } from "./jourzy-theme";
import BudgetView from "./budget-view";
import { useTranslation } from "../../utils/translations";

const enc = encodeURIComponent;
// Cycled across local/cultural tips so each card reads distinctly even
// though the underlying data (insights.culturalTips/customsRestrictions)
// carries no per-tip icon of its own.
const TIP_EMOJI = ["🤝", "💡", "🧕", "📌", "🗣️"];

function flightSearchUrl(engine: "google" | "skyscanner" | "expedia", region: string, arrivalDate?: string, leaveDate?: string) {
  const q = enc(region || "");
  if (engine === "google") return `https://www.google.com/travel/flights?q=${enc(`Flights to ${region}`)}`;
  if (engine === "skyscanner") return `https://www.skyscanner.com/transport/flights-to/${q}/`;
  return `https://www.expedia.com/Flights-Search?destination=${q}${arrivalDate ? `&departing=${arrivalDate}` : ""}${leaveDate ? `&returning=${leaveDate}` : ""}`;
}

export default function GuideView({ tripData }: { tripData: any }) {
  const { t } = useTranslation();
  if (!tripData) return <div className="p-4 text-center text-sm text-jz-soft">{t("prep.notAvailable")}</div>;

  const insights = tripData.insights || {};
  const keyPhrases = insights.keyPhrases || [];
  const logistics = tripData.logisticsGuide || {};
  const customs = insights.customsRestrictions || [];
  const cultural = insights.culturalTips || [];
  const safety = insights.safetyTips || [];
  const emergency = insights.emergencyNumbers;
  const currency = insights.currency;
  const timezoneNote = insights.timezoneNote;
  const region = tripData.plan?.region || "";

  const localTips: string[] = [...cultural, ...customs];
  const smileIdx = keyPhrases.findIndex((kp: any) => /smile/i.test(kp.en || ""));

  return (
    <div className="px-4 space-y-6 pb-6">
      {/* Budget */}
      {insights.budgetSummary && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wide mb-2 px-1" style={{ color: C.sub }}>{t("ui.budget")}</div>
          <BudgetView tripData={tripData} />
        </div>
      )}

      {/* Flights */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wide mb-2 px-1" style={{ color: C.sub }}>{t("guide.flights")}</div>
        <div className="space-y-2">
          {([["google", "Google Flights", "🔎"], ["skyscanner", "Skyscanner", "🧭"], ["expedia", "Expedia", "🧳"]] as const).map(([engine, name, icon]) => (
            <a key={engine} href={flightSearchUrl(engine, region, tripData.plan?.arrivalDate, tripData.plan?.leaveDate)} target="_blank" rel="noreferrer"
              className="flex items-center justify-between gap-2.5 rounded-2xl p-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: C.greenSoft }}>{icon}</div>
                <div className="font-bold text-sm" style={{ color: C.ink }}>{name}</div>
              </div>
              <div className="text-xs font-bold flex items-center gap-1" style={{ color: C.green }}>
                <Search size={12} /> {t("guide.searchFlights")}
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Timezone + Currency */}
      {(timezoneNote || currency) && (
        <div className="rounded-jz-card p-4 space-y-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
          {timezoneNote && (
            <div className="flex items-start gap-2.5 text-xs leading-relaxed" style={{ color: C.sub }}>
              <Clock size={15} className="shrink-0 mt-0.5" style={{ color: C.green }} />
              <span>{timezoneNote}</span>
            </div>
          )}
          {currency && (
            <div className="flex items-start gap-2.5 text-xs leading-relaxed" style={{ color: C.sub }}>
              <Wallet size={15} className="shrink-0 mt-0.5" style={{ color: C.green }} />
              <span><span className="font-bold" style={{ color: C.ink }}>{currency.name}</span> — {currency.why}</span>
            </div>
          )}
          {logistics.connectivity && (
            <div className="flex items-start gap-2.5 text-xs leading-relaxed" style={{ color: C.sub }}>
              <Wifi size={15} className="shrink-0 mt-0.5" style={{ color: C.green }} />
              <span>{logistics.connectivity}</span>
            </div>
          )}
        </div>
      )}

      {/* Local tips */}
      {(safety.length > 0 || localTips.length > 0) && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wide mb-2 px-1" style={{ color: C.sub }}>{t("prep.customsRulesTitle")}</div>
          <div className="space-y-2">
            {safety.map((s: string, i: number) => (
              <div key={`s-${i}`} className="flex items-start gap-2.5 rounded-2xl p-3" style={{ background: "rgba(196, 58, 47, 0.12)" }}>
                <ShieldAlert size={15} className="shrink-0 mt-0.5" color={C.hanko} />
                <span className="text-xs leading-relaxed font-medium" style={{ color: C.hanko }}>{s}</span>
              </div>
            ))}
            {localTips.map((tip: string, i: number) => (
              <div key={`t-${i}`} className="flex items-start gap-2.5 rounded-2xl p-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <span className="text-base shrink-0">{TIP_EMOJI[i % TIP_EMOJI.length]}</span>
                <span className="text-xs leading-relaxed" style={{ color: C.ink }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency numbers */}
      {emergency && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wide mb-2 px-1" style={{ color: C.sub }}>{t("prep.emergencyLabel")}</div>
          <div className={`grid gap-2 ${emergency.touristPolice && emergency.touristPolice !== "none" ? "grid-cols-3" : "grid-cols-2"}`}>
            <div className="rounded-2xl p-2.5 text-center" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <div className="text-base font-extrabold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>{emergency.police}</div>
              <div className="text-[9px] font-bold uppercase mt-0.5" style={{ color: C.sub }}>{t("prep.policeLabel")}</div>
            </div>
            <div className="rounded-2xl p-2.5 text-center" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <div className="text-base font-extrabold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>{emergency.ambulance}</div>
              <div className="text-[9px] font-bold uppercase mt-0.5" style={{ color: C.sub }}>{t("prep.ambulanceLabel")}</div>
            </div>
            {emergency.touristPolice && emergency.touristPolice !== "none" && (
              <div className="rounded-2xl p-2.5 text-center" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="text-base font-extrabold" style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>{emergency.touristPolice}</div>
                <div className="text-[9px] font-bold uppercase mt-0.5" style={{ color: C.sub }}>{t("prep.touristPoliceLabel")}</div>
              </div>
            )}
          </div>
          {logistics.healthAccess && <p className="text-xs mt-2 leading-relaxed" style={{ color: C.sub }}>{logistics.healthAccess}</p>}
        </div>
      )}

      {/* Logistics Cheat Sheet */}
      <div className="rounded-jz-card p-5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <div className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: C.ink }}>
          <AlertCircle size={16} /> {t("prep.logisticsCheatSheet")}
        </div>
        <div className="text-xs leading-relaxed space-y-2" style={{ color: C.sub }}>
          {logistics.airportToStay && <p><span className="font-bold" style={{ color: C.ink }}>{t("prep.airportToHotelLabel").replace(/^\S+/, logistics.airportName || t("plan.airportFallback"))}</span> {logistics.airportToStay}</p>}
          {logistics.gettingAround && <p><span className="font-bold" style={{ color: C.ink }}>{t("prep.gettingAroundLabel")}</span> {logistics.gettingAround}</p>}
          {logistics.luggageStorage && <p><span className="font-bold" style={{ color: C.ink }}>{t("prep.luggageLabel")}</span> {logistics.luggageStorage}</p>}
          {logistics.mobilityNotes && <p><span className="font-bold" style={{ color: C.ink }}>{t("prep.gettingAroundSafelyLabel")}</span> {logistics.mobilityNotes}</p>}
          {logistics.rentalCarGuide && <p><span className="font-bold" style={{ color: C.ink }}>{t("prep.rentalCarLabel")}</span> {logistics.rentalCarGuide}</p>}
          {logistics.breakfastNote && <p><span className="font-bold" style={{ color: C.ink }}>{t("prep.breakfastLabel")}</span> {logistics.breakfastNote}</p>}
          {logistics.airlinePoints && <p><span className="font-bold" style={{ color: C.ink }}>{t("prep.airlinePointsLabel")}</span> {logistics.airlinePoints}</p>}
          {logistics.bookingTips && <p><span className="font-bold" style={{ color: C.ink }}>{t("prep.bookingLabel")}</span> {logistics.bookingTips}</p>}
        </div>
      </div>

      {/* Key Phrases */}
      {keyPhrases.length > 0 && (
        <div className="rounded-jz-card p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <div className="font-bold text-sm mb-3" style={{ color: C.ink }}>{t("prep.sayItLikeLocal")}</div>
          <div className="space-y-3">
            {keyPhrases.map((kp: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-sm" style={{ borderBottom: idx < keyPhrases.length - 1 ? `1px solid ${C.line}` : 'none', paddingBottom: idx < keyPhrases.length - 1 ? '12px' : 0 }}>
                <div style={{ color: C.sub }}>
                  {kp.en}
                  {idx === smileIdx && <span className="ml-2">😊</span>}
                </div>
                <div className="text-right">
                  <div className="font-bold" style={{ color: C.ink }}>{kp.local}</div>
                  <div className="text-xs mt-0.5 opacity-70" style={{ color: C.sub }}>{kp.say}</div>
                </div>
              </div>
            ))}
          </div>
          {smileIdx >= 0 && (() => {
            const [before, after] = t("prep.guaranteedSmileText")
              .replace("{{pronunciation}}", keyPhrases[smileIdx].say)
              .split("{{phrase}}");
            return (
              <div className="text-xs mt-3 p-2.5 rounded-xl leading-relaxed" style={{ background: C.greenSoft, color: C.ink }}>
                😊 <b>{t("prep.guaranteedSmileLabel")}</b> {before}<b>{keyPhrases[smileIdx].local}</b>{after}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
