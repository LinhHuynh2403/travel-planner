import { useEffect, useState } from 'react';
import { ChevronRight, Wallet, MapPin, Star, Train, Bus, Footprints, Car, Umbrella, MessageCircle } from 'lucide-react';
import { DayItinerary, GeneratedItinerary, ItineraryActivity } from '../types/travel';
import { Card, Why } from './jourzy-ui';

function getTravelIcon(text: string) {
  const t = (text || '').toLowerCase();
  if (t.includes('walk')) return Footprints;
  if (t.includes('bus')) return Bus;
  if (t.includes('taxi') || t.includes('car') || t.includes('drive') || t.includes('uber') || t.includes('grab')) return Car;
  if (t.includes('train') || t.includes('subway') || t.includes('metro') || t.includes('rail') || t.includes('transit')) return Train;
  return Train;
}

interface MyPlanTabProps {
  itinerary: GeneratedItinerary;
  initialDayNumber?: number | null;
  onOpenChat: () => void;
}

function getPeriodLabel(timeStr: string): string {
  const match = (timeStr || '').match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return '';
  let hours = parseInt(match[1]);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  if (hours < 11) return 'Morning';
  if (hours < 12) return 'Late Morning';
  if (hours < 17) return 'Afternoon';
  if (hours < 21) return 'Evening';
  return 'Night';
}

const CATEGORY_DAY_TITLES: Record<string, string> = {
  food: 'Food & flavors',
  museum: 'Museums at your pace',
  exhibition: 'Exhibitions & culture',
  nature: 'Nature & fresh air',
  activity: 'Sights at your pace',
  rest: 'A slower day',
};

function getDayTitle(day: DayItinerary, region: string): string {
  const counts: Record<string, number> = {};
  for (const act of day.activities) {
    counts[act.category] = (counts[act.category] || 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top) return `Your day in ${region.split(',')[0]}`;
  return CATEGORY_DAY_TITLES[top[0]] || `Your day in ${region.split(',')[0]}`;
}

function mapsSearchUrl(title: string, location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title + ' ' + location)}`;
}

/* Best-effort parse of the legacy prose-paragraph budget shape (from trips
 * generated before the itemized breakdown existed) into pseudo line items,
 * so old trips still render as a receipt instead of one text blob. */
function parseLegacyBreakdown(text: string): { category: string; amount: number }[] {
  const rows: { category: string; amount: number }[] = [];
  const regex = /([A-Za-z][A-Za-z &()/-]*?)\s*:?\s*\$(\d[\d,]*)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const category = match[1].trim().replace(/^[.\s]+/, '');
    const amount = parseInt(match[2].replace(/,/g, ''), 10);
    if (category && !Number.isNaN(amount)) rows.push({ category, amount });
  }
  return rows;
}

function paceDescription(itinerary: GeneratedItinerary): string {
  const days = itinerary.days || [];
  if (days.length === 0) return '';
  const avg = days.reduce((s, d) => s + d.activities.length, 0) / days.length;
  const pace = avg <= 3 ? 'relaxed pace: 2–3 stops a day' : avg <= 5 ? 'balanced pace: 3–5 stops a day' : 'active pace: 5+ stops a day';
  return `your ${pace}, picked from top-rated places on Google Maps`;
}

export function MyPlanTab({ itinerary, initialDayNumber, onOpenChat }: MyPlanTabProps) {
  const days = itinerary.days || [];
  const [dayNumber, setDayNumber] = useState<number>(initialDayNumber || days[0]?.dayNumber || 1);
  const [showBudget, setShowBudget] = useState(false);

  useEffect(() => {
    if (initialDayNumber) setDayNumber(initialDayNumber);
  }, [initialDayNumber]);

  const day = days.find(d => d.dayNumber === dayNumber) || days[0];
  const region = itinerary.plan.region;
  const budgetSummary = itinerary.insights?.budgetSummary;
  const weatherWeek = itinerary.insights?.weatherWeek;
  const dayWeather = day ? weatherWeek?.[day.dayNumber - 1] : undefined;
  const isRainyDay = dayWeather && (dayWeather.icon === 'rainy' || dayWeather.icon === 'stormy');
  // Legacy trips (generated before backupTip existed) fall back to a generic
  // weather-based nudge; new trips always get a real, activity-specific tip.
  const backupMessage = day?.backupTip || (isRainyDay ? 'Rain is in the forecast today — ask JourZy for an indoor alternative.' : null);

  const arrival = new Date(itinerary.plan.arrivalDate);
  const leave = new Date(itinerary.plan.leaveDate);
  const dateRange = `${arrival.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${leave.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  // Legacy trips (generated before the itemized breakdown existed) still
  // have a prose-paragraph budget. Try to parse it into rows, but only
  // trust the result if the parsed amounts actually add up to the total —
  // otherwise a naive regex match (e.g. a per-night rate) could show a
  // wrong number, which we never want for something this honesty-sensitive.
  const legacyBreakdownText = budgetSummary && !Array.isArray(budgetSummary.breakdown)
    ? (budgetSummary.breakdown as unknown as string)
    : null;
  const legacyRows = legacyBreakdownText ? parseLegacyBreakdown(legacyBreakdownText) : null;
  const legacyRowsSum = legacyRows?.reduce((s, r) => s + r.amount, 0) ?? 0;
  const legacyRowsValid = !!legacyRows && legacyRows.length > 0 && budgetSummary
    && Math.abs(legacyRowsSum - budgetSummary.totalEstimatedCost) <= Math.max(5, budgetSummary.totalEstimatedCost * 0.05);

  return (
    <div>
      <h1 className="text-jz-screen font-black text-jz-ink leading-tight">{region}</h1>
      <p className="mt-0.5 text-[17px] font-bold text-jz-soft">{dateRange} · {paceDescription(itinerary)}</p>

      {budgetSummary ? (
        <Card tint="bg-jz-tealTint" className="mt-3.5 border-none">
          <button onClick={() => setShowBudget(v => !v)} className="w-full flex items-center justify-between text-left">
            <span className="flex items-center gap-2.5 text-[19px] font-black text-jz-tealDark">
              <Wallet className="w-[22px] h-[22px]" /> Whole trip: about ${budgetSummary.totalEstimatedCost.toLocaleString()}
            </span>
            <ChevronRight className={`w-6 h-6 text-jz-tealDark transition-transform ${showBudget ? 'rotate-90' : ''}`} />
          </button>
          {showBudget ? (
            <div className="mt-3 pt-2.5 border-t border-jz-teal/20">
              {(Array.isArray(budgetSummary.breakdown) ? budgetSummary.breakdown : legacyRowsValid ? legacyRows! : null)?.map(item => (
                <div key={item.category} className="flex justify-between py-1.5 text-[17px] font-bold text-jz-ink">
                  <span>{item.category}</span>
                  <span>${item.amount.toLocaleString()}</span>
                </div>
              )) ?? (
                // Couldn't parse a trustworthy itemized shape — show the honest prose as-is
                <p className="text-[16px] font-semibold text-jz-ink leading-relaxed">{legacyBreakdownText}</p>
              )}
              <p className="mt-2 text-[15.5px] font-bold text-jz-tealDark">{budgetSummary.fitsStatedBudget}</p>
            </div>
          ) : (
            <p className="mt-1.5 text-[15.5px] font-bold text-jz-tealDark">Tap to see where every dollar goes.</p>
          )}
        </Card>
      ) : (
        <Card tint="bg-jz-tealTint" className="mt-3.5 border-none">
          <button onClick={onOpenChat} className="w-full flex items-center justify-between text-left">
            <span className="flex items-center gap-2.5 text-[17px] font-black text-jz-tealDark">
              <Wallet className="w-5 h-5" /> Ask JourZy for a cost estimate
            </span>
            <ChevronRight className="w-5 h-5 text-jz-tealDark" />
          </button>
        </Card>
      )}

      <div className="flex gap-2 overflow-x-auto pt-4 pb-1.5 -mx-1 px-1 no-scrollbar">
        {days.map(d => {
          const active = d.dayNumber === dayNumber;
          return (
            <button
              key={d.dayNumber}
              onClick={() => setDayNumber(d.dayNumber)}
              className={`shrink-0 min-w-[74px] min-h-[58px] rounded-2xl font-extrabold text-[16px] border-[1.5px] ${active ? 'bg-jz-teal text-white border-jz-teal' : 'bg-white text-jz-ink border-jz-line'
                }`}
            >
              Day {d.dayNumber}<br />
              <span className="text-[13.5px] font-bold opacity-85">
                {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </button>
          );
        })}
      </div>

      {day && (
        <>
          <h2 className="mt-2.5 text-jz-title font-black text-jz-ink">{getDayTitle(day, region)}</h2>
          <p className="mb-3 text-[16.5px] font-bold text-jz-soft">
            {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>

          <div className="space-y-0">
            {day.activities.map((act: ItineraryActivity, i) => {
              const next = day.activities[i + 1];
              return (
                <div key={i}>
                  <Card className="space-y-0">
                    <p className="text-[15px] font-extrabold text-jz-gold uppercase tracking-wide">{getPeriodLabel(act.time)}</p>
                    <p className="mt-1 text-jz-title font-black text-jz-ink">{act.title}</p>
                    <Why>{act.description}</Why>
                    <div className="flex justify-between items-center mt-3 gap-2.5">
                      {act.place?.rating ? (
                        <span className="flex items-center gap-1.5 text-[16px] font-extrabold text-jz-ink">
                          <Star className="w-[18px] h-[18px]" fill="#F0A742" stroke="#F0A742" /> {act.place.rating.toFixed(1)}{' '}
                          <span className="text-jz-soft font-bold">on Google</span>
                        </span>
                      ) : <span />}
                      <a
                        href={act.place?.mapsUrl || mapsSearchUrl(act.title, act.location)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 no-underline bg-jz-tealTint text-jz-tealDark font-extrabold text-[16px] px-4 py-2.5 rounded-jz-btn min-h-[44px]"
                      >
                        <MapPin className="w-[18px] h-[18px]" /> Directions
                      </a>
                    </div>
                  </Card>
                  {next?.travelTimeFromPrevious && (() => {
                    const TravelIcon = getTravelIcon(next.travelTimeFromPrevious);
                    return (
                      <div className="flex items-center gap-2 py-2.5 pl-4 text-jz-soft text-[16px] font-bold">
                        <TravelIcon className="w-[19px] h-[19px]" /> {next.travelTimeFromPrevious}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {backupMessage && (
            <Card tint="bg-jz-mist" className="mt-3.5 border-none">
              <p className="text-[16.5px] leading-relaxed font-bold text-jz-ink">
                <Umbrella className="w-[18px] h-[18px] text-jz-teal inline -mt-0.5 mr-1" />{' '}
                <b>If plans change:</b> {backupMessage}{' '}
                <button onClick={onOpenChat} className="inline-flex items-center gap-1 text-jz-teal underline font-extrabold">
                  <MessageCircle className="w-4 h-4" /> Talk to JourZy
                </button>
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
