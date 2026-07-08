import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send, User as UserIcon, Star, MapPin, RefreshCw } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { GeneratedItinerary } from '../types/travel';

interface PlaceSuggestion {
  placeId?: string;
  title: string;
  address: string;
  rating?: number;
  lat?: number;
  lng?: number;
  mapsUrl: string;
}

type ChatMessage = { id: string; role: 'ai' | 'user'; text: string; suggestion?: PlaceSuggestion };

interface ChatOverlayProps {
  itinerary: GeneratedItinerary;
  prefill?: string;
  onClose: () => void;
  onReplaceActivity: (dayNumber: number, activityIdx: number, newData: { title: string; location: string; description: string; place: PlaceSuggestion }) => void;
}

function buildItineraryContext(itinerary: GeneratedItinerary): string {
  const region = itinerary.plan.region;
  const arrival = new Date(itinerary.plan.arrivalDate).toDateString();
  const leave = new Date(itinerary.plan.leaveDate).toDateString();
  const days = (itinerary.days || []).map(d => {
    const stops = d.activities.map(a => `${a.time} ${a.title} (${a.category})`).join('; ');
    return `Day ${d.dayNumber} (${new Date(d.date).toDateString()}): ${stops}`;
  }).join('\n');
  return `Destination: ${region}\nDates: ${arrival} to ${leave}\n${days}`;
}

export function ChatOverlay({ itinerary, prefill, onClose, onReplaceActivity }: ChatOverlayProps) {
  const region = itinerary.plan.region;
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = sessionStorage.getItem('itineraryChatMessages');
    return saved ? JSON.parse(saved) : [
      { id: '1', role: 'ai', text: `Good to see you! Want to tweak something in your ${region.split(',')[0]} plan, or just have a question?` },
    ];
  });
  const [inputValue, setInputValue] = useState(prefill || '');
  const [isThinking, setIsThinking] = useState(false);
  const [pickerFor, setPickerFor] = useState<{ suggestion: PlaceSuggestion } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem('itineraryChatMessages', JSON.stringify(messages));
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue('');
    const updated = [...messages, { id: Date.now().toString(), role: 'user' as const, text }];
    setMessages(updated);
    setIsThinking(true);
    try {
      const resp = await apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: updated,
          text,
          mode: 'itinerary',
          itineraryContext: buildItineraryContext(itinerary),
          // Authoritative "City, Country" for resolving <<SUGGEST>> place
          // lookups — the model's own city guess inside the tag is sometimes
          // too vague (just "Nha Trang", no country) for Google's text search
          // to disambiguate, which has resolved suggestions to same-named
          // places in the US instead of the actual destination.
          region: itinerary.plan.region,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: data.text, suggestion: data.suggestion || undefined }]);
      } else {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: "Sorry, I couldn't connect just now — try again in a moment." }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: "Sorry, I couldn't connect just now — try again in a moment." }]);
    } finally {
      setIsThinking(false);
    }
  };

  const confirmReplace = (dayNumber: number, activityIdx: number) => {
    if (!pickerFor) return;
    const s = pickerFor.suggestion;
    onReplaceActivity(dayNumber, activityIdx, {
      title: s.title,
      location: s.address,
      description: `Swapped in via chat: ${s.title} — ${s.address}.`,
      place: s,
    });
    setPickerFor(null);
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: `Done! Swapped that into your schedule. ✨` }]);
  };

  return (
    <div className="absolute inset-0 bg-jz-bg flex flex-col z-30">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b-[1.5px] border-jz-line bg-white shrink-0">
        <div className="w-11 h-11 rounded-2xl bg-jz-teal flex items-center justify-center shrink-0 shadow-inner">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-jz-title text-jz-ink m-0">JourZy</p>
          <p className="text-jz-teal text-xs font-black uppercase tracking-wide m-0">Your travel companion</p>
        </div>
        <button onClick={onClose} aria-label="Close chat" className="p-2.5 text-jz-ink">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {messages.map(m => (
          <div key={m.id} className={`flex gap-3 items-start ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${m.role === 'ai' ? 'bg-jz-tealTint text-jz-teal border-jz-teal/20' : 'bg-jz-mist text-jz-ink border-jz-line'
              }`}>
              {m.role === 'ai' ? <Sparkles className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
            </div>
            <div className={`max-w-[85%] flex flex-col gap-2.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`border-[1.5px] p-4 text-jz-body-big shadow-sm leading-relaxed whitespace-pre-wrap ${m.role === 'ai'
                ? 'bg-white border-jz-line rounded-[22px] rounded-bl-[6px] text-jz-ink'
                : 'bg-jz-teal border-jz-teal rounded-[22px] rounded-tr-[6px] text-white font-bold'
                }`}>
                {m.text}
              </div>

              {m.suggestion && (
                <div className="w-full bg-white border-[1.5px] border-jz-teal rounded-jz-card p-4">
                  <p className="text-jz-body-big font-black text-jz-ink">{m.suggestion.title}</p>
                  {m.suggestion.address && <p className="text-[14px] text-jz-soft font-bold mt-0.5">{m.suggestion.address}</p>}
                  <div className="flex justify-between items-center mt-3 gap-2.5">
                    {m.suggestion.rating ? (
                      <span className="flex items-center gap-1.5 text-[15px] font-extrabold text-jz-ink">
                        <Star className="w-4 h-4" fill="#F0A742" stroke="#F0A742" /> {m.suggestion.rating.toFixed(1)}{' '}
                        <span className="text-jz-soft font-bold">on Google</span>
                      </span>
                    ) : <span />}
                    <a
                      href={m.suggestion.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 no-underline bg-jz-tealTint text-jz-tealDark font-extrabold text-[14px] px-3 py-2 rounded-jz-btn"
                    >
                      <MapPin className="w-4 h-4" /> Directions
                    </a>
                  </div>
                  <button
                    onClick={() => setPickerFor({ suggestion: m.suggestion! })}
                    className="w-full mt-2.5 min-h-[44px] rounded-jz-btn bg-jz-teal text-white font-extrabold text-[15px] flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Replace in schedule
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-3 items-start">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-jz-tealTint text-jz-teal border-jz-teal/20">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-white border-[1.5px] border-jz-line rounded-[22px] rounded-bl-[6px] p-4 flex gap-1 items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-jz-teal animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-jz-teal animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-jz-teal animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {pickerFor && (
        <div className="absolute inset-0 bg-black/40 flex items-end z-40" onClick={() => setPickerFor(null)}>
          <div
            className="w-full bg-white rounded-t-[28px] p-4 max-h-[70%] overflow-y-auto no-scrollbar"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-jz-title font-black text-jz-ink mb-3">Which stop should this replace?</p>
            {(itinerary.days || []).map(day => (
              <div key={day.dayNumber} className="mb-3">
                <p className="text-[13px] font-extrabold text-jz-soft uppercase tracking-wide mb-1.5">Day {day.dayNumber}</p>
                <div className="space-y-2">
                  {day.activities.map((act, idx) => (
                    <button
                      key={idx}
                      onClick={() => confirmReplace(day.dayNumber, idx)}
                      className="w-full text-left bg-jz-bg border-[1.5px] border-jz-line rounded-jz-card p-3 hover:border-jz-teal transition-all"
                    >
                      <span className="text-[13px] font-extrabold text-jz-gold uppercase">{act.time}</span>
                      <p className="text-[16px] font-black text-jz-ink">{act.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 bg-gradient-to-t from-jz-bg via-jz-bg to-transparent shrink-0">
        <div className="relative flex items-center bg-white rounded-jz-card border-2 border-jz-line shadow-lg focus-within:border-jz-teal transition-all">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about your trip..."
            className="w-full bg-transparent py-4 pl-5 pr-14 text-jz-body-big text-jz-ink placeholder-jz-soft/60 focus:outline-none min-h-jz-touch font-semibold"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="absolute right-2.5 w-11 h-11 bg-jz-teal text-white rounded-xl flex items-center justify-center disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
