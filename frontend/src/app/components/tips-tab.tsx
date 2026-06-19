import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle, ShieldCheck, Globe, Wifi, Bus, UserCheck, Coins } from 'lucide-react';

interface LogisticsGuide {
  connectivity: string;
  transitCards: string;
}

interface TipsTabProps {
  insights: {
    weatherOverview: string;
    culturalTips: string[];
    safetyTips: string[];
    customsRestrictions: string[];
    budgetSummary?: {
      totalEstimatedCost: number;
      breakdown: string;
      fitsStatedBudget: string;
    };
  };
  region: string;
  logisticsGuide?: LogisticsGuide;
  isSoloTraveler?: boolean; // Hooked up for Feature 6 (Safety Layer)
}

export const TipsTab: React.FC<TipsTabProps> = ({
  insights,
  region,
  logisticsGuide,
  isSoloTraveler = false
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Local Insights & Day-1 Logistics</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Essential travel rules, safety frameworks, and connectivity setups curated by JourZy for {region}.
        </p>
      </div>

      {/* 🪙 Dynamic Budget Summary Card */}
      {insights.budgetSummary && (
        <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-emerald-500 shadow-xl">
          <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
            <Coins className="w-4 h-4 text-emerald-400" />
            <CardTitle className="text-sm font-bold text-zinc-200 font-sans">Stated Budget Allocation & Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-400 font-sans">${insights.budgetSummary.totalEstimatedCost}</span>
              <span className="text-xs text-zinc-500 font-medium">Estimated Total Cost</span>
            </div>
            <div className="text-xs text-zinc-350 leading-relaxed bg-zinc-950/60 p-3 rounded-lg border border-zinc-850">
              <span className="text-zinc-500 font-bold uppercase tracking-wider block text-[10px] mb-1">Cost Breakdown</span>
              {insights.budgetSummary.breakdown}
            </div>
            <p className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-lg leading-relaxed">
              ✨ <strong className="text-white">Status:</strong> {insights.budgetSummary.fitsStatedBudget}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 📱 NEW WORKFLOW: DAY ONE CONNECTIVITY & TRANSIT BLUEPRINTS */}
      {logisticsGuide && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-teal-500 shadow-xl">
            <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
              <Wifi className="w-4 h-4 text-teal-400" />
              <CardTitle className="text-sm font-bold text-zinc-200">Cellular Connectivity (SIM/eSIM)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-400 leading-relaxed">{logisticsGuide.connectivity}</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-indigo-500 shadow-xl">
            <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
              <Bus className="w-4 h-4 text-indigo-400" />
              <CardTitle className="text-sm font-bold text-zinc-200">Local Transit Cards & Logistics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-400 leading-relaxed">{logisticsGuide.transitCards}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 🛡️ NEW WORKFLOW: DYNAMIC SOLO TRAVELER SAFETY MONITOR */}
      {isSoloTraveler && (
        <Card className="bg-amber-950/20 border-amber-900/50 border-l-4 border-amber-500">
          <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
            <UserCheck className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-sm font-bold text-amber-300">Solo Traveler Protection Briefing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              Since you're exploring {region} solo, remember to store your emergency contacts locally, share your live path
              updates via JourZy, and favor busy, highly-rated transit paths after dark. Keep copies of your passport hidden in your accommodation base.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cultural Etiquette Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-zinc-400" /> Cultural Etiquette
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {insights.culturalTips.map((tip, idx) => (
              <div key={idx} className="flex gap-2 items-start text-xs text-zinc-400">
                <span className="text-zinc-600 mt-0.5">•</span>
                <p className="leading-relaxed">{tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Safety Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Safety & Regulations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {insights.safetyTips.map((tip, idx) => (
              <div key={idx} className="flex gap-2 items-start text-xs text-zinc-400">
                <span className="text-emerald-900/60 mt-0.5">•</span>
                <p className="leading-relaxed">{tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Customs & Bans */}
        <Card className="bg-zinc-900 border-zinc-800 md:col-span-2">
          <CardHeader className="pb-3 border-b border-zinc-800">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Customs & Country Entry Prohibitions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.customsRestrictions.map((restriction, idx) => (
              <div key={idx} className="flex gap-2 items-start text-xs text-zinc-400 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/60">
                <span className="text-amber-500/80 font-bold">!</span>
                <p className="leading-relaxed">{restriction}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};