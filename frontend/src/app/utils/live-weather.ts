import { useEffect, useState } from 'react';
import { WeatherDay } from '../types/travel';

export function mapOpenWeatherIcon(code: string): string {
  if (code.startsWith('01')) return 'sunny';
  if (code.startsWith('02')) return 'partly';
  if (code.startsWith('03') || code.startsWith('04')) return 'cloudy';
  if (code.startsWith('09') || code.startsWith('10')) return 'rainy';
  if (code.startsWith('11')) return 'stormy';
  if (code.startsWith('13')) return 'snowy';
  return 'partly';
}

/* Live OpenWeather 5-day/3-hour forecast, bucketed into a WeatherDay[]. Used
 * everywhere the app shows weather (Today, Packing) so every screen agrees —
 * never the AI-guessed weatherWeek field, which isn't reliably populated and
 * can silently disagree with the real forecast. */
export function useLiveWeatherWeek(region: string): WeatherDay[] | null {
  const [live, setLive] = useState<WeatherDay[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || '';
        const cleanRegion = region.split(',')[0].trim();
        const resp = await fetch(`${API_BASE}/api/weather?q=${encodeURIComponent(cleanRegion)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (!data.list) return;

        const dailyData: Record<string, { temps: number[]; icons: string[] }> = {};
        for (const item of data.list) {
          const dateStr = item.dt_txt.split(' ')[0];
          if (!dailyData[dateStr]) dailyData[dateStr] = { temps: [], icons: [] };
          dailyData[dateStr].temps.push(item.main.temp);
          dailyData[dateStr].icons.push(item.weather[0].icon);
        }

        const days: WeatherDay[] = Object.keys(dailyData).slice(0, 5).map(date => {
          const info = dailyData[date];
          const hi = Math.round(Math.max(...info.temps));
          const lo = Math.round(Math.min(...info.temps));
          const midIcon = info.icons[Math.floor(info.icons.length / 2)];
          const icon = mapOpenWeatherIcon(midIcon);
          const dayLabel = new Date(date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
          const note = icon === 'rainy' ? 'Rain likely' : icon === 'stormy' ? 'Storms possible' : icon === 'snowy' ? 'Snow possible' : icon === 'sunny' ? 'Sunny' : icon === 'cloudy' ? 'Cloudy' : 'Some clouds';
          return { d: dayLabel, icon, hi, lo, note };
        });

        if (!cancelled) setLive(days);
      } catch (e) {
        console.error('Failed to load live forecast:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [region]);

  return live;
}
