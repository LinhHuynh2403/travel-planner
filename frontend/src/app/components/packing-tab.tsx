import { useState } from 'react';
import { PackingItem, PackingEntry, WeatherDay } from '../types/travel';
import { useLiveWeatherWeek } from '../utils/live-weather';
import { useTranslation } from '../utils/translations';

interface PackingTabProps {
  packingList?: PackingItem[];
  region: string;
  weatherWeek?: WeatherDay[];
  weatherOverview?: string;
}

/* Backend may send items as plain strings (older trips) or as
   { name, why } objects (new prompt). Normalize both. */
function normalize(entry: PackingEntry): { name: string; why?: string } {
  return typeof entry === 'string' ? { name: entry } : entry;
}

const WEATHER_EMOJI: Record<string, string> = {
  sunny: '☀️', partly: '⛅', cloudy: '☁️', rainy: '🌧️', snowy: '❄️', stormy: '⛈️',
};

export function PackingTab({ packingList, region, weatherWeek, weatherOverview }: PackingTabProps) {
  const { t } = useTranslation();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const liveWeatherWeek = useLiveWeatherWeek(region);
  const displayWeatherWeek = liveWeatherWeek || weatherWeek;

  const toggleItem = (key: string) => {
    const next = new Set(checkedItems);
    next.has(key) ? next.delete(key) : next.add(key);
    setCheckedItems(next);
  };

  const list = packingList && packingList.length > 0 ? packingList : [];

  // "Leave these at home" renders as gold cards at the bottom, prototype-style
  const isLeaveGroup = (c: string) => c.toLowerCase().includes('leave');
  const packGroups = list.filter(g => !isLeaveGroup(g.category));
  const leaveGroups = list.filter(g => isLeaveGroup(g.category));

  const cityName = region.split(',')[0];

  return (
    <div className="space-y-1">
      {/* Header */}
      <h1 className="text-jz-screen font-black text-jz-ink leading-tight">
        {t('ui.packFor')} {cityName}
      </h1>
      <p className="text-jz-body text-jz-soft font-bold">
        {t('ui.packSubtitle')}
      </p>

      {/* The week's weather */}
      {(displayWeatherWeek && displayWeatherWeek.length > 0) ? (
        <>
          <h2 className="text-jz-title font-black text-jz-ink !mt-6 mb-3">{t('ui.weekWeather')}</h2>
          <div className="flex gap-2 overflow-x-auto pb-1.5 -mx-1 px-1 [scrollbar-width:none]">
            {displayWeatherWeek.map(w => (
              <div key={w.d} className="shrink-0 w-24 bg-jz-card border-[1.5px] border-jz-line rounded-jz-card px-1.5 py-3 text-center">
                <p className="text-[14.5px] font-extrabold text-jz-soft">{w.d}</p>
                <p className="text-3xl my-1.5 leading-none">{WEATHER_EMOJI[w.icon] || '🌤️'}</p>
                <p className="text-[16.5px] font-black text-jz-ink">
                  {w.hi}°<span className="text-jz-soft font-bold">/{w.lo}°</span>
                </p>
                <p className="text-[13.5px] font-bold text-jz-soft mt-0.5">{w.note}</p>
              </div>
            ))}
          </div>
        </>
      ) : weatherOverview ? (
        <div className="bg-jz-mist rounded-jz-card p-[18px] !mt-4">
          <p className="text-jz-body font-bold text-jz-ink leading-relaxed">
            🌦️ {weatherOverview}
          </p>
        </div>
      ) : null}

      {/* Packing groups */}
      {packGroups.map((group, gi) => (
        <div key={group.category}>
          <h2 className="text-jz-title font-black text-jz-ink !mt-6 mb-3">{group.category}</h2>
          <div className="space-y-2.5">
            {group.items.map((raw, ii) => {
              const item = normalize(raw);
              const key = `${gi}-${ii}-${item.name}`;
              const done = checkedItems.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleItem(key)}
                  aria-pressed={done}
                  className={`w-full text-left flex gap-3.5 bg-jz-card border-[1.5px] rounded-jz-card p-4 transition-colors ${done ? 'border-jz-teal' : 'border-jz-line'}`}
                >
                  <span
                    aria-hidden
                    className={`w-[34px] h-[34px] rounded-xl border-2 flex items-center justify-center shrink-0 mt-0.5 text-white font-black transition-colors ${done ? 'bg-jz-teal border-jz-teal' : 'bg-jz-bg border-jz-line'}`}
                  >
                    {done && '✓'}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-jz-body-big font-black text-jz-ink ${done ? 'line-through opacity-50' : ''}`}>
                      {item.name}
                    </span>
                    {item.why && (
                      <span className="block text-[16px] leading-snug font-semibold text-jz-teal mt-1">
                        <span className="font-extrabold">{t('ui.reason')} · </span>{item.why}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Leave these at home */}
      {leaveGroups.length > 0 && (
        <div>
          <h2 className="text-jz-title font-black text-jz-ink !mt-6 mb-3">{t('ui.leaveAtHome')}</h2>
          <div className="space-y-2.5">
            {leaveGroups.flatMap(g => g.items).map((raw, i) => {
              const item = normalize(raw);
              return (
                <div key={`${i}-${item.name}`} className="bg-jz-goldTint rounded-jz-card p-[18px]">
                  <p className="text-jz-body-big font-black text-jz-goldInk">✋ {item.name}</p>
                  {item.why && (
                    <p className="text-[16px] leading-snug font-bold text-jz-goldSoft mt-1">{item.why}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {list.length === 0 && (
        <p className="text-jz-body text-jz-soft font-bold !mt-6">
          {t('ui.emptyPacking')}
        </p>
      )}
    </div>
  );
}
