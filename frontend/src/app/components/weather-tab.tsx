import { useEffect, useState } from 'react';
import { CloudSun, Sun, Cloud, CloudRain, CloudLightning, CloudSnow, Wind, Droplets, Thermometer, Gauge, X } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface WeatherTabProps {
  region: string;
  insights?: {
    weatherOverview: string;
    culturalTips: string[];
    safetyTips: string[];
    customsRestrictions?: string[];
  };
}

interface HourlyForecast {
  time: string;
  temp: number;
  feelsLike: number;
  pop: number;
  condition: string;
}

interface ForecastDay {
  date: string;
  dateKey: string;
  temp: number;
  currentTemp?: number;
  minTemp: number;
  maxTemp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
  cloudiness: number;
  description: string;
  icon: string;
  hourly: HourlyForecast[];
}

export function WeatherTab({ region, insights }: WeatherTabProps) {
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chartType, setChartType] = useState<'actual' | 'feels'>('actual');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const cleanRegion = region.split(',')[0].trim();
        const API_BASE = import.meta.env.VITE_API_URL || "";

        let data;
        try {
          const resp = await fetch(`${API_BASE}/api/weather?q=${encodeURIComponent(cleanRegion)}`);
          if (!resp.ok) throw new Error("Failed to fetch weather from API");
          data = await resp.json();
        } catch (apiErr) {
          console.error("Failed to fetch live weather:", apiErr);
          setForecast([]);
          setLoading(false);
          return;
        }

        // Process OpenWeather 5-day/3-hour forecast to daily forecast
        if (data.list) {
          const dailyData: Record<string, {
            temps: number[];
            feelsLikes: number[];
            humidities: number[];
            windSpeeds: number[];
            pressures: number[];
            cloudinesses: number[];
            descriptions: string[];
            icons: string[];
            hourly: HourlyForecast[];
          }> = {};

          data.list.forEach((item: any) => {
            const dateStr = item.dt_txt.split(' ')[0];
            const dateObj = new Date(item.dt_txt);
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

            const hourForecast: HourlyForecast = {
              time: timeStr.replace(':00', ''), // e.g. "12 PM"
              temp: Math.round(item.main.temp),
              feelsLike: Math.round(item.main.feels_like),
              pop: Math.round((item.pop || 0) * 100),
              condition: item.weather[0].main
            };

            if (!dailyData[dateStr]) {
              dailyData[dateStr] = {
                temps: [item.main.temp],
                feelsLikes: [item.main.feels_like],
                humidities: [item.main.humidity],
                windSpeeds: [item.wind?.speed || 0],
                pressures: [item.main.pressure],
                cloudinesses: [item.clouds?.all || 0],
                descriptions: [item.weather[0].description],
                icons: [item.weather[0].icon],
                hourly: [hourForecast]
              };
            } else {
              dailyData[dateStr].temps.push(item.main.temp);
              dailyData[dateStr].feelsLikes.push(item.main.feels_like);
              dailyData[dateStr].humidities.push(item.main.humidity);
              dailyData[dateStr].windSpeeds.push(item.wind?.speed || 0);
              dailyData[dateStr].pressures.push(item.main.pressure);
              dailyData[dateStr].cloudinesses.push(item.clouds?.all || 0);
              dailyData[dateStr].descriptions.push(item.weather[0].description);
              dailyData[dateStr].icons.push(item.weather[0].icon);
              dailyData[dateStr].hourly.push(hourForecast);
            }
          });

          const processed = Object.keys(dailyData).slice(0, 5).map((date, idx) => {
            const dayInfo = dailyData[date];
            const count = dayInfo.temps.length;
            const avgTemp = Math.round(dayInfo.temps.reduce((a, b) => a + b, 0) / count);
            const minTemp = Math.round(Math.min(...dayInfo.temps));
            const maxTemp = Math.round(Math.max(...dayInfo.temps));
            const currentTemp = idx === 0 ? Math.round(dayInfo.temps[0]) : undefined;
            const avgFeelsLike = Math.round(dayInfo.feelsLikes.reduce((a, b) => a + b, 0) / count);
            const avgHumidity = Math.round(dayInfo.humidities.reduce((a, b) => a + b, 0) / count);
            const avgWindSpeed = Number((dayInfo.windSpeeds.reduce((a, b) => a + b, 0) / count).toFixed(1));
            const avgPressure = Math.round(dayInfo.pressures.reduce((a, b) => a + b, 0) / count);
            const avgCloudiness = Math.round(dayInfo.cloudinesses.reduce((a, b) => a + b, 0) / count);

            const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return {
              date: dayName,
              dateKey: date,
              temp: avgTemp,
              currentTemp,
              minTemp,
              maxTemp,
              feelsLike: avgFeelsLike,
              humidity: avgHumidity,
              windSpeed: avgWindSpeed,
              pressure: avgPressure,
              cloudiness: avgCloudiness,
              description: dayInfo.descriptions[0],
              icon: dayInfo.icons[0],
              hourly: dayInfo.hourly
            };
          });

          setForecast(processed);
          setSelectedDayIdx(0);
        }
      } catch (e) {
        console.error("Failed to load forecast", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [region]);

  const getWeatherIcon = (iconCode: string) => {
    if (iconCode.startsWith('01')) return <Sun className="size-8 text-amber-400" />;
    if (iconCode.startsWith('02') || iconCode.startsWith('03') || iconCode.startsWith('04')) return <Cloud className="size-8 text-zinc-400" />;
    if (iconCode.startsWith('09') || iconCode.startsWith('10')) return <CloudRain className="size-8 text-blue-400" />;
    if (iconCode.startsWith('11')) return <CloudLightning className="size-8 text-purple-400" />;
    if (iconCode.startsWith('13')) return <CloudSnow className="size-8 text-sky-200" />;
    return <CloudSun className="size-8 text-zinc-400" />;
  };

  const defaultInsights = {
    weatherOverview: `${region} weather during this season is generally pleasant, but it's always good to be prepared. Check the live forecast details below for packing inspiration!`,
    culturalTips: [],
    safetyTips: []
  };

  const finalInsights = insights || defaultInsights;

  const toFahrenheit = (celsius: number) => Math.round((celsius * 9) / 5 + 32);

  const renderTempChart = (hourly: HourlyForecast[]) => {
    if (!hourly || hourly.length === 0) return null;

    const width = 360;
    const height = 120;
    const padX = 20;
    const padY = 25;

    const vals = hourly.map(h => chartType === 'actual' ? h.temp : h.feelsLike);
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const valRange = (maxVal - minVal) || 4;

    const points = hourly.map((h, i) => {
      const val = chartType === 'actual' ? h.temp : h.feelsLike;
      const x = padX + (i / (hourly.length - 1)) * (width - 2 * padX);
      const y = height - padY - ((val - minVal) / valRange) * (height - 2 * padY);
      return { x, y, temp: val, time: h.time, pop: h.pop, condition: h.condition };
    });

    let linePath = "";
    let fillPath = "";

    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1];
        const p = points[i];
        const cpX1 = p0.x + (p.x - p0.x) / 2;
        const cpY1 = p0.y;
        const cpX2 = p0.x + (p.x - p0.x) / 2;
        const cpY2 = p.y;
        linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
      }
      fillPath = linePath + ` L ${points[points.length - 1].x} ${height - 5} L ${points[0].x} ${height - 5} Z`;
    }

    return (
      <div className="relative w-full overflow-x-auto select-none mt-2 bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/50">
        <svg width={width} height={height} className="overflow-visible mx-auto">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f87171" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#27272a" strokeWidth={1} strokeDasharray="3 3" />
          <line x1={padX} y1={padY} x2={width - padX} y2={padY} stroke="#27272a" strokeWidth={1} strokeDasharray="3 3" />

          {/* Gradient Fill */}
          {fillPath && <path d={fillPath} fill="url(#chartGradient)" />}

          {/* Temperature Curve */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              strokeLinecap="round"
            />
          )}

          {/* Points & Labels */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={4}
                fill="#18181b"
                stroke={chartType === 'actual' ? '#10b981' : '#f59e0b'}
                strokeWidth={2.5}
              />
              {/* Stacked Temp Text */}
              <text
                x={p.x}
                y={p.y - 15}
                fill="#ffffff"
                fontSize={8}
                fontWeight="bold"
                textAnchor="middle"
              >
                {p.temp}°C
              </text>
              <text
                x={p.x}
                y={p.y - 6}
                fill="#a1a1aa"
                fontSize={7}
                fontWeight="medium"
                textAnchor="middle"
              >
                {toFahrenheit(p.temp)}°F
              </text>

              {/* Show time on even steps to prevent crowding */}
              {i % 2 === 0 && (
                <text
                  x={p.x}
                  y={height - 5}
                  fill="#71717a"
                  fontSize={8}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {p.time}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-32">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Weather Forecast */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <CloudSun className="size-5 text-emerald-400" />
            Live Forecast: {region.split(',')[0]}
          </h2>
          <p className="text-zinc-500 text-xs mb-3">Click any day card below to view detailed wind speed, humidity, and temperature trends.</p>

          {loading ? (
            <div className="grid grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="bg-zinc-900 border-zinc-800 animate-pulse h-32" />
              ))}
            </div>
          ) : forecast.length > 0 ? (
            <div className="grid grid-cols-5 gap-4">
              {forecast.map((day, idx) => {
                const isSelected = selectedDayIdx === idx;
                return (
                  <Card
                    key={idx}
                    onClick={() => {
                      setSelectedDayIdx(idx);
                      setIsModalOpen(true);
                    }}
                    className={`bg-zinc-900 border text-center cursor-pointer transition-all select-none ${isSelected
                      ? 'border-emerald-500 bg-zinc-800/80 shadow-emerald-500/5 shadow-lg scale-[1.03]'
                      : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
                      }`}
                  >
                    <CardContent className="p-4 flex flex-col items-center justify-between h-44">
                      <span className="text-xs font-semibold text-zinc-300">{day.date}</span>
                      {getWeatherIcon(day.icon)}
                      <div className="flex flex-col items-center leading-tight">
                        {day.currentTemp !== undefined ? (
                          <>
                            <span className="text-lg font-extrabold text-white">{day.currentTemp}°C</span>
                            <span className="text-xs text-zinc-400 mt-0.5">{toFahrenheit(day.currentTemp)}°F</span>
                            <span className="text-[10px] text-zinc-400 mt-1 font-bold uppercase tracking-wide">
                              H:{day.maxTemp}° L:{day.minTemp}°
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-lg font-extrabold text-white">{day.maxTemp}°C</span>
                            <span className="text-xs text-zinc-400 mt-0.5">{toFahrenheit(day.maxTemp)}°F</span>
                            <span className="text-[10px] text-zinc-400 mt-1 font-bold uppercase tracking-wide">
                              Low: {day.minTemp}°C
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400 capitalize truncate w-full">{day.description}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-zinc-900 border-zinc-800 p-6 text-center text-zinc-400">
              Could not load weather forecast data. Make sure OpenWeather API key is valid.
            </Card>
          )}
        </div>

        {/* Apple Weather Style Modal Dialog Popup */}
        {isModalOpen && forecast[selectedDayIdx] && (
          <div className="fixed inset-0 bg-black/65 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 text-white overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              {/* Close Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 p-1.5 rounded-full transition-colors"
              >
                <X className="size-4" />
              </button>

              {/* Apple-style Top Horizontal Day Selector */}
              <div className="flex justify-between items-center bg-zinc-950/40 rounded-2xl p-2 border border-zinc-800/50 mb-6 mt-2">
                {forecast.map((day, idx) => {
                  const isSelected = selectedDayIdx === idx;
                  const dayInitial = day.date.split(',')[0].charAt(0);
                  const dayNumber = day.date.split(' ').pop();
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDayIdx(idx)}
                      className="flex flex-col items-center flex-1 py-1 rounded-xl transition-all"
                    >
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">{dayInitial}</span>
                      <div className={`mt-1 size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isSelected
                        ? 'bg-white text-zinc-950 shadow-md font-extrabold scale-110'
                        : 'text-zinc-300 hover:bg-zinc-800/50'
                        }`}>
                        {dayNumber}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Apple Weather Header Style */}
              <div className="text-center mb-6">
                <span className="text-sm font-semibold text-emerald-400">
                  {new Date(forecast[selectedDayIdx].dateKey).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </span>

                {/* High / Low Grid Display with both Scales */}
                <div className="flex items-center justify-center gap-3 mt-4">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">High</span>
                    <span className="text-2xl font-extrabold text-white">
                      {forecast[selectedDayIdx].maxTemp}°C <span className="text-zinc-400 text-sm font-semibold">/ {toFahrenheit(forecast[selectedDayIdx].maxTemp)}°F</span>
                    </span>
                  </div>
                  <div className="h-8 w-px bg-zinc-800 self-end mx-2"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Low</span>
                    <span className="text-2xl font-extrabold text-zinc-400">
                      {forecast[selectedDayIdx].minTemp}°C <span className="text-zinc-500 text-sm font-semibold">/ {toFahrenheit(forecast[selectedDayIdx].minTemp)}°F</span>
                    </span>
                  </div>
                </div>

                <span className="text-sm text-zinc-400 capitalize block mt-3 font-medium">
                  {forecast[selectedDayIdx].description}
                </span>
              </div>

              {/* Toggle Actual vs Feels Like */}
              <div className="flex bg-zinc-950/60 p-0.5 rounded-xl border border-zinc-800/60 max-w-[200px] mx-auto mb-4 text-xs">
                <button
                  onClick={() => setChartType('actual')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${chartType === 'actual'
                    ? 'bg-zinc-800 text-white shadow'
                    : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                  Actual
                </button>
                <button
                  onClick={() => setChartType('feels')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${chartType === 'feels'
                    ? 'bg-zinc-800 text-white shadow'
                    : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                  Feels Like
                </button>
              </div>

              {/* Hourly Forecast Temperature Curve Chart */}
              {renderTempChart(forecast[selectedDayIdx].hourly)}

              {/* Grid details (Feels Like, Wind, Humidity, Pressure, Clouds) */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {/* Feels Like */}
                <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/50 flex flex-col">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">
                    <Thermometer className="size-3 text-amber-400" />
                    Feels Like
                  </div>
                  <span className="text-xl font-bold text-white">
                    {forecast[selectedDayIdx].feelsLike}°C
                  </span>
                  <span className="text-sm font-semibold text-zinc-400 mt-0.5">
                    {toFahrenheit(forecast[selectedDayIdx].feelsLike)}°F
                  </span>
                  <span className="text-[9px] text-zinc-500 mt-2 leading-snug">Wind chill and humidity affect this.</span>
                </div>

                {/* Wind */}
                <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/50 flex flex-col">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">
                    <Wind className="size-3 text-sky-400" />
                    Wind
                  </div>
                  <span className="text-xl font-bold text-white">{forecast[selectedDayIdx].windSpeed} m/s</span>
                  <span className="text-[9px] text-zinc-500 mt-1 leading-snug">Gentle breeze in the area.</span>
                </div>

                {/* Humidity */}
                <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/50 flex flex-col">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">
                    <Droplets className="size-3 text-teal-400" />
                    Humidity
                  </div>
                  <span className="text-xl font-bold text-white">{forecast[selectedDayIdx].humidity}%</span>
                  <span className="text-[9px] text-zinc-500 mt-1 leading-snug">The amount of moisture in the air.</span>
                </div>

                {/* Cloud Cover */}
                <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/50 flex flex-col">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">
                    <Cloud className="size-3 text-zinc-400" />
                    Cloudiness
                  </div>
                  <span className="text-xl font-bold text-white">{forecast[selectedDayIdx].cloudiness}%</span>
                  <span className="text-[9px] text-zinc-500 mt-1 leading-snug">Percentage of sky covered by clouds.</span>
                </div>

                {/* Air Pressure */}
                <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800/50 flex flex-col col-span-2">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">
                    <Gauge className="size-3 text-purple-400" />
                    Air Pressure
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-white">{forecast[selectedDayIdx].pressure} hPa</span>
                    <span className="text-[10px] text-zinc-400 font-medium">(1013 hPa is standard sea level)</span>
                  </div>
                </div>
              </div>

              {/* Apple style detail summary */}
              <div className="mt-4 bg-zinc-950/30 p-3.5 rounded-2xl border border-zinc-800/50 text-xs text-zinc-400 leading-relaxed">
                💡 <span className="font-semibold text-zinc-300">JourZy Advisory:</span> {
                  forecast[selectedDayIdx].temp > 25
                    ? "A warm day is ahead. Stay hydrated, wear light clothing, and don't forget your sunscreen!"
                    : forecast[selectedDayIdx].temp < 15
                      ? "Cooler temperatures expected. A light jacket or sweater is recommended for outdoor walks."
                      : "Pleasant outdoor weather. Perfect for walking tours and sightseeing around the city!"
                }
              </div>
            </div>
          </div>
        )}

        {/* AI Insights & Local Info */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg text-white mb-2 flex items-center gap-2">
                <Sun className="size-5 text-amber-400" />
                AI Environment & Packing Advice
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {finalInsights.weatherOverview}
              </p>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
