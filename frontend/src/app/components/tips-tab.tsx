import { HelpCircle, ShieldAlert, AlertTriangle, Sparkles } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface TipsTabProps {
  region: string;
  insights?: {
    culturalTips: string[];
    safetyTips: string[];
    customsRestrictions?: string[];
  };
}

export function TipsTab({ region, insights }: TipsTabProps) {
  if (!insights || !insights.culturalTips || !insights.safetyTips) {
    return (
      <div className="flex-1 overflow-y-auto p-8 pb-32">
        <div className="max-w-2xl mx-auto text-center py-12">
          <Sparkles className="size-12 mx-auto mb-4 text-emerald-400" />
          <h2 className="text-xl font-semibold text-white mb-2">No custom local tips available</h2>
          <p className="text-zinc-400 text-sm">
            To view custom AI-generated local etiquette and safety rules for {region}, plan a new itinerary using JourZy!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-32">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Local Insights</h2>
          <p className="text-zinc-400">
            AI-suggested cultural etiquette and safety rules for {region.split(',')[0]}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cultural Etiquette */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg text-white mb-4 flex items-center gap-2">
                <HelpCircle className="size-5 text-emerald-400" />
                Cultural Etiquette
              </h3>
              <ul className="space-y-3">
                {insights.culturalTips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-zinc-400 leading-relaxed">
                    <span className="text-emerald-500 font-bold shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Safety & Travel Warnings */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg text-white mb-4 flex items-center gap-2">
                <ShieldAlert className="size-5 text-red-400" />
                Safety & Local Regulations
              </h3>
              <ul className="space-y-3">
                {insights.safetyTips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-sm text-zinc-400 leading-relaxed">
                    <span className="text-red-500 font-bold shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Customs & Restrictions */}
          {insights.customsRestrictions && insights.customsRestrictions.length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800 md:col-span-2">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="size-5 text-amber-400" />
                  Customs & Travel Restrictions
                </h3>
                <p className="text-xs text-zinc-500 mb-4">Items that are prohibited, restricted, or require special attention when entering {region.split(',')[0]}.</p>
                <ul className="space-y-3">
                  {insights.customsRestrictions.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm text-zinc-400 leading-relaxed">
                      <span className="text-amber-500 font-bold shrink-0">⚠</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
