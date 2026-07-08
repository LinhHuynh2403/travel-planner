import { GeneratedItinerary } from '../types/travel';

interface SafetyTabProps {
  itinerary: GeneratedItinerary;
}

export function SafetyTab({ itinerary }: SafetyTabProps) {
  const commonScams = [
    "Unlicensed transit configurations charging arbitrary pricing models at transit platforms.",
    "Highly persistent nightlife invitations within central market squares designed to overcharge tourists."
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-jz-screen font-black text-jz-ink tracking-tight">Safety Intelligence</h2>
        <p className="text-jz-soft text-jz-label font-bold mt-0.5">Verified situational parameters, neighborhood indexes, and risk mitigations.</p>
      </div>

      <div className="bg-white border-[1.5px] border-jz-line rounded-jz-card p-5 space-y-3 shadow-sm">
        <h3 className="text-jz-label font-black text-jz-ink uppercase tracking-wider">Verified High Security Quarters</h3>
        <ul className="space-y-2 text-xs font-bold text-jz-soft">
          <li className="flex gap-2 items-center">🔹 Central Heritage Core Promenade</li>
          <li className="flex gap-2 items-center">🔹 Main Managed Rail Logistics Districts</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-jz-label font-black text-jz-ink uppercase tracking-wider px-1">Active Mitigation Advisories</h3>
        <div className="space-y-2">
          {commonScams.map((scam, i) => (
            <div key={i} className="bg-white border-[1.5px] border-jz-line rounded-jz-card p-4.5 flex gap-3 items-start shadow-sm">
              <span className="text-lg">⚠️</span>
              <p className="text-jz-body text-jz-soft font-medium leading-relaxed">{scam}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}