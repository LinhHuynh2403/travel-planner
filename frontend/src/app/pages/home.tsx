import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Calendar, Map, Plane, MessageSquare, Briefcase, CloudSun, Sparkles, Send, MoreHorizontal, User } from 'lucide-react';
import { TravelPlan } from '../types/travel';
import { generateItinerary } from '../utils/generate-itinerary';

type Message = {
  id: string;
  role: 'ai' | 'user';
  text: string;
  step?: 'destination' | 'dates' | 'chatting' | 'generating';
};

export default function Home() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      text: "Hi! I'm your AI travel assistant. I'll help you plan every detail of your trip — flights, hotels, activities, weather, and a full day-by-day schedule. Let's start with a few questions. 🌍\n\nWhere would you like to go?",
      step: 'destination'
    }
  ]);
  const [currentStep, setCurrentStep] = useState<'destination' | 'dates' | 'chatting' | 'generating'>('destination');
  const [plan, setPlan] = useState<Partial<TravelPlan>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleDestinationSelect = (region: string) => {
    setPlan({ ...plan, region });
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'user', text: region },
      { id: (Date.now() + 1).toString(), role: 'ai', text: `Awesome! ${region} is a fantastic choice. ✈️\n\nWhen are you planning to travel and for how long? (e.g., "Next month for a week" or "Jul 14 to Jul 21")`, step: 'dates' }
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
      { id: (Date.now() + 1).toString(), role: 'ai', text: `Got it! Marked your calendar. 📅\n\nTo make this itinerary perfect, tell me a bit about your hobbies, interests, or specific things you'd love to see or do. We can keep chat planning as long as you like, or say 'good to go' to build your schedule!`, step: 'chatting' }
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
      text.toLowerCase().includes("generate");

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);

    if (isReady) {
      await handleGenerateItinerary(updatedMessages);
      return;
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
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
        { id: Date.now().toString(), role: 'ai', text: "Sorry, I couldn't connect to Wandr. Try saying 'good to go' to force generation or check your connection." }
      ]);
    }
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;

    const text = inputValue;
    setInputValue('');

    if (currentStep === 'destination') {
      handleDestinationSelect(text);
    } else if (currentStep === 'dates') {
      handleDatesSelect(text);
    } else if (currentStep === 'chatting') {
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
            wandr
          </div>
          <div className="text-zinc-500 text-sm">Your AI travel assistant</div>
        </div>

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          <div>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">Menu</div>
            <ul className="space-y-1">
              <li>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-zinc-800 border-l-2 border-emerald-500 text-white">
                  <MessageSquare className="size-4" /> Plan with AI
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/itinerary')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors">
                  <Calendar className="size-4" /> My Schedule
                </button>
              </li>
              <li>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors">
                  <Briefcase className="size-4" /> Packing List
                </button>
              </li>
              <li>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors">
                  <CloudSun className="size-4" /> Weather
                </button>
              </li>
              <li>
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors">
                  <Plane className="size-4" /> Flights
                </button>
              </li>
            </ul>
          </div>
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
      </aside>

      {/* Main Content (Chat UI) */}
      <main className="ml-64 flex-1 flex flex-col h-screen relative">
        <div className="flex-1 overflow-y-auto p-8 pb-32">
          <div className="max-w-3xl mx-auto space-y-6">

            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 items-start ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`size-8 rounded-full flex items-center justify-center shrink-0 border ${msg.role === 'ai'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  }`}>
                  {msg.role === 'ai' ? <Sparkles className="size-4" /> : <User className="size-4" />}
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
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleGenerateItinerary()}
                        className="px-4 py-2 rounded-full border border-emerald-500 bg-emerald-950/20 hover:bg-emerald-950/40 text-sm font-semibold text-emerald-400 transition-colors flex items-center gap-1.5 shadow-md animate-pulse"
                      >
                        Generate Itinerary 🪄
                      </button>
                    </div>
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
      </main>
    </div>
  );
}
