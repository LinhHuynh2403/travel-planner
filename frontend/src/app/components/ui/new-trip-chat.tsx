import { useState, useRef, useEffect } from "react";
import { Send, RefreshCw, Bookmark, Sparkles, Square } from "lucide-react";
import { C, display } from "./jourzy-theme";
import { apiFetch, friendlyErrorMessage } from "../../utils/api";
import { getPreferredLanguage } from "../../utils/language";
import { useTranslation } from "../../utils/translations";
import { generateItinerary } from "../../utils/generate-itinerary";
import { FlightPicksCard, type FlightSuggestion } from "./flight-picks-card";

type Message = {
  id: string;
  role: 'ai' | 'user';
  text: string;
  step?: 'chatting' | 'generating';
  flightSuggestion?: FlightSuggestion;
};

export default function NewTripChat({ goTrips }: { goTrips: () => void }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('chatMessages');
    return saved ? JSON.parse(saved) : [];
  });
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  // NEVER restore 'generating' from a previous session — there's no fetch
  // left to resume or abort after a reload (the request died with the old
  // page), so doing so left the UI permanently stuck: the stop button's
  // abortRef starts null (nothing in flight to cancel) and send() still
  // saw 'generating' and silently refused to do anything at all. Only
  // 'chatting' is ever a valid state to wake up into.
  const [currentStep, setCurrentStep] = useState<'chatting' | 'generating'>('chatting');
  const [built, setBuilt] = useState(false);
  const hasBootstrapped = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
    localStorage.setItem('chatStep', JSON.stringify(currentStep));
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStep]);

  // The textarea is disabled while a reply is in flight (see disabled=
  // {isThinking} below), and disabling a focused element makes the browser
  // drop focus entirely — re-enabling it afterward does NOT restore focus on
  // its own, which is why the traveler had to click back into the box for
  // every single message. Refocus it the moment thinking finishes.
  useEffect(() => {
    if (!isThinking) textareaRef.current?.focus();
  }, [isThinking]);

  useEffect(() => {
    if (messages.length > 0 || hasBootstrapped.current) return;
    hasBootstrapped.current = true;
    (async () => {
      setIsThinking(true);
      try {
        const response = await apiFetch('/api/chat', {
          method: 'POST',
          body: JSON.stringify({ messages: [], timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: getPreferredLanguage() }),
        });
        if (response.ok) {
          const data = await response.json();
          setMessages([{ id: '1', role: 'ai', text: data.text }]);
        } else {
          setMessages([{ id: '1', role: 'ai', text: t("chat.greeting") }]);
        }
      } catch (e) {
        setMessages([{ id: '1', role: 'ai', text: t("chat.greeting") }]);
      } finally {
        setIsThinking(false);
      }
    })();
  }, []);

  const handleGenerate = async (customMessages: Message[]) => {
    setCurrentStep('generating');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const plan = JSON.parse(localStorage.getItem('chatPlan') || '{}');
      const generated = await generateItinerary(plan, customMessages, controller.signal);

      let tripSaveFailed = false;
      try {
        const saveResp = await apiFetch('/api/trips', {
          method: 'POST',
          body: JSON.stringify({
            region: generated.plan?.region || plan.region,
            arrivalDate: generated.plan?.arrivalDate,
            leaveDate: generated.plan?.leaveDate,
            budget: plan.budget || 'moderate',
            whoTraveling: plan.whoTraveling || 'solo',
            itinerary: generated
          })
        });
        if (saveResp.ok) {
          const { tripId } = await saveResp.json();
          generated.tripId = tripId;
        } else if (saveResp.status !== 401) {
          // 401 just means a guest/logged-out session — saving to My Trips
          // was never going to happen, that's expected, not a bug. Any other
          // failure (validation, a 500) means the save genuinely broke, and
          // silently swallowing it (as this used to do) is exactly what
          // produced a real "ghost" trip stuck showing "No itinerary data"
          // with no way for the traveler to know why — surface it instead.
          console.error('Trip save failed:', await saveResp.json().catch(() => ({})));
          tripSaveFailed = true;
        }
      } catch (e) {
        console.error('Trip save request failed:', e);
        tripSaveFailed = true;
      }

      localStorage.setItem('generatedItinerary', JSON.stringify(generated));
      localStorage.setItem('travelPlan', JSON.stringify(generated.plan));
      localStorage.removeItem('itineraryChatMessages');
      if (generated.tripId) localStorage.setItem('itineraryChatTripId', String(generated.tripId));

      setCurrentStep('chatting');
      setBuilt(true);
      if (tripSaveFailed) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: t("chat.tripSaveFailed") }]);
      }
      // Wait a moment then go to trips or let the user click it? The prototype has a button.
    } catch (e) {
      setCurrentStep('chatting');
      // The traveler hit "stop" themselves (e.g. to add more detail before
      // generating) — that's an intentional cancel, not a failure, so don't
      // show an error message for it.
      if (e instanceof DOMException && e.name === 'AbortError') return;
      const errorText = e instanceof Error && e.message ? e.message : t("chat.errorBuild");
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: errorText }]);
    } finally {
      abortRef.current = null;
    }
  };

  const stopGenerating = () => {
    abortRef.current?.abort();
  };

  const send = async (text: string) => {
    if (!text.trim() || currentStep === 'generating') return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputValue("");

    setIsThinking(true);
    try {
      const response = await apiFetch(`/api/chat`, {
        method: "POST",
        body: JSON.stringify({ messages: updated, text, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: getPreferredLanguage() }),
      });
      if (response.ok) {
        const data = await response.json();
        const nextMsgs = [...updated, { id: Date.now().toString(), role: 'ai', text: data.text, flightSuggestion: data.flightSuggestion || undefined } as Message];
        setMessages(nextMsgs);
        if (data.isReady) {
          await handleGenerate(nextMsgs);
        }
      } else {
        const err = await friendlyErrorMessage(response);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: err }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: t("chat.errorConnect") }]);
    } finally {
      setIsThinking(false);
    }
  };

  const startNewPlan = () => {
    localStorage.removeItem('chatMessages');
    localStorage.removeItem('chatStep');
    localStorage.removeItem('chatPlan');
    setBuilt(false);
    setMessages([]);
    hasBootstrapped.current = false;
    // Window reload to easily bootstrap a fresh chat (the useEffect will trigger)
    window.location.reload();
  };

  return (
    <div className="flex flex-col min-h-full px-4 pt-2">
      <div className="sticky top-0 z-10 text-center mb-3 pt-2 pb-2" style={{ background: C.paper }}>
        <div style={{ ...display, fontSize: 26, color: C.ink }}>JourZy</div>
        <div className="text-xs" style={{ color: C.sub }}>{t("brand.companion")}</div>
      </div>

      <div className="flex-1 space-y-3 pb-28">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line break-words"
              style={m.role === "user"
                ? { background: C.green, color: "#fff", borderRadius: "18px 18px 4px 18px" }
                : { background: C.card, color: C.ink, borderRadius: "18px 18px 18px 4px", border: `1px solid ${C.line}` }}>
              {m.text.split("**").map((tPart, j) => j % 2 ? <b key={j}>{tPart}</b> : tPart)}
              {m.flightSuggestion && <FlightPicksCard suggestion={m.flightSuggestion} />}
            </div>
          </div>
        ))}

        {isThinking && currentStep !== 'generating' && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-[18px] rounded-tl-[4px] text-sm flex items-center gap-2" style={{ background: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
              <Sparkles size={14} className="animate-pulse" style={{ color: C.green }} />
              {t("brand.typing")}
            </div>
          </div>
        )}

        {currentStep === 'generating' && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-[18px] rounded-tl-[4px] text-sm flex items-center gap-2" style={{ background: C.card, border: `1px solid ${C.line}`, color: C.sub }}>
              <RefreshCw size={14} className="animate-spin" style={{ color: C.green }} />
              {t("chat.building")}
            </div>
          </div>
        )}

        {built && (
          <div className="space-y-2 pt-4">
            <button onClick={goTrips} className="w-full px-4 py-2.5 rounded-2xl text-sm font-medium text-white flex items-center justify-center gap-2" style={{ background: C.green }}>
              <Bookmark size={14} /> {t("chat.tripSavedOpen")}
            </button>
            <button onClick={startNewPlan} className="w-full px-4 py-2.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: C.card, border: `1.5px solid ${C.green}`, color: C.green }}>
              <Sparkles size={14} /> {t("chat.planAnotherTrip")}
            </button>
          </div>
        )}
        <div ref={endRef} className="h-24" />
      </div>

      {!built && (
        <div className="sticky bottom-0 w-full pt-10 pb-4 z-10" style={{ background: "linear-gradient(to top, #F5F6F2 80%, transparent)" }}>
          <div className="relative flex items-center w-full text-left rounded-2xl text-sm font-medium transition-colors"
            style={{ background: "#FFFFFF", border: `1.5px solid ${C.green}`, color: C.green }}>
            <textarea
              ref={textareaRef}
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
              placeholder={currentStep === 'generating' ? t("chat.addMoreWhileBuilding") : t("chat.placeholder")}
              className="w-full bg-transparent py-3 pl-4 pr-12 focus:outline-none min-h-[44px] max-h-[100px] resize-none overflow-y-auto disabled:opacity-60 placeholder:opacity-60"
              style={{ color: C.green }}
            />
            <button
              onClick={() => {
                if (currentStep === 'generating') {
                  stopGenerating();
                  return;
                }
                send(inputValue);
                if (document.querySelector('textarea')) (document.querySelector('textarea') as any).style.height = 'auto';
              }}
              disabled={currentStep !== 'generating' && (isThinking || !inputValue.trim())}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full p-2 transition-all hover:bg-black/5 active:scale-90 disabled:opacity-50 disabled:hover:bg-transparent disabled:active:scale-100"
              style={{ color: currentStep === 'generating' ? C.hanko : C.green }}
              title={currentStep === 'generating' ? t("chat.stopGenerating") : undefined}
            >
              {currentStep === 'generating' ? <Square size={16} fill={C.hanko} /> : <Send size={18} strokeWidth={2} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
