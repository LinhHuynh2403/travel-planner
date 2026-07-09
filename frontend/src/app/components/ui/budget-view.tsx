import { C } from "./jourzy-theme";

export default function BudgetView({ tripData }: { tripData: any }) {
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
        {b.breakdown?.map((item: any, idx: number) => (
          <div key={idx} className="rounded-2xl p-3.5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <div className="flex justify-between items-start mb-1.5">
              <div className="font-bold text-sm" style={{ color: C.ink }}>{item.category}</div>
              <div className="font-bold text-sm" style={{ color: C.ink }}>{currency}{item.amount}</div>
            </div>
            {item.savingTip && (
              <div className="text-xs leading-relaxed flex items-start gap-1.5" style={{ color: C.sub }}>
                <span style={{ color: C.green, marginTop: 1 }}>✨</span>
                <span><span className="font-bold">Save:</span> {item.savingTip}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
