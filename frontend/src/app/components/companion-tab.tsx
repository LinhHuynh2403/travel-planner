import { GeneratedItinerary } from '../types/travel';
import { Radio, Navigation } from 'lucide-react';

interface CompanionTabProps {
  itinerary: GeneratedItinerary;
  focusTarget?: any;
  onClearFocus?: () => void;
}

export function CompanionTab({ itinerary, focusTarget }: CompanionTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div className="max-w-[70%]">
          <h2 className="text-jz-title font-black text-jz-ink flex items-center gap-1.5 leading-none">
            <Radio className="w-5 h-5 text-jz-teal animate-pulse" /> Live Companion
          </h2>
          <p className="text-jz-soft text-xs font-bold mt-1">Real-time path assistance and dynamic route tracking parameters.</p>
        </div>
        <button className="px-3 py-2 bg-jz-teal text-white text-xs font-black rounded-xl flex items-center gap-1 shadow-sm">
          <Navigation className="w-3 h-3" /> Live Sync
        </button>
      </div>

      {/* High Fidelity Interactive Geographic Map Placeholder Frame */}
      <div className="w-full h-64 bg-jz-mist border-2 border-jz-line rounded-jz-card relative overflow-hidden flex flex-col justify-center items-center text-center p-5 shadow-inner">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#0F6E64_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
        <Navigation className="w-8 h-8 text-jz-soft mb-2 animate-bounce" />
        <p className="text-jz-body-big font-black text-jz-ink">Geographic Engine Activated</p>
        <p className="text-jz-label font-bold text-jz-soft max-w-[80%] mt-0.5">Tracking coordinates relative to custom base path nodes.</p>
      </div>

      {focusTarget && (
        <div className="bg-white border-2 border-jz-teal rounded-jz-card p-4 flex justify-between items-center animate-in fade-in">
          <div>
            <span className="text-[9px] uppercase font-black text-jz-teal tracking-wider">Tracking Focused Target Stop</span>
            <p className="font-black text-jz-body-big text-jz-ink">{focusTarget.activity.title}</p>
          </div>
          <span className="jz-chip text-xs">Locked</span>
        </div>
      )}
    </div>
  );
}