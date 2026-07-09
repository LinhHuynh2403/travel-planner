import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, User as UserIcon, RefreshCw } from 'lucide-react';
import { apiFetch, friendlyErrorMessage } from '../utils/api';
import { getPreferredLanguage } from '../utils/language';
import { autoResizeTextarea } from '../utils/autoresize';
import { generateItinerary } from '../utils/generate-itinerary';
import { GeneratedItinerary, TravelPlan } from '../types/travel';
import { ChatText } from './chat-text';
import { useTranslation } from '../utils/translations';

type ChatMessage = { id: string; role: 'ai' | 'user'; text: string };

interface RescheduleTabProps {
  itinerary: GeneratedItinerary;
  onRescheduled: (newItinerary: GeneratedItinerary) => void;
}

function buildItineraryContext(itinerary: GeneratedItinerary): string {
  const region = itinerary.plan.region;
  const arrival = new Date(itinerary.plan.arrivalDate).toDateString();
  const leave = new Date(itinerary.plan.leaveDate).toDateString();
  const days = (itinerary.days || []).map(d => {
    const stops = d.activities.map(a => `${a.time} ${a.title} (${a.category})`).join('; ');
    return `Day ${d.dayNumber} (${new Date(d.date).toDateString()}): ${stops}`;
  }).join('\n');
  return `Destination: ${region}\nDates: ${arrival} to ${leave}\nBudget: ${itinerary.plan.budget || 'not specified'}\nTraveling: ${itinerary.plan.whoTraveling || 'not specified'}\n${days}`;
}

const STORAGE_KEY = 'rescheduleChatMessages';
const STORAGE_TRIP_KEY = 'rescheduleChatTripId';

export function RescheduleTab({ itinerary, onRescheduled }: RescheduleTabProps) {
  const { t } = useTranslation();
  const tripKey = itinerary.tripId || itinerary.plan.region;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Scoped per trip, same idea as the in-trip chat — a fresh trip (or a
    // reopened one after it ended) starts a clean reschedule conversation
    // instead of resuming an old one about a different plan.
    if (localStorage.getItem(STORAGE_TRIP_KEY) !== tripKey) return [];
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const hasBootstrapped = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_TRIP_KEY, tripKey);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // AI-generated opening line, same pattern as the onboarding chat — no
  // hardcoded greeting here either.
  useEffect(() => {
    if (messages.length > 0 || hasBootstrapped.current) return;
    hasBootstrapped.current = true;
    (async () => {
      setIsThinking(true);
      try {
        const resp = await apiFetch('/api/chat', {
          method: 'POST',
          body: JSON.stringify({
            messages: [],
            mode: 'reschedule',
            itineraryContext: buildItineraryContext(itinerary),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: getPreferredLanguage(),
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          setMessages([{ id: '1', role: 'ai', text: data.text }]);
        } else {
          setMessages([{ id: '1', role: 'ai', text: t('chat.rescheduleFallbackGreeting') }]);
        }
      } catch (e) {
        setMessages([{ id: '1', role: 'ai', text: t('chat.rescheduleFallbackGreeting') }]);
      } finally {
        setIsThinking(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runReschedule = async (chatHistory: ChatMessage[]) => {
    setIsRescheduling(true);
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: t('chat.reschedulingInProgress') }]);
    try {
      // Give the extraction step the ORIGINAL trip as a fallback baseline —
      // anything the traveler didn't explicitly change in this conversation
      // should carry over, not silently reset to some default.
      const contextMessage: ChatMessage = {
        id: 'context',
        role: 'user',
        text: `(For context: my current trip is ${itinerary.plan.region}, ${new Date(itinerary.plan.arrivalDate).toDateString()} to ${new Date(itinerary.plan.leaveDate).toDateString()}, budget ${itinerary.plan.budget || 'not specified'}, traveling ${itinerary.plan.whoTraveling || 'not specified'}. Everything below is what I want to change — anything I don't mention should stay the same as this.)`,
      };
      const seedPlan = { region: itinerary.plan.region, budget: itinerary.plan.budget, whoTraveling: itinerary.plan.whoTraveling } as TravelPlan;
      const generated = await generateItinerary(seedPlan, [contextMessage, ...chatHistory]);

      // Replace the same trip row instead of creating a duplicate.
      if (itinerary.tripId) {
        try { await apiFetch(`/api/trips/${itinerary.tripId}`, { method: 'DELETE' }); } catch (e) { console.warn('Failed to delete old trip during reschedule:', e); }
      }
      let newTripId: string | undefined;
      try {
        const saveResp = await apiFetch('/api/trips', {
          method: 'POST',
          body: JSON.stringify({
            region: generated.plan?.region || itinerary.plan.region,
            arrivalDate: generated.plan?.arrivalDate,
            leaveDate: generated.plan?.leaveDate,
            budget: generated.plan?.budget || itinerary.plan.budget || 'moderate',
            whoTraveling: generated.plan?.whoTraveling || itinerary.plan.whoTraveling || 'solo',
            itinerary: generated,
          }),
        });
        if (saveResp.ok) { newTripId = (await saveResp.json()).tripId; }
      } catch (e) { console.warn('Failed to save rescheduled trip:', e); }

      const finalItinerary: GeneratedItinerary = { ...generated, tripId: newTripId };
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TRIP_KEY);
      localStorage.removeItem('itineraryChatMessages');
      localStorage.removeItem('itineraryChatTripId');
      onRescheduled(finalItinerary);
    } catch (e) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: e instanceof Error && e.message ? e.message : t('chat.rescheduleError') }]);
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isRescheduling) return;
    setInputValue('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    const updated = [...messages, { id: Date.now().toString(), role: 'user' as const, text }];
    setMessages(updated);

    // The confirmation prompt shown to the traveler is translated per
    // language (see chat.rescheduleBanner), so the trigger word it tells
    // them to type must be recognized in every one of those languages too —
    // not just the English "ready".
    if (/ready|done|generate|good to go|sẵn sàng|xong|준비|완료|準備|完了|准备|好了|完成|listo|hecho|prêt|terminé/i.test(text)) {
      await runReschedule(updated);
      return;
    }

    setIsThinking(true);
    try {
      const resp = await apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: updated,
          text,
          mode: 'reschedule',
          itineraryContext: buildItineraryContext(itinerary),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: getPreferredLanguage(),
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: data.text }]);
      } else {
        const errorText = await friendlyErrorMessage(resp);
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: errorText }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: t('chat.errorConnect') }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar">
        <div className="bg-jz-tealTint border-[1.5px] border-jz-teal/30 rounded-jz-card p-4 flex items-start gap-2.5">
          <RefreshCw className="w-5 h-5 text-jz-teal shrink-0 mt-0.5" />
          <p className="text-jz-label text-jz-tealDark font-bold leading-relaxed">
            {t('chat.rescheduleBanner')}
          </p>
        </div>

        {messages.map(m => (
          <div key={m.id} className={`flex gap-3 items-start ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${m.role === 'ai' ? 'bg-jz-tealTint text-jz-teal border-jz-teal/20' : 'bg-jz-mist text-jz-ink border-jz-line'
              }`}>
              {m.role === 'ai' ? <Sparkles className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
            </div>
            <div className={`max-w-[85%] border-[1.5px] p-4 text-jz-body-big shadow-sm leading-relaxed ${m.role === 'ai'
              ? 'bg-jz-card border-jz-line rounded-[22px] rounded-bl-[6px] text-jz-ink'
              : 'bg-jz-teal border-jz-teal rounded-[22px] rounded-tr-[6px] text-white font-bold'
              }`}>
              <ChatText text={m.text} />
            </div>
          </div>
        ))}

        {(isThinking || isRescheduling) && (
          <div className="flex gap-3 items-start">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-jz-tealTint text-jz-teal border-jz-teal/20">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-jz-card border-[1.5px] border-jz-line rounded-[22px] rounded-bl-[6px] p-4 flex gap-1 items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-jz-teal animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-jz-teal animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-jz-teal animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-3 bg-gradient-to-t from-jz-bg via-jz-bg to-transparent shrink-0">
        <div className="relative flex items-end bg-jz-card rounded-jz-card border-2 border-jz-line shadow-lg focus-within:border-jz-teal transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); autoResizeTextarea(e.target); }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isRescheduling}
            placeholder={isRescheduling ? t('chat.reschedulingPlaceholder') : t('chat.rescheduleChangePlaceholder')}
            className="w-full bg-transparent py-4 pl-5 pr-20 text-jz-body-big text-jz-ink placeholder-jz-soft/60 focus:outline-none min-h-jz-touch max-h-[120px] resize-none overflow-y-auto font-semibold disabled:opacity-60"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isRescheduling}
            className="absolute right-2.5 bottom-2.5 w-11 h-11 bg-jz-teal text-white rounded-xl flex items-center justify-center disabled:opacity-40"
          >
            {isRescheduling ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
