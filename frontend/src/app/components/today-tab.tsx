import { useState } from 'react';
import { CloudSun, Sun, Cloud, CloudRain, CloudLightning, CloudSnow, Heart, Train, Bus, Footprints, Car, MapPin, Star, Phone, Map as MapIcon, MessageCircle } from 'lucide-react';
import { DayItinerary, GeneratedItinerary } from '../types/travel';
import { Card, Why, SectionTitle, BigButton } from './jourzy-ui';
import { useLiveWeatherWeek } from '../utils/live-weather';
import { useTranslation } from '../utils/translations';

interface TodayTabProps {
  itinerary: GeneratedItinerary;
  memories: string[];
  userName: string | null;
  onSeeWholeDay: (dayNumber: number) => void;
  onOpenChat: () => void;
}

function getTravelIcon(text: string) {
  const t = (text || '').toLowerCase();
  if (t.includes('walk')) return Footprints;
  if (t.includes('bus')) return Bus;
  if (t.includes('taxi') || t.includes('car') || t.includes('drive') || t.includes('uber') || t.includes('grab')) return Car;
  return Train;
}

function findTodayDay(days: DayItinerary[]): DayItinerary {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exact = days.find(d => {
    const dd = new Date(d.date);
    dd.setHours(0, 0, 0, 0);
    return dd.getTime() === today.getTime();
  });
  if (exact) return exact;

  const upcoming = days.find(d => new Date(d.date) >= today);
  return upcoming || days[days.length - 1] || days[0];
}

const WEATHER_ICON: Record<string, any> = {
  sunny: Sun, partly: CloudSun, cloudy: Cloud, rainy: CloudRain, snowy: CloudSnow, stormy: CloudLightning,
};

function mapsSearchUrl(title: string, location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title + ' ' + location)}`;
}

export function TodayTab({ itinerary, memories, userName, onSeeWholeDay, onOpenChat }: TodayTabProps) {
  const { t } = useTranslation();
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const region = itinerary.plan.region;
  const cityName = region.split(',')[0];
  const days = itinerary.days || [];
  const todayDay = days.length > 0 ? findTodayDay(days) : null;

  const toggleItem = (idx: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? t('ui.morning') || 'Good morning' : hour < 18 ? t('ui.afternoon') || 'Good afternoon' : t('ui.evening') || 'Good evening';
  const greeting = userName ? `${timeOfDay}, ${userName}` : timeOfDay;
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const liveWeatherWeek = useLiveWeatherWeek(region);
  // Live forecast is always indexed from "now" (index 0 = today), regardless
  // of trip day number. The AI-guessed fallback is indexed by trip day, so it
  // needs today's actual day-of-trip offset instead.
  const todayIdx = todayDay ? Math.max(0, todayDay.dayNumber - 1) : 0;
  const weatherWeek = liveWeatherWeek || itinerary.insights?.weatherWeek;
  const weatherOffset = liveWeatherWeek ? 0 : todayIdx;
  const todayWeather = weatherWeek?.[weatherOffset];
  const tomorrowWeather = weatherWeek?.[weatherOffset + 1];
  const TodayIcon = todayWeather ? WEATHER_ICON[todayWeather.icon] || CloudSun : CloudSun;

  let weatherAdvisory = t('ui.packWeatherAdvisory') || 'Check the Packing tab for a full week-ahead forecast.';
  if (todayWeather) {
    const tomorrowRainy = tomorrowWeather && (tomorrowWeather.icon === 'rainy' || tomorrowWeather.icon === 'stormy');
    const todayRainy = todayWeather.icon === 'rainy' || todayWeather.icon === 'stormy';
    if (todayRainy) {
      weatherAdvisory = (t('ui.bringRainShell') || 'Bring a rain shell today — ') + todayWeather.note.toLowerCase();
    } else if (tomorrowRainy) {
      weatherAdvisory = t('ui.noRainTodayTomorrow') || 'No rain today — but pack the rain shell tomorrow.';
    } else {
      weatherAdvisory = t('ui.niceWeather') || 'Nice weather for exploring today.';
    }
  }

  const emergency = itinerary.insights?.emergencyNumbers;

  return (
    <div>
      <p className="mt-1 text-[17px] font-bold text-jz-soft">{dateLabel}</p>
      <h1 className="text-jz-hero font-black text-jz-ink leading-tight">{greeting}! 👋</h1>

      {memories.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center mt-3.5 mb-1">
          <span className="text-[15px] font-extrabold text-jz-soft flex items-center gap-1.5">
            <Heart className="w-[15px] h-[15px]" fill="#F0A742" stroke="#F0A742" /> {t('ui.remembers')}
          </span>
          {memories.map(m => (
            <span key={m} className="jz-chip">{m}</span>
          ))}
        </div>
      )}

      {todayDay && (
        <>
          <SectionTitle>{t('ui.todayIn')} {cityName} — {t('ui.day')} {todayDay.dayNumber} {t('ui.of')} {days.length}</SectionTitle>

          <Card tint="bg-jz-mist" className="border-none">
            <div className="flex items-center gap-3.5">
              <TodayIcon className="w-11 h-11 text-jz-teal" strokeWidth={2} />
              <div>
                {todayWeather ? (
                  <p className="text-2xl font-black text-jz-ink m-0">{todayWeather.hi}° · {todayWeather.note}</p>
                ) : (
                  <p className="text-2xl font-black text-jz-ink m-0">{cityName} {t('ui.weatherSuffix')}</p>
                )}
                <p className="mt-0.5 text-[16.5px] font-semibold text-jz-soft">{weatherAdvisory}</p>
              </div>
            </div>
          </Card>

          {todayDay.activities.length > 0 && (
            <>
              <SectionTitle>{t('ui.todaysSuggestions')}</SectionTitle>
              <div className="space-y-2.5">
                {todayDay.activities.map((act, idx) => {
                  const done = checkedItems.has(idx);
                  return (
                    <div key={idx}>
                      {idx > 0 && act.travelTimeFromPrevious && (() => {
                        const TravelIcon = getTravelIcon(act.travelTimeFromPrevious);
                        return (
                          <div className="flex items-center gap-2 py-2 pl-1 text-jz-soft text-[15px] font-bold">
                            <TravelIcon className="w-[17px] h-[17px]" /> {act.travelTimeFromPrevious}
                          </div>
                        );
                      })()}
                      <Card>
                        <div className="flex gap-3.5">
                          <button
                            onClick={() => toggleItem(idx)}
                            aria-pressed={done}
                            className={`w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 text-white font-black transition-colors ${done ? 'bg-jz-teal border-jz-teal' : 'bg-jz-bg border-jz-line'}`}
                          >
                            {done && '✓'}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-extrabold text-jz-gold uppercase tracking-wide">
                              {act.category === 'food' ? t('ui.meal') : act.category}
                            </p>
                            <p className={`mt-0.5 text-jz-title font-black text-jz-ink ${done ? 'line-through opacity-50' : ''}`}>{act.title}</p>
                            <Why>{act.description}</Why>
                            <div className="flex justify-between items-center mt-3 gap-2.5">
                              {act.place?.rating ? (
                                <span className="flex items-center gap-1.5 text-[16px] font-extrabold text-jz-ink">
                                  <Star className="w-[18px] h-[18px]" fill="#F0A742" stroke="#F0A742" /> {act.place.rating.toFixed(1)}{' '}
                                  <span className="text-jz-soft font-bold">{t('ui.onGoogle')}</span>
                                </span>
                              ) : <span />}
                              <a
                                href={act.place?.mapsUrl || mapsSearchUrl(act.title, act.location)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 no-underline bg-jz-tealTint text-jz-tealDark font-extrabold text-[16px] px-4 py-2.5 rounded-jz-btn min-h-[44px]"
                              >
                                <MapPin className="w-[18px] h-[18px]" /> {t('ui.directions')}
                              </a>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="grid gap-3 mt-4">
            <BigButton icon={MapIcon} onClick={() => onSeeWholeDay(todayDay.dayNumber)}>{t('ui.seeWholeDay')}</BigButton>
            <BigButton icon={MessageCircle} secondary onClick={onOpenChat}>{t('ui.talkToJourzy')}</BigButton>
          </div>

          {emergency && (
            <Card tint="bg-jz-goldTint" className="mt-4 border-none">
              <p className="text-[16.5px] leading-relaxed font-bold text-jz-goldSoft">
                <Phone className="w-[17px] h-[17px] inline -mt-0.5 mr-1" /> {t('ui.goodToKnow')} {cityName}, {t('ui.goodToKnowDial') || 'dial'} <b className="text-jz-goldInk">{emergency.police}</b> {t('ui.forPolice')}
                {emergency.ambulance && <> {t('ui.and')} <b className="text-jz-goldInk">{emergency.ambulance}</b> {t('ui.forAmbulance')}</>}{t('ui.friendlyHeadsUp')}
              </p>
            </Card>
          )}
        </>
      )}

      {!todayDay && (
        <p className="mt-6 text-jz-body text-jz-soft font-bold">{t('ui.emptySchedule')}</p>
      )}
    </div>
  );
}
