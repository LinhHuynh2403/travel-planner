import { useState } from "react";
import { ChevronRight, X, Star, Clock, Plane, Train, Utensils, Landmark } from "lucide-react";
import { C, display } from "./jourzy-theme";
import { Seal } from "./jourzy-seal";

type BreakdownItem = { category: string; amount: number; savingTip?: string };
type CategoryKind = "flight" | "hotel" | "meals" | "transport" | "activities" | "other";

function categoryKind(category: string): CategoryKind {
  const c = (category || "").toLowerCase();
  if (/flight|airfare/.test(c)) return "flight";
  if (/hotel|lodging|accommodation|stay/.test(c)) return "hotel";
  if (/meal|food|dining|restaurant/.test(c)) return "meals";
  if (/train|bus|transit|transport|metro|subway|suica|tram/.test(c)) return "transport";
  if (/museum|activit|sight|shop|tour|attraction|exhibition/.test(c)) return "activities";
  return "other";
}

const KIND_ICON: Record<CategoryKind, any> = { flight: Plane, hotel: Landmark, meals: Utensils, transport: Train, activities: Landmark, other: null };

export default function BudgetView({ tripData }: { tripData: any }) {
  const [openItem, setOpenItem] = useState<BreakdownItem | null>(null);
  const b = tripData?.insights?.budgetSummary;
  const userBudgetStr = tripData?.plan?.budget || "No budget set";
  const userBudgetNum = parseFloat(String(userBudgetStr).replace(/[^0-9.]/g, '')) || 0;

  if (!b) return <div className="p-4 text-center text-sm text-[#6B7280]">Budget data not available.</div>;

  const total = b.totalEstimatedCost || 0;
  const currency = "$";
  const headroom = userBudgetNum > 0 ? (userBudgetNum - total) : null;
  const pctUsed = userBudgetNum > 0 ? Math.min(100, Math.max(0, (total / userBudgetNum) * 100)) : null;

  return (
    <div className="px-4">
      {/* Top Card */}
      <div className="rounded-2xl p-5 mb-4 text-white" style={{ background: C.ink }}>
        <div className="text-xs opacity-70 uppercase tracking-widest font-bold mb-1">
          LIVE TRIP TOTAL — updates with every swap
        </div>
        <div className="flex items-baseline gap-2 mb-4">
          <div className="text-4xl font-bold font-serif leading-none">{currency}{total}</div>
          <div className="text-sm opacity-70">of {userBudgetStr}</div>
        </div>

        {pctUsed !== null && (
          <div className="h-2 rounded-full mb-3 overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="h-full rounded-full" style={{ width: `${pctUsed}%`, background: headroom !== null && headroom < 0 ? "#EF4444" : C.green }} />
          </div>
        )}

        {headroom !== null && (
          headroom >= 0 ? (
            <div className="text-sm font-medium" style={{ color: C.green }}>{currency}{headroom} of headroom — nice work!</div>
          ) : (
            <div className="text-sm font-medium text-[#EF4444]">{currency}{Math.abs(headroom)} over budget — time to swap?</div>
          )
        )}
      </div>

      {/* Breakdown List */}
      <div className="space-y-3">
        {b.breakdown?.map((item: BreakdownItem, idx: number) => {
          const kind = categoryKind(item.category);
          const Icon = KIND_ICON[kind];
          const clickable = kind !== "other";
          const Wrapper = clickable ? "button" : "div";
          return (
            <Wrapper key={idx}
              {...(clickable ? { onClick: () => setOpenItem(item) } : {})}
              className={`w-full text-left rounded-2xl p-3.5 ${clickable ? "active:opacity-70 transition-opacity" : ""}`}
              style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <div className="flex justify-between items-start mb-1.5">
                <div className="font-bold text-sm flex items-center gap-1.5" style={{ color: C.ink }}>
                  {Icon && <Icon size={13} style={{ color: C.sub }} />}
                  {item.category}
                </div>
                <div className="flex items-center gap-1">
                  <div className="font-bold text-sm" style={{ color: C.ink }}>{currency}{item.amount}</div>
                  {clickable && <ChevronRight size={14} style={{ color: C.sub }} />}
                </div>
              </div>
              {item.savingTip && (
                <div className="text-xs leading-relaxed flex items-start gap-1.5" style={{ color: C.sub }}>
                  <span style={{ color: C.green, marginTop: 1 }}>✨</span>
                  <span><span className="font-bold">Save:</span> {item.savingTip}</span>
                </div>
              )}
            </Wrapper>
          );
        })}
      </div>

      {openItem && (
        <BudgetCategorySheet item={openItem} kind={categoryKind(openItem.category)} tripData={tripData} close={() => setOpenItem(null)} />
      )}
    </div>
  );
}

function BudgetCategorySheet({ item, kind, tripData, close }: { item: BreakdownItem; kind: CategoryKind; tripData: any; close: () => void }) {
  const currency = "$";
  const logistics = tripData?.logisticsGuide || {};
  const hotel = tripData?.hotelRecommendation;
  const region = tripData?.plan?.region || "your destination";

  const allActivities = (tripData?.days || []).flatMap((d: any) =>
    (d.activities || []).map((a: any, idx: number) => ({ ...a, dayNumber: d.dayNumber, prevTitle: idx > 0 ? d.activities[idx - 1]?.title : "Hotel" }))
  );
  const foodActivities = allActivities.filter((a: any) => a.category === "food");
  const sightActivities = allActivities.filter((a: any) => a.category !== "food" && a.category !== "rest");
  const transportLegs = allActivities.filter((a: any) => a.travelTimeFromPrevious);

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" style={{ background: "rgba(20,25,40,0.45)" }} onClick={close}>
      <div className="rounded-t-3xl p-5 pb-7 max-h-[80%] overflow-y-auto jz-scroll" style={{ background: C.paper }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <div style={{ ...display, fontSize: 20, color: C.ink }}>{item.category}</div>
            <div className="text-xs mt-0.5" style={{ color: C.sub }}>Estimated {currency}{item.amount} for this trip</div>
          </div>
          <button onClick={close}><X size={18} style={{ color: C.sub }} /></button>
        </div>

        {item.savingTip && (
          <div className="rounded-2xl p-3 mb-4 flex items-start gap-1.5 text-xs leading-relaxed" style={{ background: C.greenSoft, color: C.green }}>
            <span className="mt-0.5">✨</span>
            <span><span className="font-bold">Save:</span> {item.savingTip}</span>
          </div>
        )}

        {kind === "flight" && (
          <div className="space-y-3">
            {logistics.airportName && (
              <DetailRow label="Arrival airport" value={logistics.airportName} />
            )}
            <DetailRow label="Destination" value={region} />
            {logistics.airportToStay && <DetailBlock label="Getting to your hotel" text={logistics.airportToStay} />}
            {logistics.bookingTips && <DetailBlock label="Where to book" text={logistics.bookingTips} />}
            {logistics.airlinePoints && <DetailBlock label="Points & miles" text={logistics.airlinePoints} />}
            {!logistics.airportToStay && !logistics.bookingTips && (
              <p className="text-xs" style={{ color: C.sub }}>No further flight details saved for this trip yet — ask JourZy in chat about specific flight options.</p>
            )}
          </div>
        )}

        {kind === "hotel" && hotel && (
          <div>
            <div className="flex justify-between items-start gap-2 mb-2">
              <div>
                <div className="font-bold text-base" style={{ color: C.ink }}>{hotel.name}</div>
                {hotel.neighborhood && <div className="text-xs mt-0.5" style={{ color: C.sub }}>{hotel.neighborhood}</div>}
              </div>
              <Seal small show={!!hotel.place?.placeId} />
            </div>
            <div className="flex items-center gap-2 text-xs mb-3" style={{ color: C.sub }}>
              {hotel.place?.rating && <span className="flex items-center gap-0.5"><Star size={11} fill="#FFC94D" color="#FFC94D" />{hotel.place.rating.toFixed(1)}</span>}
              {hotel.pricePerNight && <span>{currency}{hotel.pricePerNight}/night</span>}
            </div>
            {hotel.reasoning && <DetailBlock label="Why this hotel" text={hotel.reasoning} />}
            {hotel.checkInNote && <DetailBlock label="Check-in & check-out" text={hotel.checkInNote} />}
            {hotel.place?.address && <DetailRow label="Address" value={hotel.place.address} />}
          </div>
        )}

        {kind === "meals" && (
          <div className="space-y-2.5">
            {foodActivities.length === 0 && <p className="text-xs" style={{ color: C.sub }}>No specific meals saved in the plan yet.</p>}
            {foodActivities.map((a: any, i: number) => (
              <div key={i} className="rounded-xl p-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="flex justify-between items-start gap-2">
                  <div className="font-bold text-sm" style={{ color: C.ink }}>🍜 {a.title}</div>
                  {typeof a.cost === "number" && <div className="text-xs font-bold shrink-0" style={{ color: C.ink }}>{currency}{a.cost}</div>}
                </div>
                <div className="text-xs mt-0.5" style={{ color: C.sub }}>Day {a.dayNumber}</div>
                {a.description && <p className="text-xs mt-1 leading-relaxed" style={{ color: C.sub }}>{a.description}</p>}
              </div>
            ))}
          </div>
        )}

        {kind === "activities" && (
          <div className="space-y-2.5">
            {sightActivities.length === 0 && <p className="text-xs" style={{ color: C.sub }}>No specific stops saved in the plan yet.</p>}
            {sightActivities.map((a: any, i: number) => (
              <div key={i} className="rounded-xl p-3" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                <div className="flex justify-between items-start gap-2">
                  <div className="font-bold text-sm" style={{ color: C.ink }}>{a.title}</div>
                  {typeof a.cost === "number" && <div className="text-xs font-bold shrink-0" style={{ color: C.ink }}>{currency}{a.cost}</div>}
                </div>
                <div className="text-xs mt-0.5" style={{ color: C.sub }}>Day {a.dayNumber}</div>
                {a.description && <p className="text-xs mt-1 leading-relaxed" style={{ color: C.sub }}>{a.description}</p>}
              </div>
            ))}
          </div>
        )}

        {kind === "transport" && (
          <div>
            {logistics.transitCards && <DetailBlock label="Fare card" text={logistics.transitCards} />}
            {logistics.gettingAround && <DetailBlock label="Getting around" text={logistics.gettingAround} />}
            {transportLegs.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: C.sub }}>If you follow the plan</div>
                <div className="space-y-2">
                  {transportLegs.map((leg: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs rounded-xl p-2.5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
                      <Clock size={12} style={{ color: C.green }} className="shrink-0" />
                      <span style={{ color: C.ink }}>
                        Day {leg.dayNumber}: <span className="font-bold">{leg.prevTitle}</span> → <span className="font-bold">{leg.title}</span>
                      </span>
                      <span className="ml-auto shrink-0" style={{ color: C.green }}>{leg.travelTimeFromPrevious}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-3 text-xs py-2" style={{ borderBottom: `1px solid ${C.line}` }}>
      <span style={{ color: C.sub }}>{label}</span>
      <span className="font-bold text-right" style={{ color: C.ink }}>{value}</span>
    </div>
  );
}

function DetailBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="mb-3">
      <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: C.sub }}>{label}</div>
      <p className="text-sm leading-relaxed" style={{ color: C.ink }}>{text}</p>
    </div>
  );
}
