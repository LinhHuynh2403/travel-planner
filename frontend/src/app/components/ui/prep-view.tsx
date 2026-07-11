import { C } from "./jourzy-theme";
import { Cloud, CloudRain, CloudSun, Sun, CloudSnow, CloudLightning, Check, AlertCircle, ShieldAlert, HeartPulse, Wallet, Wifi, Clock } from "lucide-react";
import { useTranslation } from "../../utils/translations";

const WEATHER_ICON: Record<string, any> = {
  sunny: Sun, partly: CloudSun, cloudy: Cloud, rainy: CloudRain, snowy: CloudSnow, stormy: CloudLightning,
};

export default function PrepView({ tripData }: { tripData: any }) {
  const { t } = useTranslation();
  if (!tripData) return <div className="p-4 text-center text-sm text-[#6B7280]">{t("prep.notAvailable")}</div>;

  const insights = tripData.insights || {};
  const keyPhrases = insights.keyPhrases || [];
  const packingList = tripData.packingList || [];
  const logistics = tripData.logisticsGuide || {};
  const customs = insights.customsRestrictions || [];
  const cultural = insights.culturalTips || [];
  const safety = insights.safetyTips || [];
  const weather = insights.weatherWeek || [];
  const emergency = insights.emergencyNumbers;
  const currency = insights.currency;
  const timezoneNote = insights.timezoneNote;

  const smileIdx = keyPhrases.findIndex((kp: any) => /smile/i.test(kp.en || ""));

  return (
    <div className="px-4 space-y-6 pb-6">
      {/* Weather */}
      {weather.length > 0 && (
        <div className="flex gap-2 overflow-x-auto jz-scroll pb-2">
          {weather.map((w: any, i: number) => {
            const Icon = WEATHER_ICON[w.icon] || Cloud;
            return (
              <div key={i} className="flex-1 min-w-[70px] flex flex-col items-center justify-center p-3 rounded-2xl"
                style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="text-xs font-bold mb-1.5 whitespace-nowrap" style={{ color: C.ink }}>{w.d}</div>
                <Icon size={16} color={C.green} className="mb-1.5" />
                <div className="text-xs font-medium" style={{ color: C.sub }}>{w.hi}°/{w.lo}°</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Timezone + Currency */}
      {(timezoneNote || currency) && (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
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

      {/* Packing List */}
      {packingList.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <div className="font-bold text-sm mb-4" style={{ color: C.ink }}>
            <span role="img" aria-label="pack" className="mr-2">🎒</span> {t("prep.packForTrip")}
          </div>
          <div className="space-y-4">
            {packingList.map((cat: any, i: number) => {
              // The generator always makes this category last (see prompts.js)
              // and the category NAME itself is translated per-language, so
              // matching on the English word "leave" broke this styling for
              // every non-English trip — go by position instead.
              const isLeave = i === packingList.length - 1;
              return (
                <div key={i}>
                  {isLeave && <div className="text-xs font-bold uppercase mb-2 mt-4" style={{ color: "#EF4444" }}>{t("ui.leaveAtHome")}</div>}
                  <div className="space-y-3">
                    {cat.items?.map((item: any, j: number) => {
                      const name = typeof item === "string" ? item : item.name;
                      const why = typeof item === "string" ? "" : item.why;
                      return (
                        <div key={j} className="flex items-start gap-2">
                          <Check size={14} color={isLeave ? "#EF4444" : C.green} className="mt-0.5 shrink-0" />
                          <div className="text-xs leading-relaxed" style={{ color: C.ink }}>
                            <span className="font-bold">{name}</span>{why && <> — <span style={{ color: C.sub }}>{why}</span></>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* If something goes wrong (safety/health) */}
      {(emergency || logistics.healthAccess) && (
        <div className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
          <div className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: C.ink }}>
            <HeartPulse size={16} style={{ color: C.green }} /> {t("prep.ifSomethingGoesWrong")}
          </div>
          <div className="text-xs leading-relaxed space-y-2" style={{ color: C.sub }}>
            {emergency && (
              <p>
                <span className="font-bold" style={{ color: C.ink }}>{t("prep.emergencyLabel")}</span>{' '}
                <span className="font-bold" style={{ color: C.ink }}>{emergency.ambulance}</span> ({t("prep.ambulanceLabel")}) · <span className="font-bold" style={{ color: C.ink }}>{emergency.police}</span> ({t("prep.policeLabel")})
                {emergency.touristPolice && emergency.touristPolice !== "none" && <> · <span className="font-bold" style={{ color: C.ink }}>{emergency.touristPolice}</span> ({t("prep.touristPoliceLabel")})</>}
              </p>
            )}
            {logistics.healthAccess && <p>{logistics.healthAccess}</p>}
          </div>
        </div>
      )}

      {/* Logistics Cheat Sheet */}
      <div className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <div className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: C.ink }}>
          <AlertCircle size={16} /> {t("prep.logisticsCheatSheet")}
        </div>
        <div className="text-xs leading-relaxed space-y-2" style={{ color: C.sub }}>
          {/* airportToHotelLabel is "Airport → hotel:" in each language, always
              leading with a single translated word — swap in the real airport
              name (a proper noun, never translated) while keeping the rest of
              the phrase in the traveler's language. */}
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

      {/* Customs & Rules */}
      {(customs.length > 0 || safety.length > 0 || cultural.length > 0) && (
        <div className="rounded-2xl p-5" style={{ background: "#E8F5E9", border: "1px solid #A5D6A7" }}>
          <div className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: C.green }}>
            <ShieldAlert size={16} /> {t("prep.customsRulesTitle")}
          </div>
          <div className="text-xs leading-relaxed space-y-2" style={{ color: "#374151" }}>
            {customs.map((c: string, i: number) => <p key={`c-${i}`}>• {c}</p>)}
            {cultural.map((c: string, i: number) => <p key={`t-${i}`}>• {c}</p>)}
            {safety.map((s: string, i: number) => <p key={`s-${i}`}>• {s}</p>)}
          </div>
        </div>
      )}

      {/* Key Phrases */}
      {keyPhrases.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
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
            // Each locale's quoting style around {{phrase}} differs (straight
            // quotes vs 「」), so split the translated template around the
            // placeholder instead of hardcoding quote characters in JSX.
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
