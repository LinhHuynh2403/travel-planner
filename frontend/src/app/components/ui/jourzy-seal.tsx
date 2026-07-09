import { BadgeCheck } from "lucide-react";
import { C } from "./jourzy-theme";

// Only render for places actually checked against the real Places API — a
// hollow "VERIFIED" badge on an unverified fallback recommendation would be
// exactly the kind of made-up trust signal this app exists to avoid.
export function Seal({ small, show = true }: { small?: boolean; show?: boolean }) {
  if (!show) return null;
  const s = small ? 30 : 40;
  return (
    <div title="Real place, verified via Places API"
      className="flex items-center justify-center rounded-full shrink-0"
      style={{ width: s, height: s, border: `2px solid ${C.hanko}`, color: C.hanko, transform: "rotate(-8deg)", background: "rgba(196,58,47,0.05)" }}>
      <div className="text-center leading-none">
        <BadgeCheck size={small ? 12 : 15} className="mx-auto" />
        <div style={{ fontSize: small ? 5.5 : 7, fontWeight: 700, letterSpacing: 0.5 }}>VERIFIED</div>
      </div>
    </div>
  );
}
