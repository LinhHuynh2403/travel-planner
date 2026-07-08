import { GeneratedItinerary } from '../types/travel';
import { getRegionFacts } from '../utils/region-facts';
import { Card, Why, SectionTitle } from './jourzy-ui';

interface TipsTabProps {
  itinerary: GeneratedItinerary;
}

export function TipsTab({ itinerary }: TipsTabProps) {
  const region = itinerary.plan.region;
  const insights = itinerary.insights;
  const emergency = insights?.emergencyNumbers;
  const facts = getRegionFacts(region);
  const culturalTips = insights?.culturalTips || [];
  const commonScams = insights?.commonScams || [];

  return (
    <div>
      <h1 className="text-jz-screen font-black text-jz-ink leading-tight">Know before you go</h1>
      <p className="text-jz-body text-jz-soft font-bold">Friendly heads-ups — nothing to worry about.</p>

      {emergency && (
        <>
          <SectionTitle>If you ever need help</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5">
            <Card tint="bg-jz-tealTint" className="text-center border-none">
              <p className="text-[34px] font-black text-jz-tealDark leading-none m-0">{emergency.police}</p>
              <p className="mt-1 text-[16.5px] font-extrabold text-jz-tealDark">Police</p>
            </Card>
            <Card tint="bg-jz-tealTint" className="text-center border-none">
              <p className="text-[34px] font-black text-jz-tealDark leading-none m-0">{emergency.ambulance}</p>
              <p className="mt-1 text-[16.5px] font-extrabold text-jz-tealDark">Ambulance{emergency.ambulance === emergency.fire ? ' & fire' : ''}</p>
            </Card>
          </div>
          <p className="mt-2 text-[15.5px] font-bold text-jz-soft">
            Your hotel front desk can call for help for you, day or night.
          </p>
        </>
      )}

      <SectionTitle>Money</SectionTitle>
      <Card>
        <p className="text-jz-body-big font-black text-jz-ink m-0">{facts.currency.name}</p>
        <Why>{facts.currency.why}</Why>
      </Card>

      {facts.phrases.length > 0 && (
        <>
          <SectionTitle>Five phrases that open doors</SectionTitle>
          <div className="space-y-2.5">
            {facts.phrases.map(p => (
              <Card key={p.en}>
                <div className="flex justify-between items-baseline gap-2.5 flex-wrap">
                  <span className="text-[18.5px] font-black text-jz-ink">{p.en}</span>
                  <span className="text-[18px] font-extrabold text-jz-teal">{p.local}</span>
                </div>
                <p className="mt-1 text-[16px] font-bold text-jz-soft">Say it: "{p.say}"</p>
              </Card>
            ))}
          </div>
        </>
      )}

      {culturalTips.length > 0 && (
        <>
          <SectionTitle>Local customs</SectionTitle>
          <div className="space-y-2.5">
            {culturalTips.map((tip, i) => (
              <Card key={i}>
                <p className="text-[17px] leading-relaxed font-semibold text-jz-ink">{tip}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      {commonScams.length > 0 && (
        <>
          <SectionTitle>A friend's heads-up</SectionTitle>
          <div className="space-y-2.5">
            {commonScams.map((scam, i) => (
              <Card key={i} tint="bg-jz-mist" className="border-none">
                <p className="text-[17px] leading-relaxed font-semibold text-jz-ink">{scam}</p>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
