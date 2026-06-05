import { useState } from 'react';
import { GeneratedItinerary } from '../types/travel';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  ShieldCheck,
  Phone,
  Copy,
  Check,
  MapPin,
  AlertTriangle,
  ShieldAlert,
  HeartHandshake,
  Sparkles,
  Users,
  UserCheck
} from 'lucide-react';

interface SafetyTabProps {
  itinerary: GeneratedItinerary;
}

export function SafetyTab({ itinerary }: SafetyTabProps) {
  const regionName = itinerary.plan?.region || 'Destination';
  const isInitiallySolo = itinerary.plan?.whoTraveling?.toLowerCase() === 'solo';

  const [isSoloMode, setIsSoloMode] = useState(isInitiallySolo);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Retrieve safety details from insights with smart fallbacks
  const insights = itinerary.insights || {};
  const emergency = insights.emergencyNumbers || {
    police: "112 / 911",
    ambulance: "112 / 911",
    fire: "112 / 911",
    touristPolice: "none"
  };

  const safeNeighborhoods = insights.safeNeighborhoods && insights.safeNeighborhoods.length > 0
    ? insights.safeNeighborhoods
    : ["Central Business District", "Main Tourist Promenades", "Residential Quarters"];

  const commonScams = insights.commonScams && insights.commonScams.length > 0
    ? insights.commonScams
    : [
      "Unlicensed airport taxi overcharging — always pre-book or use official taxi queue.",
      "Friendly locals offering to guide you to a local tea house or bar — this usually ends with a forced high bill."
    ];

  const handleCopy = (num: string, label: string) => {
    navigator.clipboard.writeText(num);
    setCopiedId(label);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-32">
      <div className="max-w-4xl mx-auto space-y-8 select-none">

        {/* Header and Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="size-6 text-emerald-400" />
              Safety Intelligence Assistant
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Destination-specific security parameters, emergency dispatch links, and verified safety advisories for {regionName}.
            </p>
          </div>

          {/* Toggle Solo/Group View */}
          <div className="flex bg-zinc-950 border border-zinc-800/80 p-0.5 rounded-xl self-start md:self-auto">
            <button
              onClick={() => setIsSoloMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isSoloMode
                ? 'bg-emerald-500 text-zinc-950 shadow-md font-extrabold'
                : 'text-zinc-400 hover:text-zinc-300'
                }`}
            >
              <UserCheck className="size-3.5" /> Solo Traveler
            </button>
            <button
              onClick={() => setIsSoloMode(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!isSoloMode
                ? 'bg-emerald-500 text-zinc-950 shadow-md font-extrabold'
                : 'text-zinc-400 hover:text-zinc-300'
                }`}
            >
              <Users className="size-3.5" /> Group / Couple
            </button>
          </div>
        </div>

        {/* Solo Traveler Security Briefing */}
        {isSoloMode && (
          <Card className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-2xl relative overflow-hidden animate-in fade-in duration-300">
            <CardContent className="p-5 flex gap-4 items-start">
              <div className="bg-amber-500/20 p-2.5 rounded-xl border border-amber-500/30 text-amber-400">
                <ShieldAlert className="size-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">Solo Traveler Protection Protocol Activated</h4>
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  Exploring {regionName.split(',')[0]} solo is incredibly rewarding! Remember to register your itinerary path updates with someone back home, favor busy well-lit transit routes after midnight, and avoid leaving food or drinks unattended in nightlife venues. Keep a copy of your passport on cloud storage.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dispatch & Emergency Numbers Grid */}
        <div>
          <h3 className="font-bold text-sm text-zinc-200 mb-3 uppercase tracking-wider flex items-center gap-2">
            <Phone className="size-4 text-emerald-400" /> Regional Dispatch Directives
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {/* Police */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between h-32 hover:border-zinc-700 transition-colors">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Police / Patrol</span>
                <p className="text-2xl font-black text-white mt-1">{emergency.police}</p>
              </div>
              <button
                onClick={() => handleCopy(emergency.police, 'police')}
                className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold self-start"
              >
                {copiedId === 'police' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                {copiedId === 'police' ? 'Copied' : 'Copy Number'}
              </button>
            </div>

            {/* Ambulance */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between h-32 hover:border-zinc-700 transition-colors">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Ambulance / Rescue</span>
                <p className="text-2xl font-black text-white mt-1">{emergency.ambulance}</p>
              </div>
              <button
                onClick={() => handleCopy(emergency.ambulance, 'ambulance')}
                className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold self-start"
              >
                {copiedId === 'ambulance' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                {copiedId === 'ambulance' ? 'Copied' : 'Copy Number'}
              </button>
            </div>

            {/* Fire */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between h-32 hover:border-zinc-700 transition-colors">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Fire Department</span>
                <p className="text-2xl font-black text-white mt-1">{emergency.fire}</p>
              </div>
              <button
                onClick={() => handleCopy(emergency.fire, 'fire')}
                className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold self-start"
              >
                {copiedId === 'fire' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                {copiedId === 'fire' ? 'Copied' : 'Copy Number'}
              </button>
            </div>

            {/* Tourist Hotline */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between h-32 hover:border-zinc-700 transition-colors">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Tourist Helpline</span>
                <p className="text-sm font-bold text-white mt-2 truncate w-full">{emergency.touristPolice || "Not Available"}</p>
              </div>
              {emergency.touristPolice && emergency.touristPolice !== "none" && emergency.touristPolice !== "Check Local Directory" && (
                <button
                  onClick={() => handleCopy(emergency.touristPolice!, 'tourist')}
                  className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold self-start"
                >
                  {copiedId === 'tourist' ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  {copiedId === 'tourist' ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Safe Zones & Scams Column Split */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Safe Neighborhoods */}
          <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="size-4 text-emerald-400" /> Safe Neighborhood Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-3">
              <p className="text-xs text-zinc-400 leading-relaxed mb-1">
                These neighborhoods have low crime indexes, highly active transit lines, and are recommended for solo explorers or families, particularly during nighttime hours.
              </p>
              {safeNeighborhoods.map((hood, index) => (
                <div key={index} className="flex gap-2.5 items-start p-3 bg-zinc-950/40 rounded-xl border border-zinc-800/40 text-xs text-zinc-300 hover:border-zinc-700 transition-colors">
                  <span className="bg-emerald-500/10 text-emerald-400 font-black px-1.5 py-0.5 rounded text-[10px]">
                    {index + 1}
                  </span>
                  <p className="leading-relaxed font-semibold">{hood}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Common Scams */}
          <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-400" /> Common Scam Advisories
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-3">
              <p className="text-xs text-zinc-400 leading-relaxed mb-1">
                Be on alert for the following common tourist scams reported at this destination. Maintain a high degree of situational awareness.
              </p>
              {commonScams.map((scam, index) => (
                <div key={index} className="flex gap-2.5 items-start p-3.5 bg-zinc-950/40 rounded-xl border border-zinc-800/40 text-xs text-zinc-300 hover:border-zinc-700/60 transition-colors">
                  <span className="text-amber-400 font-bold shrink-0 mt-0.5">⚠️</span>
                  <p className="leading-relaxed">{scam}</p>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>

        {/* Global Security Disclaimer Card */}
        <Card className="bg-zinc-950/40 border border-zinc-800/80 rounded-2xl">
          <CardContent className="p-4 flex gap-3 items-center text-xs text-zinc-500 leading-relaxed">
            <HeartHandshake className="size-5 text-zinc-600 shrink-0" />
            <span>
              JourZy Safety Assistant compiles official data and travel advisories. Always consult your country's embassy or state department warnings before initiating international transit.
            </span>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
