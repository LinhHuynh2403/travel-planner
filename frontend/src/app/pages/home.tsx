import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Calendar, Map, Plane, MessageSquare, Briefcase, CloudSun, Sparkles, Send, MoreHorizontal, User as UserIcon } from 'lucide-react';
import { TravelPlan } from '../types/travel';
import { generateItinerary } from '../utils/generate-itinerary';
import { FlightsTab } from '../components/flights-tab';
import { supabase } from '../utils/supabaseClient';
import { User } from '@supabase/supabase-js';

type Message = {
  id: string;
  role: 'ai' | 'user';
  text: string;
  step?: 'persona' | 'destination' | 'dates' | 'chatting' | 'generating';
};

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const isDemoMode = localStorage.getItem('isDemoMode') === 'true';
      if (isDemoMode) {
        setUser({ id: 'demo-user-12345', email: 'demo@jourzy.com' } as any);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
        if (session.user.id) {
          localStorage.setItem('userId', session.user.id);
        }
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const isDemoMode = localStorage.getItem('isDemoMode') === 'true';
      if (isDemoMode) return;

      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
        if (session.user.id) {
          localStorage.setItem('userId', session.user.id);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const [inputValue, setInputValue] = useState('');
  const [savedTrips, setSavedTrips] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      const fetchTrips = async () => {
        try {
          const API_BASE = import.meta.env.VITE_API_URL || "";
          const resp = await fetch(`${API_BASE}/api/trips?userId=${user.id}`);
          if (resp.ok) {
            const data = await resp.json();
            setSavedTrips(data.trips || []);
          }
        } catch (e) {
          console.error("Failed to load saved trips:", e);
        }
      };
      fetchTrips();
    }
  }, [user]);

  const handleLoadSavedTrip = async (tripId: string) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const resp = await fetch(`${API_BASE}/api/trips/${tripId}`);
      if (resp.ok) {
        const { trip, itinerary } = await resp.json();
        const loadedPlan: TravelPlan = {
          region: trip.region,
          arrivalDate: new Date(trip.arrival_date),
          leaveDate: new Date(trip.leave_date),
          budget: trip.budget || "moderate",
          whoTraveling: trip.who_traveling || "solo",
          hobbies: [],
          favoriteFood: [],
          restaurantPreferences: [],
          placePreferences: []
        };
        const loadedItinerary = {
          plan: loadedPlan,
          hotelRecommendation: itinerary.hotel_recommendation,
          days: itinerary.days,
          packingList: itinerary.packing_list,
          insights: itinerary.insights
        };

        sessionStorage.setItem('travelPlan', JSON.stringify(loadedPlan));
        sessionStorage.setItem('generatedItinerary', JSON.stringify(loadedItinerary));
        navigate('/itinerary');
      }
    } catch (e) {
      console.error("Failed to load saved trip details:", e);
    }
  };

  const [activeView, setActiveView] = useState<'chat' | 'flights'>('chat');
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = sessionStorage.getItem('chatMessages');
    return saved ? JSON.parse(saved) : [
      {
        id: '1',
        role: 'ai',
        text: "Hi! I'm JourZy, your AI travel assistant! I want to plan the perfect trip tailored exactly to your vibe. 🌍\n\nBefore we pick a location, tell me a bit about your travel persona! (e.g. Are you an adventurous hiker, a luxury foodie, a budget backpacker, or a museum lover?)",
        step: 'welcome'
      }
    ];
  });

  const [currentStep, setCurrentStep] = useState<'persona' | 'destination' | 'dates' | 'chatting' | 'generating'>(() => {
    const saved = sessionStorage.getItem('chatStep');
    const step = saved ? JSON.parse(saved) : 'chatting';
    // If they navigated back after generating, reset to chatting so the input box works
    return step === 'generating' ? 'chatting' : step;
  });

  const [plan, setPlan] = useState<Partial<TravelPlan>>(() => {
    const saved = sessionStorage.getItem('chatPlan');
    return saved ? JSON.parse(saved) : {};
  });

  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('chatMessages', JSON.stringify(messages));
    sessionStorage.setItem('chatStep', JSON.stringify(currentStep));
    sessionStorage.setItem('chatPlan', JSON.stringify(plan));
  }, [messages, currentStep, plan]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handlePersonaSelect = (personaText: string) => {
    // Save persona to hobbies so it gets explicitly passed into the generation prompt
    setPlan({ ...plan, hobbies: [personaText] });
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'user', text: personaText },
      { id: (Date.now() + 1).toString(), role: 'ai', text: `Got it! I've noted your travel style and preferences. 📝\n\nNow, where would you like to go? (e.g., "Paris, France" or "Tokyo, Japan")`, step: 'destination' }
    ]);
    setCurrentStep('destination');
  };

  const handleDestinationSelect = (region: string) => {
    const formattedRegion = region
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    setPlan({ ...plan, region: formattedRegion });
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'user', text: region },
      { id: (Date.now() + 1).toString(), role: 'ai', text: `Awesome! ${formattedRegion} is a fantastic choice. ✈️\n\nWhen are you planning to travel and for how long? (e.g., "Next month for a week" or "Jul 14 to Jul 21")`, step: 'dates' }
    ]);
    setCurrentStep('dates');
  };

  const handleDatesSelect = (datesText: string) => {
    const arrivalDate = new Date();
    arrivalDate.setDate(arrivalDate.getDate() + 30);
    const leaveDate = new Date(arrivalDate);
    leaveDate.setDate(leaveDate.getDate() + 7);

    setPlan({ ...plan, arrivalDate, leaveDate });
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'user', text: datesText },
      { id: (Date.now() + 1).toString(), role: 'ai', text: `Got it! Marked your calendar. 📅\n\nHave you booked your transportation (flight/train) yet? If not, you can use the Flights tab on the left to check Expedia/Booking.\nAlso, what kind of accommodation are you looking for based on your budget? (e.g., "Cheap hostel near downtown", "Luxury hotel near the beach")`, step: 'chatting' }
    ]);
    setCurrentStep('chatting');
  };

  const handleGenerateItinerary = async (customMessages?: Message[]) => {
    setCurrentStep('generating');
    const chatHistory = customMessages || messages;

    const finalPlan = {
      ...plan,
      hobbies: [],
      favoriteFood: [],
      restaurantPreferences: [],
      placePreferences: [],
    } as TravelPlan;

    setPlan(finalPlan);
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'ai', text: `Perfect! Crafting your itinerary based on our conversation... 🪄`, step: 'generating' }
    ]);

    try {
      const generated = await generateItinerary(finalPlan, chatHistory);

      sessionStorage.setItem('travelPlan', JSON.stringify(finalPlan));
      sessionStorage.setItem('generatedItinerary', JSON.stringify(generated));

      if (user?.id) {
        try {
          const API_BASE = import.meta.env.VITE_API_URL || "";
          await fetch(`${API_BASE}/api/trips`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              region: finalPlan.region,
              arrivalDate: finalPlan.arrivalDate,
              leaveDate: finalPlan.leaveDate,
              budget: finalPlan.budget || "moderate",
              whoTraveling: finalPlan.whoTraveling || "solo",
              itinerary: generated
            })
          });
          console.log("Trip successfully saved to Supabase!");
        } catch (dbErr) {
          console.warn("Failed to persist trip to DB:", dbErr);
        }
      }

      // Reset generating state immediately before navigating so the 'Generating...' UI disappears
      setCurrentStep('chatting');
      navigate('/itinerary');
    } catch (e) {
      console.error(e);
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'ai', text: "Sorry, I encountered an error generating your itinerary. Make sure the backend is running and try again." }
      ]);
      setCurrentStep('chatting');
    }
  };

  const handleChattingInput = async (text: string) => {
    const isReady = text.toLowerCase().includes("good to go") ||
      text.toLowerCase().includes("ready") ||
      text.toLowerCase().includes("generate") ||
      text.toLowerCase().includes("done");

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);

    if (isReady) {
      await handleGenerateItinerary(updatedMessages);
      return;
    }

    setIsThinking(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      let sessionId = sessionStorage.getItem('sessionId');
      let userId = localStorage.getItem('userId');

      if (!sessionId) {
        sessionId = `sess_${Date.now()}`;
        sessionStorage.setItem('sessionId', sessionId);
      }
      if (!userId) {
        userId = `usr_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('userId', userId);
      }

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          text: text,
          sessionId: sessionId,
          userId: userId
        }),
      });

      if (!response.ok) {
        throw new Error("Chat response failed");
      }

      const data = await response.json();
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'ai',
          text: data.text,
          step: 'chatting'
        }
      ]);
    } catch (e) {
      console.error("Chat error:", e);
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'ai', text: "Sorry, I couldn't connect to JourZy. Try saying 'good to go' to force generation or check your connection." }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    const text = inputValue;
    setInputValue('');

    if (currentStep !== 'generating') {
      handleChattingInput(text);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col fixed inset-y-0 z-10">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-2 font-bold text-xl mb-1 text-white">
            <Sparkles className="size-5" />
            JourZy
          </div>
          <div className="text-zinc-500 text-sm">Your AI travel assistant</div>
        </div>

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          <div>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">Menu</div>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setActiveView('chat')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeView === 'chat' ? 'bg-zinc-800 border-l-2 border-emerald-500 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
                >
                  <MessageSquare className="size-4" /> Plan with AI
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/itinerary')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors">
                  <Calendar className="size-4" /> My Schedule
                </button>
              </li>
              <li>
                <button onClick={() => {
                  const saved = sessionStorage.getItem('generatedItinerary');
                  if (saved) {
                    navigate('/itinerary?tab=packing');
                  } else {
                    alert("Please complete the AI planning first to generate a packing list!");
                  }
                }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors">
                  <Briefcase className="size-4" /> Packing List
                </button>
              </li>
              <li>
                <button onClick={() => {
                  const saved = sessionStorage.getItem('generatedItinerary');
                  if (saved) {
                    navigate('/itinerary?tab=weather');
                  } else {
                    alert("Please complete the AI planning first to view weather forecasts!");
                  }
                }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors">
                  <CloudSun className="size-4" /> Weather
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveView('flights')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeView === 'flights' ? 'bg-zinc-800 border-l-2 border-emerald-500 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}
                >
                  <Plane className="size-4" /> Flights
                </button>
              </li>
            </ul>
          </div>

          {user && (
            <div className="pt-4 border-t border-zinc-800">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">Saved Trips</div>
              {savedTrips.length === 0 ? (
                <div className="text-xs text-zinc-500 px-2 italic">No saved trips yet</div>
              ) : (
                <ul className="space-y-1">
                  {savedTrips.map((trip: any) => (
                    <li key={trip.id}>
                      <button
                        onClick={() => handleLoadSavedTrip(trip.id)}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-white transition-colors truncate flex justify-between items-center group"
                      >
                        <span className="truncate flex-1 pr-2">{trip.region}</span>
                        <span className="text-[10px] text-zinc-650 group-hover:text-zinc-400 shrink-0">
                          {new Date(trip.arrival_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </nav>

        {plan.region && (
          <div className="p-4 border-t border-zinc-800">
            <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
              <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
                {plan.region}
              </div>
              <div className="text-xs text-zinc-400 mb-2">
                Planning in progress...
              </div>
              <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                In progress
              </div>
            </div>
          </div>
        )}

        {/* User Profile / Log Out */}
        {user && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 mt-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-8 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm">
                {user.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.email}</p>
                <p className="text-[10px] text-zinc-500">Explorer Profile</p>
              </div>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                localStorage.removeItem('userId');
                sessionStorage.clear();
                navigate('/login');
              }}
              className="w-full bg-zinc-950 border border-zinc-800 hover:bg-zinc-850 hover:text-red-400 text-zinc-400 py-2 rounded-xl text-xs font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 flex flex-col h-screen relative">
        {activeView === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-8 pb-32">
              <div className="max-w-3xl mx-auto space-y-6">

                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-4 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`size-8 rounded-full flex items-center justify-center shrink-0 border ${msg.role === 'ai'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}>
                      {msg.role === 'ai' ? <Sparkles className="size-4" /> : <UserIcon className="size-4" />}
                    </div>

                    <div className={`relative group max-w-[80%] ${msg.role === 'ai'
                      ? 'bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm p-5 text-zinc-300'
                      : 'bg-blue-600 border border-blue-500 rounded-2xl rounded-tr-sm p-4 text-white'
                      }`}>
                      {msg.role === 'ai' && (
                        <Button variant="ghost" size="icon" className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 h-8 w-8 text-zinc-500">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      )}

                      <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                      {/* Contextual Actions / Suggestions */}
                      {msg.role === 'ai' && msg.step === 'destination' && currentStep === 'destination' && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {["Tokyo, Japan 🇯🇵", "Paris, France 🇫🇷", "Bali, Indonesia 🇮🇩", "New York, USA 🗽"].map(dest => (
                            <button
                              key={dest}
                              onClick={() => handleDestinationSelect(dest)}
                              className="px-4 py-2 rounded-full border border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-sm text-zinc-300 transition-colors"
                            >
                              {dest}
                            </button>
                          ))}
                        </div>
                      )}

                      {msg.role === 'ai' && msg.step === 'dates' && currentStep === 'dates' && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {["Jul 14 to Jul 21", "Next week for 5 days", "In September for 2 weeks"].map(dates => (
                            <button
                              key={dates}
                              onClick={() => handleDatesSelect(dates)}
                              className="px-4 py-2 rounded-full border border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-sm text-zinc-300 transition-colors"
                            >
                              {dates}
                            </button>
                          ))}
                        </div>
                      )}

                      {msg.role === 'ai' && msg.step === 'chatting' && currentStep === 'chatting' && (
                        (() => {
                          const userMsgs = messages.filter(m => m.role === 'user');
                          const lastUser = userMsgs[userMsgs.length - 1];
                          const hasSaidReady = lastUser && (
                            lastUser.text.toLowerCase().includes("ready") ||
                            lastUser.text.toLowerCase().includes("done") ||
                            lastUser.text.toLowerCase().includes("good to") ||
                            lastUser.text.toLowerCase().includes("generate")
                          );

                          if (!hasSaidReady) return null;

                          return (
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                onClick={() => handleGenerateItinerary()}
                                className="px-4 py-2 rounded-full border border-emerald-500 bg-emerald-950/20 hover:bg-emerald-950/40 text-sm font-semibold text-emerald-400 transition-colors flex items-center gap-1.5 shadow-md animate-pulse"
                              >
                                Generate Itinerary 🪄
                              </button>
                            </div>
                          );
                        })()
                      )}

                      {msg.role === 'ai' && msg.step === 'generating' && (
                        <div className="mt-4 flex items-center gap-3 text-emerald-400 text-sm font-medium">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-400"></div>
                          Crafting your perfect trip...
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex gap-4 items-start">
                    <div className="size-8 rounded-full flex items-center justify-center shrink-0 border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <Sparkles className="size-4 animate-pulse" />
                    </div>
                    <div className="relative group max-w-[80%] bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm p-4 text-zinc-400 flex items-center gap-2">
                      <span className="text-sm font-medium"></span>
                      <div className="flex gap-1 items-center pt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent">
              <div className="max-w-3xl mx-auto">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmit();
                    }}
                    disabled={currentStep === 'generating'}
                    placeholder={currentStep === 'generating' ? "Generating..." : "Ask anything about your trip..."}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl py-4 pl-5 pr-14 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-lg disabled:opacity-50"
                  />
                  <Button
                    size="icon"
                    onClick={handleSubmit}
                    disabled={currentStep === 'generating' || !inputValue.trim()}
                    className="absolute right-2 h-10 w-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:bg-zinc-800 disabled:text-zinc-500"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 flex-1 overflow-y-auto flex flex-col">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Flight Search</h2>
                <p className="text-zinc-400 text-sm">
                  Search flight deals to <span className="text-emerald-400 font-semibold">{plan.region || "your destination"}</span>
                </p>
              </div>
              <Button
                onClick={() => setActiveView('chat')}
                className="bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700"
              >
                Back to Chat Planning
              </Button>
            </div>
            <div className="flex-1">
              <FlightsTab
                itinerary={{
                  plan: {
                    region: plan.region || "San Jose",
                    arrivalDate: plan.arrivalDate || new Date(),
                    leaveDate: plan.leaveDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  }
                } as any}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
