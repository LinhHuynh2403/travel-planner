import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Map, MessageCircle, Sparkles, Send, User as UserIcon } from 'lucide-react';
import { TravelPlan } from '../types/travel';
import { generateItinerary } from '../utils/generate-itinerary';
import { supabase } from '../utils/supabaseClient';
import { apiFetch, friendlyErrorMessage } from '../utils/api';
import { ChatText } from '../components/chat-text';
type Message = {
  id: string;
  role: 'ai' | 'user';
  text: string;
  step?: 'chatting' | 'generating';
};

/* If the trip we were last chatting about has already ended, clear the
 * cached conversation so JourZy starts a fresh "plan a new trip" chat
 * instead of resuming a stale conversation about a completed trip. Must run
 * before the lazy useState initializers below read localStorage. */
function clearStaleTripSession() {
  const savedPlanRaw = localStorage.getItem('chatPlan');
  if (!savedPlanRaw) return;
  try {
    const savedPlan = JSON.parse(savedPlanRaw);
    if (savedPlan.leaveDate && new Date(savedPlan.leaveDate) < new Date()) {
      localStorage.removeItem('chatMessages');
      localStorage.removeItem('chatStep');
      localStorage.removeItem('chatPlan');
      localStorage.removeItem('travelPlan');
      localStorage.removeItem('generatedItinerary');
    }
  } catch (e) {
    // ignore malformed cached plan
  }
}

export default function Home() {
  const navigate = useNavigate();
  clearStaleTripSession();
  const [user, setUser] = useState<User | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [savedTrips, setSavedTrips] = useState<any[]>([]);
  const [loadingTripId, setLoadingTripId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('view') || 'chat';

  // Profile preferences states matching core prototype values
  const [travelPersonaArchetype, setTravelPersonaArchetype] = useState<string[]>([]);
  const [vibeSettings, setVibeSettings] = useState<string[]>([]);
  const [foodPreferences, setFoodPreferences] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  // Empty on a genuinely fresh visit — the bootstrap effect below fires the
  // very first message request so even JourZy's opening line is AI-generated,
  // not a hardcoded greeting.
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('chatMessages');
    return saved ? JSON.parse(saved) : [];
  });
  const hasBootstrapped = useRef(false);

  const [currentStep, setCurrentStep] = useState<'chatting' | 'generating'>('chatting');

  // No longer written to anywhere client-side — the backend's
  // extractPlanFromChatHistory derives region/dates/etc. straight from the
  // conversation transcript instead, same as it already does as a fallback.
  // Kept for backward-compat with any localStorage value from before this
  // change, and to preserve budget/whoTraveling if a future feature sets them.
  const [plan] = useState<Partial<TravelPlan>>(() => {
    const saved = localStorage.getItem('chatPlan');
    return saved ? JSON.parse(saved) : {};
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const tripsScrollRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Record<string, number>>({ chat: 0, trips: 0 });

  // Restore each view's own scroll position right after it mounts (Chat and
  // My Plan are separate DOM nodes, so switching between them always starts
  // a fresh div at scrollTop 0 unless we put it back ourselves).
  useLayoutEffect(() => {
    const ref = activeView === 'chat' ? chatScrollRef : tripsScrollRef;
    if (ref.current) {
      ref.current.scrollTop = scrollPositions.current[activeView] || 0;
    }
  }, [activeView]);

  useEffect(() => {
    const ensureSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { setUser(session.user); return; }
      const { data, error } = await supabase.auth.signInAnonymously();
      if (data?.session) { setUser(data.session.user); }
    };
    ensureSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) { setUser(session.user); }
      else if (event === 'SIGNED_OUT') {
        supabase.auth.signInAnonymously().then(({ data }) => {
          if (data?.session) setUser(data.session.user);
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user?.id) {
      const fetchTrips = async () => {
        try {
          const resp = await apiFetch(`/api/trips`);
          if (resp.ok) {
            const data = await resp.json();
            setSavedTrips(data.trips || []);
          }
        } catch (e) { console.error(e); }
      };
      fetchTrips();
    }
  }, [user]);

  // Clicking a saved trip previously just navigated to /itinerary, which
  // reads whatever itinerary happens to already be cached in localStorage —
  // so every trip in the list opened the same (usually most-recently-
  // generated) plan instead of the one actually clicked. Fetch that trip's
  // real saved itinerary first and load it into localStorage before navigating.
  const openTrip = async (trip: any) => {
    setLoadingTripId(trip.id);
    try {
      const resp = await apiFetch(`/api/trips/${trip.id}`);
      if (!resp.ok) throw new Error('Failed to load trip');
      const { trip: tripRow, itinerary } = await resp.json();
      const generated = {
        plan: {
          region: tripRow.region,
          arrivalDate: tripRow.arrival_date,
          leaveDate: tripRow.leave_date,
          budget: tripRow.budget,
          whoTraveling: tripRow.who_traveling,
          hobbies: [], favoriteFood: [], restaurantPreferences: [], placePreferences: [],
        },
        days: itinerary?.days || [],
        packingList: itinerary?.packing_list || undefined,
        hotelRecommendation: itinerary?.hotel_recommendation || undefined,
        insights: itinerary?.insights || undefined,
      };
      localStorage.setItem('generatedItinerary', JSON.stringify(generated));
      localStorage.setItem('travelPlan', JSON.stringify(generated.plan));
      localStorage.setItem('viewingPastTrip', JSON.stringify(new Date(tripRow.leave_date) < new Date()));
      // Each trip needs its own chat transcript — but only reset it when
      // switching to a genuinely different trip than whatever is cached,
      // otherwise reopening the SAME trip (e.g. tab away and back) would
      // wipe out a chat that's still in progress for it.
      if (localStorage.getItem('itineraryChatTripId') !== String(trip.id)) {
        localStorage.removeItem('itineraryChatMessages');
        localStorage.setItem('itineraryChatTripId', String(trip.id));
      }
      navigate('/itinerary');
    } catch (e) {
      console.error('Failed to open trip:', e);
    } finally {
      setLoadingTripId(null);
    }
  };

  const today = new Date();
  const upcomingTrips = savedTrips.filter(t => new Date(t.leave_date) >= today);
  const historyTrips = savedTrips.filter(t => new Date(t.leave_date) < today);

  useEffect(() => {
    if (user?.id) {
      const fetchProfile = async () => {
        try {
          const resp = await apiFetch(`/api/memory`);
          if (resp.ok) {
            const data = await resp.json();
            if (data?.memory?.preferences) {
              const prefs = data.memory.preferences;
              setTravelPersonaArchetype(prefs.travelPersonaArchetype || []);
              setVibeSettings(prefs.vibeSettings || []);
              setFoodPreferences(prefs.foodPreferences || []);
            }
          }
        } catch (e) { console.error(e); }
      };
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
    localStorage.setItem('chatStep', JSON.stringify(currentStep));
    localStorage.setItem('chatPlan', JSON.stringify(plan));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStep, plan]);

  // Even JourZy's opening line is AI-generated now — no hardcoded greeting.
  // On a genuinely fresh session (nothing in localStorage), ask the backend
  // for the first message instead of scripting one client-side.
  useEffect(() => {
    if (messages.length > 0 || hasBootstrapped.current) return;
    hasBootstrapped.current = true;
    (async () => {
      setIsThinking(true);
      try {
        const response = await apiFetch('/api/chat', {
          method: 'POST',
          body: JSON.stringify({ messages: [], timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: navigator.language }),
        });
        if (response.ok) {
          const data = await response.json();
          setMessages([{ id: '1', role: 'ai', text: data.text }]);
        } else {
          setMessages([{ id: '1', role: 'ai', text: "Hey, I'm JourZy! ✈️ Where are you dreaming of going?" }]);
        }
      } catch (e) {
        setMessages([{ id: '1', role: 'ai', text: "Hey, I'm JourZy! ✈️ Where are you dreaming of going?" }]);
      } finally {
        setIsThinking(false);
      }
    })();
  }, []);

  const handleGenerateItinerary = async (customMessages?: Message[]) => {
    setCurrentStep('generating');
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'ai', text: "Perfect! Let me craft your personalized itinerary — checking real places, ratings, and weather. This can take a moment... 🪄", step: 'generating' }
    ]);
    const finalPlan = { ...plan, hobbies: [], favoriteFood: [], restaurantPreferences: [], placePreferences: [] } as TravelPlan;
    try {
      const generated = await generateItinerary(finalPlan, customMessages || messages);
      localStorage.setItem('travelPlan', JSON.stringify(finalPlan));
      localStorage.setItem('generatedItinerary', JSON.stringify(generated));

      // Save immediately so it shows up in My Plan / trip history even if the
      // user never comes back before the trip ends.
      if (user?.id) {
        try {
          // Use the itinerary's own resolved plan (dates were extracted
          // server-side from the chat transcript), not finalPlan — the
          // traveler's client-side plan never carried real dates.
          await apiFetch('/api/trips', {
            method: 'POST',
            body: JSON.stringify({
              region: generated.plan?.region || finalPlan.region,
              arrivalDate: generated.plan?.arrivalDate,
              leaveDate: generated.plan?.leaveDate,
              budget: finalPlan.budget || 'moderate',
              whoTraveling: finalPlan.whoTraveling || 'solo',
              itinerary: generated
            })
          });
        } catch (saveErr) {
          console.warn('Failed to save trip to history:', saveErr);
        }
      }

      setCurrentStep('chatting');
      navigate('/itinerary');
    } catch (e) {
      setCurrentStep('chatting');
      // generateItinerary() already throws with the backend's actual error
      // text (e.g. a rate-limit message) when available — show that instead
      // of a generic "make sure the backend is running" guess.
      const errorText = e instanceof Error && e.message ? e.message : "Sorry, I ran into a problem building your itinerary. Try typing \"ready\" again.";
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'ai', text: errorText, step: 'chatting' }
      ]);
    }
  };

  const handleChattingInput = async (text: string) => {
    const isReady = /ready|done|generate|good to go/i.test(text);
    const userMessage: Message = { id: Date.now().toString(), role: 'user', text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    if (isReady) { await handleGenerateItinerary(updatedMessages); return; }
    setIsThinking(true);
    try {
      const response = await apiFetch(`/api/chat`, {
        method: "POST",
        body: JSON.stringify({ messages: updatedMessages, text, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: navigator.language }),
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: data.text, step: 'chatting' }]);
      } else {
        const errorText = await friendlyErrorMessage(response);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: errorText, step: 'chatting' }]);
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: "Sorry, I couldn't connect just now — try again in a moment.", step: 'chatting' }]);
    } finally { setIsThinking(false); }
  };

  const submitInput = (text: string) => {
    handleChattingInput(text);
  };

  return (
    <div className="min-h-screen bg-[#EFE9DF] text-jz-ink flex items-center justify-center sm:p-4 selection:bg-jz-tealTint">
      <div className="relative w-full max-w-[430px] h-[100dvh] sm:h-[min(920px,94vh)] bg-jz-bg sm:rounded-[36px] overflow-hidden sm:border-[10px] sm:border-jz-ink sm:shadow-2xl flex flex-col">
        
        {/* Onboarding Identity Bar */}
        <header className="flex items-center gap-3 px-4 py-3.5 bg-white border-b-[1.5px] border-jz-line shrink-0">
          <div className="w-11 h-11 rounded-2xl bg-jz-teal flex items-center justify-center shrink-0 shadow-inner">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-jz-title tracking-tight leading-tight text-jz-ink">With JourZy</p>
            <p className="text-jz-teal text-xs font-black tracking-wide uppercase">Your travel companion</p>
          </div>
        </header>

        {/* Dynamic Parameter Memory Chips */}
        {activeView === 'chat' && (travelPersonaArchetype.length + vibeSettings.length + foodPreferences.length) > 0 && (
          <div className="flex gap-2 items-center overflow-x-auto px-4 py-2.5 bg-white border-b-[1.5px] border-jz-line shrink-0 no-scrollbar">
            <span className="text-xs font-extrabold text-jz-soft whitespace-nowrap">💛 JourZy remembers:</span>
            {[...travelPersonaArchetype, ...vibeSettings, ...foodPreferences].map(memory => (
              <span key={memory} className="jz-chip whitespace-nowrap">{memory}</span>
            ))}
          </div>
        )}

        <main className="flex-1 flex flex-col relative overflow-hidden">
          {activeView === 'chat' ? (
            <>
              {/* Interaction Streams */}
              <div
                ref={chatScrollRef}
                onScroll={(e) => { scrollPositions.current.chat = e.currentTarget.scrollTop; }}
                className="flex-1 overflow-y-auto p-4 space-y-6 pb-28 no-scrollbar"
              >
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      msg.role === 'ai' ? 'bg-jz-tealTint text-jz-teal border-jz-teal/20' : 'bg-jz-mist text-jz-ink border-jz-line'
                    }`}>
                      {msg.role === 'ai' ? <Sparkles className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                    </div>

                    <div className={`relative max-w-[85%] border-[1.5px] p-[16px] text-jz-body-big shadow-sm transition-all ${
                      msg.role === 'ai'
                        ? 'bg-white border-jz-line rounded-[22px] rounded-bl-[6px] text-jz-ink'
                        : 'bg-white border-jz-teal text-jz-teal rounded-[22px] rounded-tr-[6px] font-bold'
                    }`}>
                      <div className="leading-relaxed"><ChatText text={msg.text} /></div>
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex gap-3 items-start">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-jz-tealTint text-jz-teal border-jz-teal/20">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="bg-white border-[1.5px] border-jz-line rounded-[22px] rounded-tl-[6px] p-4 flex items-center gap-1">
                      <span className="text-jz-label font-bold text-jz-soft">typing</span>
                      <div className="flex gap-1 items-center pt-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-jz-teal animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-jz-teal animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-jz-teal animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Secure Input Docking System */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-jz-bg via-jz-bg to-transparent">
                <div className="relative flex items-center bg-white rounded-jz-card border-2 border-jz-line shadow-lg focus-within:border-jz-teal transition-all">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inputValue.trim() && currentStep !== 'generating') {
                        submitInput(inputValue.trim());
                        setInputValue('');
                      }
                    }}
                    disabled={currentStep === 'generating'}
                    placeholder={currentStep === 'generating' ? "JourZy is building your itinerary..." : "Ask anything about your trip..."}
                    className="w-full bg-transparent py-4 pl-5 pr-20 text-jz-body-big text-jz-ink placeholder-jz-soft/60 focus:outline-none min-h-jz-touch font-semibold disabled:opacity-60"
                  />
                  <button
                    onClick={() => { if (inputValue.trim() && currentStep !== 'generating') { submitInput(inputValue.trim()); setInputValue(''); } }}
                    disabled={currentStep === 'generating'}
                    className="absolute right-2.5 w-11 h-11 bg-jz-teal text-white rounded-xl flex items-center justify-center hover:bg-jz-tealDark transition-all disabled:opacity-50"
                  >
                    {currentStep === 'generating' ? (
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div
              ref={tripsScrollRef}
              onScroll={(e) => { scrollPositions.current.trips = e.currentTarget.scrollTop; }}
              className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar"
            >
              <h2 className="text-jz-screen font-black text-jz-ink tracking-tight">My Plan</h2>
              {savedTrips.length === 0 ? (
                <p className="text-jz-soft font-bold text-jz-body bg-white p-5 rounded-jz-card border border-jz-line text-center">No saved trips yet — plan one in Chat! ✈️</p>
              ) : (
                <>
                  {upcomingTrips.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-extrabold text-jz-soft uppercase tracking-wide">Upcoming</p>
                      {upcomingTrips.map((trip: any) => (
                        <button
                          key={trip.id}
                          onClick={() => openTrip(trip)}
                          disabled={loadingTripId === trip.id}
                          className="w-full text-left bg-white border-[1.5px] border-jz-line rounded-jz-card p-5 hover:border-jz-teal transition-all shadow-sm disabled:opacity-60"
                        >
                          <p className="font-black text-jz-title text-jz-ink capitalize">{trip.region}</p>
                          <p className="text-jz-label font-extrabold text-jz-soft mt-1">
                            {loadingTripId === trip.id ? 'Loading…' : `${new Date(trip.arrival_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(trip.leave_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — click to launch`}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {historyTrips.length > 0 && (
                    <div className="space-y-3 !mt-6">
                      <p className="text-xs font-extrabold text-jz-soft uppercase tracking-wide">History</p>
                      {historyTrips.map((trip: any) => (
                        <button
                          key={trip.id}
                          onClick={() => openTrip(trip)}
                          disabled={loadingTripId === trip.id}
                          className="w-full text-left bg-white border-[1.5px] border-jz-line rounded-jz-card p-5 hover:border-jz-teal transition-all shadow-sm opacity-80 disabled:opacity-60"
                        >
                          <p className="font-black text-jz-title text-jz-ink capitalize">{trip.region}</p>
                          <p className="text-jz-label font-extrabold text-jz-soft mt-1">
                            {loadingTripId === trip.id ? 'Loading…' : `${new Date(trip.arrival_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(trip.leave_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — trip ended`}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>

        {/* Global Bottom Navigation Shell Targets */}
        <nav className="flex border-t-[1.5px] border-jz-line bg-white px-1 pt-1.5 pb-3 shrink-0 z-10">
          {[
            { id: 'chat', label: 'Chat', icon: MessageCircle },
            { id: 'trips', label: 'My Plan', icon: Map },
          ].map(t => {
            const active = activeView === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setSearchParams({ view: t.id })}
                className="flex-1 min-h-[58px] flex flex-col items-center justify-center gap-0.5"
              >
                <span className={`w-12 h-8 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-jz-tealTint' : ''}`}>
                  <Icon className="w-[26px] h-[26px]" color={active ? '#0F6E64' : '#5C6B74'} strokeWidth={active ? 2.6 : 2} />
                </span>
                <span className={`text-xs font-black tracking-tight ${active ? 'text-jz-teal' : 'text-jz-soft'}`}>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}