import { useEffect, useState } from 'react';
import { CloudSun, Sun, Cloud, CloudRain, CloudLightning, CloudSnow, Wind, Droplets, Thermometer, Gauge } from 'lucide-react';
import { Card, CardContent } from './ui/card';

interface WeatherTabProps {
  region: string;
  insights?: {
    weatherOverview: string;
    culturalTips: string[];
    safetyTips: string[];
  };
}

interface ForecastDay {
  date: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
  cloudiness: number;
  description: string;
  icon: string;
}

export function WeatherTab({ region, insights }: WeatherTabProps) {
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const cleanRegion = region.split(',')[0].trim();
        const resp = await fetch(`/api/weather?q=${encodeURIComponent(cleanRegion)}`);
        if (!resp.ok) throw new Error("Failed to fetch weather");
        const data = await resp.json();

        // Process OpenWeather 5-day/3-hour forecast to daily forecast
        if (data.list) {
          const dailyData: Record<string, any> = {};
          data.list.forEach((item: any) => {
            const dateStr = item.dt_txt.split(' ')[0];
            if (!dailyData[dateStr]) {
              dailyData[dateStr] = {
                temp: item.main.temp,
                feelsLike: item.main.feels_like,
                humidity: item.main.humidity,
                windSpeed: item.wind?.speed || 0,
                pressure: item.main.pressure,
                cloudiness: item.clouds?.all || 0,
                description: item.weather[0].description,
                icon: item.weather[0].icon,
                count: 1
              };
            } else {
              dailyData[dateStr].temp += item.main.temp;
              dailyData[dateStr].feelsLike += item.main.feels_like;
              dailyData[dateStr].humidity += item.main.humidity;
              dailyData[dateStr].windSpeed += item.wind?.speed || 0;
              dailyData[dateStr].pressure += item.main.pressure;
              dailyData[dateStr].cloudiness += item.clouds?.all || 0;
              dailyData[dateStr].count += 1;
            }
          });

          const processed = Object.keys(dailyData).slice(0, 5).map(date => {
            const count = dailyData[date].count;
            const avgTemp = Math.round(dailyData[date].temp / count);
            const avgFeelsLike = Math.round(dailyData[date].feelsLike / count);
            const avgHumidity = Math.round(dailyData[date].humidity / count);
            const avgWindSpeed = Number((dailyData[date].windSpeed / count).toFixed(1));
            const avgPressure = Math.round(dailyData[date].pressure / count);
            const avgCloudiness = Math.round(dailyData[date].cloudiness / count);

            const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return {
              date: dayName,
              temp: avgTemp,
              feelsLike: avgFeelsLike,
              humidity: avgHumidity,
              windSpeed: avgWindSpeed,
              pressure: avgPressure,
              cloudiness: avgCloudiness,
              description: dailyData[date].description,
              icon: dailyData[date].icon
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

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-32">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Weather Forecast */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <CloudSun className="size-5 text-emerald-400" />
            Live Forecast: {region.split(',')[0]}
          </h2>
          <p className="text-zinc-500 text-xs mb-3">Click any day card below to view detailed wind speed, humidity, and feels-like temperature.</p>

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
                    onClick={() => setSelectedDayIdx(idx)}
                    className={`bg-zinc-900 border text-center cursor-pointer transition-all select-none ${isSelected
                      ? 'border-emerald-500 bg-zinc-800/80 shadow-emerald-500/5 shadow-lg scale-[1.03]'
                      : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
                      }`}
                  >
                    <CardContent className="p-4 flex flex-col items-center justify-between h-32">
                      <span className="text-xs font-semibold text-zinc-400">{day.date}</span>
                      {getWeatherIcon(day.icon)}
                      <span className="text-lg font-bold text-white">{day.temp}°C</span>
                      <span className="text-[10px] text-zinc-500 capitalize truncate w-full">{day.description}</span>
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

        {/* Selected Day Details */}
        {!loading && forecast.length > 0 && forecast[selectedDayIdx] && (
          <Card className="bg-zinc-900 border-zinc-800 text-white shadow-xl">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg text-white mb-6 flex items-center gap-2 border-b border-zinc-800 pb-3">
                <CloudSun className="size-5 text-emerald-400" />
                Detailed Weather on {forecast[selectedDayIdx].date}
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {/* Condition */}
                <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-850 flex flex-col items-center justify-center text-center">
                  {getWeatherIcon(forecast[selectedDayIdx].icon)}
                  <span className="text-zinc-500 text-[10px] mt-2 uppercase font-bold tracking-wider">Condition</span>
                  <span className="text-sm font-semibold mt-1 text-white capitalize">{forecast[selectedDayIdx].description}</span>
                </div>

                {/* Feels Like */}
                <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-850 flex flex-col items-center justify-center text-center">
                  <Thermometer className="size-8 text-amber-400" />
                  <span className="text-zinc-500 text-[10px] mt-2 uppercase font-bold tracking-wider">Feels Like</span>
                  <span className="text-lg font-bold mt-1 text-white">{forecast[selectedDayIdx].feelsLike}°C</span>
                </div>

                {/* Wind */}
                <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-850 flex flex-col items-center justify-center text-center">
                  <Wind className="size-8 text-sky-400" />
                  <span className="text-zinc-500 text-[10px] mt-2 uppercase font-bold tracking-wider">Wind Speed</span>
                  <span className="text-lg font-bold mt-1 text-white">{forecast[selectedDayIdx].windSpeed} m/s</span>
                </div>

                {/* Humidity */}
                <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-850 flex flex-col items-center justify-center text-center">
                  <Droplets className="size-8 text-teal-400" />
                  <span className="text-zinc-500 text-[10px] mt-2 uppercase font-bold tracking-wider">Humidity</span>
                  <span className="text-lg font-bold mt-1 text-white">{forecast[selectedDayIdx].humidity}%</span>
                </div>

                {/* Cloudiness / Pressure */}
                <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-850 flex flex-col items-center justify-center text-center">
                  <Gauge className="size-8 text-purple-400" />
                  <span className="text-zinc-500 text-[10px] mt-2 uppercase font-bold tracking-wider">Air Pressure</span>
                  <span className="text-lg font-bold mt-1 text-white">{forecast[selectedDayIdx].pressure} hPa</span>
                </div>
              </div>
            </CardContent>
          </Card>
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
