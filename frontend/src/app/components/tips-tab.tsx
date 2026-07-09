import { MapPin } from 'lucide-react';
import { GeneratedItinerary } from '../types/travel';
import { Card, Why, SectionTitle } from './jourzy-ui';
import { useTranslation } from '../utils/translations';

interface TipsTabProps {
  itinerary: GeneratedItinerary;
}

export function TipsTab({ itinerary }: TipsTabProps) {
  const { t } = useTranslation();
  const insights = itinerary.insights;
  const emergency = insights?.emergencyNumbers;
  const currency = insights?.currency;
  const timezoneNote = insights?.timezoneNote;
  const keyPhrases = insights?.keyPhrases || [];
  const culturalTips = insights?.culturalTips || [];
  const commonScams = insights?.commonScams || [];
  const customsRestrictions = insights?.customsRestrictions || [];
  const hotel = itinerary.hotelRecommendation;
  const logistics = itinerary.logisticsGuide;
  const bookingTips = logistics?.bookingTips;
  const airportToStay = logistics?.airportToStay;
  const gettingAround = logistics?.gettingAround;
  const luggageStorage = logistics?.luggageStorage;
  const mobilityNotes = logistics?.mobilityNotes;
  const airlinePoints = logistics?.airlinePoints;

  return (
    <div>
      <h1 className="text-jz-screen font-black text-jz-ink leading-tight">{t('ui.knowBefore')}</h1>
      <p className="text-jz-body text-jz-soft font-bold">{t('ui.knowSubtitle')}</p>

      {hotel && (
        <>
          <SectionTitle>{t('ui.whereToStay')}</SectionTitle>
          <Card>
            <p className="text-jz-body-big font-black text-jz-ink m-0">{hotel.name}</p>
            <p className="text-[15px] font-bold text-jz-soft mt-0.5">{hotel.neighborhood}</p>
            <Why>{hotel.reasoning}</Why>
            <div className="flex justify-between items-center mt-3 gap-2.5">
              {hotel.pricePerNight ? (
                <span className="text-[16px] font-extrabold text-jz-ink">${hotel.pricePerNight}{t('ui.perNight')}</span>
              ) : <span />}
              {hotel.place?.mapsUrl && (
                <a
                  href={hotel.place.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 no-underline bg-jz-tealTint text-jz-tealDark font-extrabold text-[16px] px-4 py-2.5 rounded-jz-btn min-h-[44px]"
                >
                  <MapPin className="w-[18px] h-[18px]" /> {t('ui.directions')}
                </a>
              )}
            </div>
          </Card>
        </>
      )}

      {timezoneNote && (
        <Card tint="bg-jz-mist" className="mt-3.5 border-none">
          <p className="text-[16.5px] leading-relaxed font-bold text-jz-ink">🕐 {timezoneNote}</p>
        </Card>
      )}

      {emergency && (
        <>
          <SectionTitle>{t('ui.ifNeedHelp')}</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5">
            <Card tint="bg-jz-tealTint" className="text-center border-none">
              <p className="text-[34px] font-black text-jz-tealDark leading-none m-0">{emergency.police}</p>
              <p className="mt-1 text-[16.5px] font-extrabold text-jz-tealDark">{t('ui.police')}</p>
            </Card>
            <Card tint="bg-jz-tealTint" className="text-center border-none">
              <p className="text-[34px] font-black text-jz-tealDark leading-none m-0">{emergency.ambulance}</p>
              <p className="mt-1 text-[16.5px] font-extrabold text-jz-tealDark">{t('ui.ambulance')}{emergency.ambulance === emergency.fire ? ` ${t('ui.andFire')}` : ''}</p>
            </Card>
          </div>
          <p className="mt-2 text-[15.5px] font-bold text-jz-soft">
            {t('ui.helpDesk')}
          </p>
        </>
      )}

      {currency && (
        <>
          <SectionTitle>{t('ui.money')}</SectionTitle>
          <Card>
            <p className="text-jz-body-big font-black text-jz-ink m-0">{currency.name}</p>
            <Why>{currency.why}</Why>
          </Card>
        </>
      )}

      {airportToStay && (
        <>
          <SectionTitle>{t('ui.airportToStay')}</SectionTitle>
          <Card>
            <p className="text-[17px] leading-relaxed font-semibold text-jz-ink">{airportToStay}</p>
          </Card>
        </>
      )}

      {gettingAround && (
        <>
          <SectionTitle>{t('ui.gettingAround')}</SectionTitle>
          <Card>
            <p className="text-[17px] leading-relaxed font-semibold text-jz-ink">{gettingAround}</p>
          </Card>
        </>
      )}

      {luggageStorage && (
        <>
          <SectionTitle>{t('ui.luggageStorage')}</SectionTitle>
          <Card tint="bg-jz-mist" className="border-none">
            <p className="text-[17px] leading-relaxed font-semibold text-jz-ink">🧳 {luggageStorage}</p>
          </Card>
        </>
      )}

      {mobilityNotes && (
        <>
          <SectionTitle>{t('ui.mobilityNotes')}</SectionTitle>
          <Card tint="bg-jz-goldTint" className="border-none">
            <p className="text-[17px] leading-relaxed font-semibold text-jz-goldInk">⚠️ {mobilityNotes}</p>
          </Card>
        </>
      )}

      {bookingTips && (
        <>
          <SectionTitle>{t('ui.bookingTips')}</SectionTitle>
          <Card tint="bg-jz-tealTint" className="border-none">
            <p className="text-[17px] leading-relaxed font-semibold text-jz-tealDark">{bookingTips}</p>
            <p className="mt-2 text-[14.5px] font-bold text-jz-teal">
              {t('ui.bookingDisclaimer')}
            </p>
          </Card>
        </>
      )}

      {airlinePoints && (
        <>
          <SectionTitle>{t('ui.airlinePoints')}</SectionTitle>
          <Card tint="bg-jz-tealTint" className="border-none">
            <p className="text-[17px] leading-relaxed font-semibold text-jz-tealDark">✈️ {airlinePoints}</p>
          </Card>
        </>
      )}

      {keyPhrases.length > 0 && (
        <>
          <SectionTitle>{t('ui.phrases')}</SectionTitle>
          <div className="space-y-2.5">
            {keyPhrases.map(p => (
              <Card key={p.en}>
                <div className="flex justify-between items-baseline gap-2.5 flex-wrap">
                  <span className="text-[18.5px] font-black text-jz-ink">{p.en}</span>
                  <span className="text-[18px] font-extrabold text-jz-teal">{p.local}</span>
                </div>
                <p className="mt-1 text-[16px] font-bold text-jz-soft">{t('ui.sayIt')} "{p.say}"</p>
              </Card>
            ))}
          </div>
        </>
      )}

      {culturalTips.length > 0 && (
        <>
          <SectionTitle>{t('ui.localCustoms')}</SectionTitle>
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
          <SectionTitle>{t('ui.restrictedItems')}</SectionTitle>
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
          <SectionTitle>{t('ui.friendHeadsUp')}</SectionTitle>
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
