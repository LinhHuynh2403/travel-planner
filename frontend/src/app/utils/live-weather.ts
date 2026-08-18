import { useEffect, useState } from 'react';
import { WeatherDay } from '../types/travel';
import { getUnitPreference } from './units';

// Open-Meteo WMO weather codes -> the app's icon set.
export function mapOpenMeteoCode(code: number): string {
  if (code === 0) return 'sunny';
  if (code === 1 || code === 2) return 'partly';
  if (code === 3 || code === 45 || code === 48) return 'cloudy';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81].includes(code)) return 'rainy';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snowy';
  if ([82, 95, 96, 99].includes(code)) return 'stormy';
  return 'partly';
}

const NOTE_BY_ICON: Record<string, string> = {
  rainy: 'Rain likely', stormy: 'Storms possible', snowy: 'Snow possible',
  sunny: 'Sunny', cloudy: 'Cloudy', partly: 'Some clouds',
};

/* Live Open-Meteo 7-day forecast, already bucketed per day by the API itself.
 * Used everywhere the app shows weather (Today, Packing) so every screen
 * agrees — never the AI-guessed weatherWeek field, which isn't reliably
 * populated and can silently disagree with the real forecast. */
export function useLiveWeatherWeek(region: string): WeatherDay[] | null {
  const [live, setLive] = useState<WeatherDay[] | null>(null);
  // Re-fetch (not just re-render) when the unit preference changes — the
  // stored numbers themselves are in the old unit until Open-Meteo is asked
  // again with the new one, same pattern useTranslation() uses for language.
  const [unitTick, setUnitTick] = useState(0);
  useEffect(() => {
    const handler = () => setUnitTick((n) => n + 1);
    window.addEventListener('unitsChanged', handler);
    return () => window.removeEventListener('unitsChanged', handler);
  }, []);

  useEffect(() => {
    if (!region) return;
    let cancelled = false;
    (async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || '';
        const cleanRegion = region.split(',')[0].trim();
        const resp = await fetch(`${API_BASE}/api/weather?q=${encodeURIComponent(cleanRegion)}&unit=${getUnitPreference()}`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (!data.daily?.time) return;

        // hourly.time is one flat array covering all forecast_days at 24
        // points/day, in the same order as daily.time — slice per day rather
        // than matching timestamps, since both arrays come from the same
        // single Open-Meteo call and are guaranteed aligned.
        const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : undefined;

        const days: WeatherDay[] = data.daily.time.map((date: string, i: number) => {
          const icon = mapOpenMeteoCode(data.daily.weather_code[i]);
          // Force UTC when reading the plain "YYYY-MM-DD" Open-Meteo returns,
          // otherwise a negative local UTC offset rolls the label back a day.
          const dayLabel = new Date(date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
          const hourStart = i * 24, hourEnd = hourStart + 24;
          const hourlyTemps: number[] | undefined = data.hourly?.temperature_2m?.slice(hourStart, hourEnd);
          const hourlyHumidity: number[] = data.hourly?.relative_humidity_2m?.slice(hourStart, hourEnd) || [];
          const hourlyCloud: number[] = data.hourly?.cloud_cover?.slice(hourStart, hourEnd) || [];
          return {
            d: dayLabel,
            icon,
            hi: Math.round(data.daily.temperature_2m_max[i]),
            lo: Math.round(data.daily.temperature_2m_min[i]),
            note: NOTE_BY_ICON[icon],
            feelsLike: data.daily.apparent_temperature_max?.[i] != null ? Math.round(data.daily.apparent_temperature_max[i]) : undefined,
            windMph: data.daily.wind_speed_10m_max?.[i] != null ? Math.round(data.daily.wind_speed_10m_max[i]) : undefined,
            cloudPct: avg(hourlyCloud) != null ? Math.round(avg(hourlyCloud)!) : undefined,
            humidityPct: avg(hourlyHumidity) != null ? Math.round(avg(hourlyHumidity)!) : undefined,
            hourlyTemps: hourlyTemps?.length ? hourlyTemps.map((v: number) => Math.round(v)) : undefined,
          };
        });

        if (!cancelled) setLive(days);
      } catch (e) {
        console.error('Failed to load live forecast:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [region, unitTick]);

  return live;
}
