interface TripEssentialsTabProps {
  region: string;
  insights?: any;
  logisticsGuide?: any;
}

export function TripEssentialsTab({ region }: TripEssentialsTabProps) {
  const phrases = [
    { en: "Hello", jp: "Konnichiwa", say: "kon-nee-chee-wah" },
    { en: "Thank you", jp: "Arigatou gozaimasu", say: "ah-ree-gah-toh go-zai-mass" },
    { en: "Excuse me / sorry", jp: "Sumimasen", say: "soo-mee-mah-sen" },
    { en: "Delicious!", jp: "Oishii!", say: "oy-shee" }
  ];

  const customs = [
    { name: "Quiet on local transit", why: "Phone calls inside moving cabins are universally considered rude. Keep audio settings on silent mode." },
    { name: "Tray Currency Exchange", why: "Retail registers mount distinct handling trays. Seat cash currency assets directly into placeholders." }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-jz-screen font-black text-jz-ink tracking-tight">Know Before You Go</h2>
        <p className="text-jz-soft text-jz-label font-bold mt-0.5">Friendly cultural parameter breakdowns — nothing to worry about.</p>
      </div>

      {/* Emergency Immediate Action Blocks */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-jz-tealTint rounded-jz-card p-4 text-center border border-jz-teal/10">
          <p className="text-[34px] font-black text-jz-tealDark leading-none">110</p>
          <p className="text-xs font-black text-jz-tealDark mt-1 uppercase tracking-wider">Local Police</p>
        </div>
        <div className="bg-jz-tealTint rounded-jz-card p-4 text-center border border-jz-teal/10">
          <p className="text-[34px] font-black text-jz-tealDark leading-none">119</p>
          <p className="text-xs font-black text-jz-tealDark mt-1 uppercase tracking-wider">Medical Rescue</p>
        </div>
      </div>

      {/* Core Localized Language Translation Cards */}
      <div className="space-y-3">
        <h3 className="text-jz-label font-black text-jz-ink uppercase tracking-wider px-1">Essential Communication Nodes</h3>
        <div className="space-y-2">
          {phrases.map((p, i) => (
            <div key={i} className="bg-white border-[1.5px] border-jz-line rounded-jz-card p-4 flex flex-col justify-center gap-1 shadow-sm">
              <div className="flex justify-between items-baseline">
                <span className="font-black text-jz-body-big text-jz-ink">{p.en}</span>
                <span className="font-black text-jz-body text-jz-teal">{p.jp}</span>
              </div>
              <p className="text-jz-soft text-xs font-bold">Pronounce: "{p.say}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cultural Protocols */}
      <div className="space-y-3">
        <h3 className="text-jz-label font-black text-jz-ink uppercase tracking-wider px-1">Regional Etiquette Profiles</h3>
        <div className="space-y-2">
          {customs.map((c, i) => (
            <div key={i} className="bg-white border-[1.5px] border-jz-line rounded-jz-card p-5 space-y-1.5 shadow-sm">
              <p className="font-black text-jz-body-big text-jz-ink">{c.name}</p>
              <p className="text-jz-teal text-xs font-bold leading-relaxed"><span className="font-black">Protocol · </span>{c.why}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}