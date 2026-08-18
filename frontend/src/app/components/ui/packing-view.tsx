import { useState } from "react";
import { Check } from "lucide-react";
import { C } from "./jourzy-theme";
import { useTranslation } from "../../utils/translations";

export default function PackingView({ tripData }: { tripData: any }) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState(() => new Set<string>());
  const packingList = tripData?.packingList || [];

  const toggle = (key: string) => setChecked(prev => {
    const n = new Set(prev);
    n.has(key) ? n.delete(key) : n.add(key);
    return n;
  });

  if (packingList.length === 0) {
    return <div className="p-4 text-center text-sm text-jz-soft">{t("prep.notAvailable")}</div>;
  }

  return (
    <div className="px-4 pb-6">
      <div className="rounded-jz-card p-5" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <div className="font-bold text-sm mb-4" style={{ color: C.ink }}>
          <span role="img" aria-label="pack" className="mr-2">🎒</span> {t("prep.packForTrip")}
        </div>
        <div className="space-y-4">
          {packingList.map((cat: any, ci: number) => {
            // The generator always makes this category last (see prompts.js)
            // and the category NAME itself is translated per-language, so
            // matching on the English word "leave" broke this styling for
            // every non-English trip — go by position instead.
            const isLeave = ci === packingList.length - 1;
            return (
              <div key={ci}>
                {isLeave && <div className="text-xs font-bold uppercase mb-2 mt-4" style={{ color: "#EF4444" }}>{t("ui.leaveAtHome")}</div>}
                <div>
                  {cat.items?.map((item: any, ii: number) => {
                    const name = typeof item === "string" ? item : item.name;
                    const why = typeof item === "string" ? "" : item.why;
                    const key = `${ci}-${ii}`;
                    const isChecked = checked.has(key);
                    const isLast = ii === (cat.items?.length || 0) - 1;
                    return (
                      <button key={ii} onClick={() => toggle(key)}
                        className="w-full flex items-start gap-2.5 py-2.5 text-left"
                        style={{ borderBottom: isLast ? "none" : `1px solid ${C.line}` }}>
                        <div className="w-5 h-5 rounded-md shrink-0 mt-0.5 flex items-center justify-center transition-colors"
                          style={{ border: `1.6px solid ${isChecked ? (isLeave ? "#EF4444" : C.green) : C.line}`, background: isChecked ? (isLeave ? "#EF4444" : C.green) : "transparent" }}>
                          {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                        </div>
                        <div className="text-xs leading-relaxed">
                          <span className="font-bold" style={isChecked ? { color: C.sub, textDecoration: "line-through" } : { color: C.ink }}>{name}</span>
                          {why && <> — <span style={{ color: C.sub }}>{why}</span></>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
