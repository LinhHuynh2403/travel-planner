import { C } from "./jourzy-theme";
import { Cloud, CloudRain, CloudSun, Sun, CloudSnow, CloudLightning, Check, AlertCircle, ShieldAlert, HeartPulse, Wallet, Wifi, Clock } from "lucide-react";

const WEATHER_ICON: Record<string, any> = {
  sunny: Sun, partly: CloudSun, cloudy: Cloud, rainy: CloudRain, snowy: CloudSnow, stormy: CloudLightning,
};

export default function PrepView({ tripData }: { tripData: any }) {
  if (!tripData) return <div className="p-4 text-center text-sm text-[#6B7280]">Prep data not available.</div>;

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
            <span role="img" aria-label="pack" className="mr-2">🎒</span> Pack for this trip
          </div>
          <div className="space-y-4">
            {packingList.map((cat: any, i: number) => {
              const isLeave = cat.category?.toLowerCase().includes("leave");
              return (
                <div key={i}>
                  {isLeave && <div className="text-xs font-bold uppercase mb-2 mt-4" style={{ color: "#EF4444" }}>Leave these at home</div>}
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
            <HeartPulse size={16} style={{ color: C.green }} /> If something goes wrong
          </div>
          <div className="text-xs leading-relaxed space-y-2" style={{ color: C.sub }}>
            {emergency && (
              <p>
                <span className="font-bold" style={{ color: C.ink }}>Emergency:</span>{' '}
                <span className="font-bold" style={{ color: C.ink }}>{emergency.ambulance}</span> (ambulance) · <span className="font-bold" style={{ color: C.ink }}>{emergency.police}</span> (police)
                {emergency.touristPolice && emergency.touristPolice !== "none" && <> · <span className="font-bold" style={{ color: C.ink }}>{emergency.touristPolice}</span> (tourist police)</>}
              </p>
            )}
            {logistics.healthAccess && <p>{logistics.healthAccess}</p>}
          </div>
        </div>
      )}

      {/* Logistics Cheat Sheet */}
      <div className="rounded-2xl p-5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <div className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: C.ink }}>
          <AlertCircle size={16} /> Logistics cheat-sheet
        </div>
        <div className="text-xs leading-relaxed space-y-2" style={{ color: C.sub }}>
          {logistics.airportToStay && <p><span className="font-bold" style={{ color: C.ink }}>{logistics.airportName ? `${logistics.airportName} → hotel:` : "Airport → hotel:"}</span> {logistics.airportToStay}</p>}
          {logistics.gettingAround && <p><span className="font-bold" style={{ color: C.ink }}>Getting around:</span> {logistics.gettingAround}</p>}
          {logistics.luggageStorage && <p><span className="font-bold" style={{ color: C.ink }}>Luggage:</span> {logistics.luggageStorage}</p>}
          {logistics.mobilityNotes && <p><span className="font-bold" style={{ color: C.ink }}>Getting around safely:</span> {logistics.mobilityNotes}</p>}
          {logistics.breakfastNote && <p><span className="font-bold" style={{ color: C.ink }}>Breakfast:</span> {logistics.breakfastNote}</p>}
          {logistics.airlinePoints && <p><span className="font-bold" style={{ color: C.ink }}>Airline points:</span> {logistics.airlinePoints}</p>}
          {logistics.bookingTips && <p><span className="font-bold" style={{ color: C.ink }}>Booking:</span> {logistics.bookingTips}</p>}
        </div>
      </div>

      {/* Customs & Rules */}
      {(customs.length > 0 || safety.length > 0 || cultural.length > 0) && (
        <div className="rounded-2xl p-5" style={{ background: "#E8F5E9", border: "1px solid #A5D6A7" }}>
          <div className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: C.green }}>
            <ShieldAlert size={16} /> Customs & rules — real ones
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
          <div className="font-bold text-sm mb-3" style={{ color: C.ink }}>Say it like a local</div>
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
          {smileIdx >= 0 && (
            <div className="text-xs mt-3 p-2.5 rounded-xl leading-relaxed" style={{ background: C.greenSoft, color: C.ink }}>
              😊 <b>Guaranteed smile:</b> say "<b>{keyPhrases[smileIdx].local}</b>" ({keyPhrases[smileIdx].say}) — locals light up when visitors know it.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
