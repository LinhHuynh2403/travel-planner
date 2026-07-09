import { useState, useRef, useEffect } from "react";
import { X, Send, Star, RefreshCw } from "lucide-react";
import { C } from "./jourzy-theme";
import { Seal } from "./jourzy-seal";
import { apiFetch, friendlyErrorMessage } from "../../utils/api";
import { useTranslation } from "../../utils/translations";
import { getPreferredLanguage } from "../../utils/language";
import { FlightPicksCard, type FlightSuggestion } from "./flight-picks-card";

type PlaceSuggestion = { placeId?: string; title: string; address: string; rating?: number; mapsUrl?: string; why?: string; travelTimeFromPlan?: string };
type Msg = { role: "user" | "ai"; text: string; suggestion?: PlaceSuggestion; flightSuggestion?: FlightSuggestion; used?: boolean };

export default function CompanionSheet({ tripId, isPast, tripData, close, onReplaceActivity }: {
  tripId: string; isPast: boolean; tripData?: any; close: () => void;
  onReplaceActivity?: (dayNumber: number, activityIdx: number, newData: { title: string; location: string; description: string; place: any }) => void;
}) {
  const { t } = useTranslation();
  const endRef = useRef<HTMLDivElement>(null);
  const hasBootstrapped = useRef(false);
  const [messages, setMessages] = useState<Msg[]>(() => {
    const saved = localStorage.getItem(`itineraryChat_${tripId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [picker, setPicker] = useState<{ suggestion: PlaceSuggestion; msgIdx: number } | null>(null);

  useEffect(() => {
    localStorage.setItem(`itineraryChat_${tripId}`, JSON.stringify(messages));
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, tripId]);

  useEffect(() => {
    if (messages.length > 0 || hasBootstrapped.current) return;
    hasBootstrapped.current = true;
    (async () => {
      setIsThinking(true);
      try {
        const response = await apiFetch('/api/chat', {
          method: 'POST',
          body: JSON.stringify({
            messages: [],
            mode: isPast ? "pastTrip" : "itinerary",
            itineraryContext: tripData ? JSON.stringify(tripData) : "",
            region: tripData?.plan?.region,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: getPreferredLanguage()
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setMessages([{ role: 'ai', text: data.text }]);
        } else {
          const fallback = isPast ? t("chat.pastTripGreeting").replace("{{city}}", tripData?.plan?.region || "") : t("chat.itineraryGreeting").replace("{{city}}", tripData?.plan?.region || "");
          setMessages([{ role: 'ai', text: fallback }]);
        }
      } catch (e) {
        const fallback = isPast ? t("chat.pastTripGreeting").replace("{{city}}", tripData?.plan?.region || "") : t("chat.itineraryGreeting").replace("{{city}}", tripData?.plan?.region || "");
        setMessages([{ role: 'ai', text: fallback }]);
      } finally {
        setIsThinking(false);
      }
    })();
  }, []);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const updated: Msg[] = [...messages, { role: 'user', text }];
    setMessages(updated);
    setInputValue("");
    setIsThinking(true);

    try {
      const resp = await apiFetch(`/api/chat`, {
        method: 'POST',
        body: JSON.stringify({
          tripId,
          messages: updated,
          text,
          mode: isPast ? "pastTrip" : "itinerary",
          itineraryContext: tripData ? JSON.stringify(tripData) : "",
          region: tripData?.plan?.region,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: getPreferredLanguage()
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        setMessages([...updated, { role: 'ai', text: data.text, suggestion: data.suggestion || undefined, flightSuggestion: data.flightSuggestion || undefined }]);
      } else {
        const err = await friendlyErrorMessage(resp);
        setMessages([...updated, { role: 'ai', text: err }]);
      }
    } catch (e) {
      setMessages([...updated, { role: 'ai', text: t("chat.errorConnect") }]);
    } finally {
      setIsThinking(false);
    }
  };

  const confirmSwap = (dayNumber: number, activityIdx: number) => {
    if (!picker || !onReplaceActivity) return;
    const s = picker.suggestion;
    onReplaceActivity(dayNumber, activityIdx, {
      title: s.title,
      location: s.address,
      description: t('chat.swappedDescription').replace('{{title}}', s.title).replace('{{address}}', s.address),
      place: { placeId: s.placeId, address: s.address, rating: s.rating, mapsUrl: s.mapsUrl },
    });
    setMessages(prev => prev.map((m, i) => i === picker.msgIdx ? { ...m, used: true } : m));
    setMessages(prev => [...prev, { role: 'ai', text: t('chat.swappedIn') }]);
    setPicker(null);
  };

  const tone = isPast ? C.ink : C.green;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(20,25,40,0.45)" }} onClick={close}>
      <div className="rounded-t-3xl flex flex-col" style={{ background: C.paper, height: "72%" }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-5 pt-4 pb-2">
          <div>
            <div className="font-bold text-sm" style={{ color: C.ink }}>{isPast ? "Looking back" : "Trip companion"}</div>
            <div className="text-xs" style={{ color: C.sub }}>
              {isPast ? "Past-trip chat is for memories" : "This chat lives with your trip"}
            </div>
          </div>
          <button onClick={close}><X size={18} style={{ color: C.sub }} /></button>
        </div>

        <div className="flex-1 overflow-y-auto jz-scroll px-4 space-y-3 py-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-xs px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line"
                style={m.role === "user"
                  ? { background: tone, color: "#fff", borderRadius: "18px 18px 4px 18px" }
                  : { background: C.card, color: C.ink, borderRadius: "18px 18px 18px 4px", border: `1px solid ${C.line}` }}>
                {m.text}
                {m.suggestion && !m.used && (
                  <div className="mt-2.5 rounded-xl p-3" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{m.suggestion.title}</div>
                        <div className="text-xs mt-0.5" style={{ color: C.sub }}>
                          {m.suggestion.rating && <><Star size={10} className="inline mr-0.5" fill="#FFC94D" color="#FFC94D" />{m.suggestion.rating.toFixed(1)} · </>}
                          {m.suggestion.address}
                        </div>
                      </div>
                      <Seal small show={!!m.suggestion.placeId} />
                    </div>
                    {m.suggestion.why && (
                      <div className="text-xs mt-1.5 leading-relaxed" style={{ color: C.ink }}>{m.suggestion.why}</div>
                    )}
                    {m.suggestion.travelTimeFromPlan && (
                      <div className="text-xs mt-1" style={{ color: C.green }}>{m.suggestion.travelTimeFromPlan} from your plan</div>
                    )}
                    <button onClick={() => setPicker({ suggestion: m.suggestion!, msgIdx: i })}
                      className="mt-2 w-full py-2 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1"
                      style={{ background: tone }}>
                      <RefreshCw size={11} /> Swap it into your plan
                    </button>
                  </div>
                )}
                {m.flightSuggestion && <FlightPicksCard suggestion={m.flightSuggestion} />}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
              <div className="max-w-xs px-4 py-2.5 text-sm leading-relaxed" style={{ background: C.card, color: C.sub, borderRadius: "18px 18px 18px 4px", border: `1px solid ${C.line}` }}>
                {t("brand.typing")}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {isPast && messages.length === 1 && !isThinking ? (
          <div className="p-4 space-y-2 pb-6" style={{ background: "#FFFFFF", borderTop: `1px solid ${C.line}` }}>
            <button onClick={() => send("Amazing — I miss them already")} className="w-full text-left px-4 py-3 rounded-2xl text-sm font-medium flex justify-between items-center transition-colors" style={{ border: `1.5px solid ${C.ink}`, color: C.ink }}>
              Amazing — I miss them already <Send size={16} />
            </button>
            <button onClick={() => send("Plan me something similar!")} className="w-full text-left px-4 py-3 rounded-2xl text-sm font-medium flex justify-between items-center transition-colors" style={{ border: `1.5px solid ${C.ink}`, color: C.ink }}>
              Plan me something similar! <Send size={16} />
            </button>
          </div>
        ) : (
          <div className="p-3 pb-6" style={{ background: "#FFFFFF", borderTop: `1px solid ${C.line}` }}>
            <div className="relative flex items-end shadow-sm rounded-2xl border border-[#E4E6E0] bg-white focus-within:border-[#0E7A5F] transition-colors">
              <textarea
                rows={1}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(inputValue);
                    e.currentTarget.style.height = 'auto';
                  }
                }}
                disabled={isThinking}
                placeholder={t("chat.placeholder")}
                className="w-full bg-transparent py-3 pl-4 pr-12 text-sm text-[#1B2333] placeholder-[#6B7280] focus:outline-none min-h-[44px] max-h-[100px] resize-none overflow-y-auto disabled:opacity-60 companion-textarea"
              />
              <button
                onClick={() => {
                  send(inputValue);
                  const ta = document.querySelector('.companion-textarea') as HTMLTextAreaElement;
                  if (ta) ta.style.height = 'auto';
                }}
                disabled={isThinking || !inputValue.trim()}
                className="absolute right-1.5 bottom-1.5 w-8 h-8 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                style={{ background: tone }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {picker && (
        <div className="fixed inset-0 z-[60] flex items-end" style={{ background: "rgba(20,25,40,0.5)" }} onClick={() => setPicker(null)}>
          <div className="w-full bg-white rounded-t-3xl p-4 max-h-[70%] overflow-y-auto jz-scroll" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-bold" style={{ color: C.ink }}>Which stop should this replace?</p>
              <button onClick={() => setPicker(null)}><X size={18} style={{ color: C.sub }} /></button>
            </div>
            {(tripData?.days || []).map((day: any) => (
              <div key={day.dayNumber} className="mb-3">
                <p className="text-xs font-extrabold uppercase tracking-wide mb-1.5" style={{ color: C.sub }}>Day {day.dayNumber}</p>
                <div className="space-y-2">
                  {day.activities.map((act: any, idx: number) => (
                    <button key={idx} onClick={() => confirmSwap(day.dayNumber, idx)}
                      className="w-full text-left rounded-2xl p-3 transition-all"
                      style={{ background: C.paper, border: `1px solid ${C.line}` }}>
                      <span className="text-xs font-extrabold uppercase" style={{ color: C.amber }}>{act.category}</span>
                      <p className="text-sm font-bold" style={{ color: C.ink }}>{act.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
