import { GeneratedItinerary } from '../types/travel';
import { Card, Why, SectionTitle } from './jourzy-ui';

interface TipsTabProps {
  itinerary: GeneratedItinerary;
}

export function TipsTab({ itinerary }: TipsTabProps) {
  const insights = itinerary.insights;
  const emergency = insights?.emergencyNumbers;
  const currency = insights?.currency;
  const keyPhrases = insights?.keyPhrases || [];
  const culturalTips = insights?.culturalTips || [];
  const commonScams = insights?.commonScams || [];
  const customsRestrictions = insights?.customsRestrictions || [];
  const bookingTips = itinerary.logisticsGuide?.bookingTips;

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

      {currency && (
        <>
          <SectionTitle>Money</SectionTitle>
          <Card>
            <p className="text-jz-body-big font-black text-jz-ink m-0">{currency.name}</p>
            <Why>{currency.why}</Why>
          </Card>
        </>
      )}

      {bookingTips && (
        <>
          <SectionTitle>Booking flights, trains & SIMs</SectionTitle>
          <Card tint="bg-jz-tealTint" className="border-none">
            <p className="text-[17px] leading-relaxed font-semibold text-jz-tealDark">{bookingTips}</p>
            <p className="mt-2 text-[14.5px] font-bold text-jz-teal">
              JourZy can't book these directly — these are just the platforms travelers here actually use.
            </p>
          </Card>
        </>
      )}

      {keyPhrases.length > 0 && (
        <>
          <SectionTitle>Phrases that open doors</SectionTitle>
          <div className="space-y-2.5">
            {keyPhrases.map(p => (
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

      {customsRestrictions.length > 0 && (
        <>
          <SectionTitle>Before you pack: restricted items</SectionTitle>
          <div className="space-y-2.5">
            {customsRestrictions.map((item, i) => (
              <Card key={i} tint="bg-jz-goldTint" className="border-none">
                <p className="text-[17px] leading-relaxed font-semibold text-jz-goldInk">{item}</p>
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
