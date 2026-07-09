import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Home, Map, Backpack, Lightbulb, MessageCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { GeneratedItinerary } from '../types/travel';
import { apiFetch } from '../utils/api';
import { TodayTab } from '../components/today-tab';
import { MyPlanTab } from '../components/my-plan-tab';
import { PackingTab } from '../components/packing-tab';
import { TipsTab } from '../components/tips-tab';
import { ChatOverlay } from '../components/chat-overlay';
import { RescheduleTab } from '../components/reschedule-tab';

type TabId = 'today' | 'plan' | 'packing' | 'tips' | 'reschedule';

const TABS: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'plan', label: 'My Plan', icon: Map },
  { id: 'packing', label: 'Packing', icon: Backpack },
  { id: 'tips', label: 'Tips', icon: Lightbulb },
  { id: 'reschedule', label: 'Reschedule', icon: RefreshCw },
];

export default function Itinerary() {
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);
  const [isPastTrip, setIsPastTrip] = useState(false);
  const [tab, setTab] = useState<TabId>('today');
  const [planDayNumber, setPlanDayNumber] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPrefill, setChatPrefill] = useState<string | undefined>(undefined);
  const [memories, setMemories] = useState<string[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const scrollPositions = useRef<Record<TabId, number>>({ today: 0, plan: 0, packing: 0, tips: 0, reschedule: 0 });

  useEffect(() => {
    const itineraryData = localStorage.getItem('generatedItinerary');
    if (!itineraryData) { navigate('/'); return; }
    try {
      setItinerary(JSON.parse(itineraryData));
      setIsPastTrip(localStorage.getItem('viewingPastTrip') === 'true');
    } catch (e) {
      navigate('/');
    }
  }, [navigate]);

  // Leaving a past trip's read-only view must fully reset the planning chat
  // session — otherwise the stale chatMessages/chatStep/chatPlan from
  // whatever was last in progress gets resumed instead of a fresh "plan a
  // new trip" conversation (this was the "JourZy cannot plan a new trip" bug).
  const startNewTrip = () => {
    localStorage.removeItem('chatMessages');
    localStorage.removeItem('chatStep');
    localStorage.removeItem('chatPlan');
    localStorage.removeItem('travelPlan');
    localStorage.removeItem('generatedItinerary');
    localStorage.removeItem('itineraryChatMessages');
    localStorage.removeItem('itineraryChatTripId');
    localStorage.removeItem('viewingPastTrip');
    navigate('/?view=chat');
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const resp = await apiFetch('/api/memory');
        if (resp.ok) {
          const data = await resp.json();
          const prefs = data?.memory?.preferences;
          if (prefs) {
            const pills = [
              ...(prefs.travelPersonaArchetype || []),
              ...(prefs.vibeSettings || []),
              ...(prefs.foodPreferences || []),
              ...(prefs.environmentPriorities || []),
            ];
            setMemories(pills);
          }
          if (prefs?.userName) setUserName(prefs.userName);
        }
      } catch (e) {
        console.error('Failed to load preferences:', e);
      }
    };
    fetchProfile();
  }, []);

  // Restore each tab's own scroll position right after it mounts, so
  // switching tabs and coming back doesn't dump you back at the top.
  useLayoutEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = scrollPositions.current[tab] || 0;
    }
  }, [tab]);

  if (!itinerary) return null;

  const changeTab = (nextTab: TabId) => {
    if (mainRef.current) {
      scrollPositions.current[tab] = mainRef.current.scrollTop;
    }
    setTab(nextTab);
  };

  const openChat = (prefill?: string) => {
    setChatPrefill(prefill);
    setChatOpen(true);
  };

  const handleSeeWholeDay = (dayNumber: number) => {
    setPlanDayNumber(dayNumber);
    changeTab('plan');
  };

  const handleReplaceActivity = (dayNumber: number, activityIdx: number, newData: { title: string; location: string; description: string; place: any }) => {
    setItinerary(prev => {
      if (!prev) return prev;
      const updatedDays = prev.days.map(day => {
        if (day.dayNumber !== dayNumber) return day;
        const updatedActivities = day.activities.map((act, idx) =>
          idx === activityIdx ? { ...act, ...newData, time: act.time } : act
        );
        return { ...day, activities: updatedActivities };
      });
      const updated = { ...prev, days: updatedDays };
      localStorage.setItem('generatedItinerary', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRescheduled = (newItinerary: GeneratedItinerary) => {
    const nowPast = !!newItinerary.plan.leaveDate && new Date(newItinerary.plan.leaveDate) < new Date();
    setItinerary(newItinerary);
    setIsPastTrip(nowPast);
    localStorage.setItem('generatedItinerary', JSON.stringify(newItinerary));
    localStorage.setItem('travelPlan', JSON.stringify(newItinerary.plan));
    localStorage.setItem('viewingPastTrip', JSON.stringify(nowPast));
    changeTab('today');
  };

  return (
    <div className="min-h-screen bg-jz-outerBg text-jz-ink flex items-center justify-center sm:p-4 selection:bg-jz-tealTint">
      <div className="relative w-full max-w-[430px] h-[100dvh] sm:h-[min(920px,94vh)] bg-jz-bg sm:rounded-[36px] overflow-hidden sm:border-[10px] sm:border-jz-ink sm:shadow-2xl flex flex-col">

        {isPastTrip && (
          <div className="flex items-center gap-3 px-4 py-3 bg-jz-card border-b-[1.5px] border-jz-line shrink-0">
            <button
              onClick={startNewTrip}
              className="flex items-center gap-1.5 text-jz-teal font-extrabold text-jz-body-big"
            >
              <ArrowLeft className="w-5 h-5" /> Plan a new trip
            </button>
            <span className="ml-auto text-xs font-extrabold text-jz-soft uppercase tracking-wide">Past trip</span>
          </div>
        )}

        {tab === 'reschedule' ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <RescheduleTab itinerary={itinerary} onRescheduled={handleRescheduled} />
          </div>
        ) : (
          <main
            ref={mainRef}
            onScroll={(e) => { scrollPositions.current[tab] = e.currentTarget.scrollTop; }}
            className="flex-1 overflow-y-auto p-4 pb-24 no-scrollbar"
          >
            {tab === 'today' && (
              <TodayTab
                itinerary={itinerary}
                memories={memories}
                userName={userName}
                onSeeWholeDay={handleSeeWholeDay}
                onOpenChat={() => openChat()}
              />
            )}
            {tab === 'plan' && (
              <MyPlanTab itinerary={itinerary} initialDayNumber={planDayNumber} onOpenChat={() => openChat()} />
            )}
            {tab === 'packing' && (
              <PackingTab
                packingList={itinerary.packingList}
                region={itinerary.plan.region}
                weatherWeek={itinerary.insights?.weatherWeek}
                weatherOverview={itinerary.insights?.weatherOverview}
                onOpenChat={() => openChat(`What medicines should I check for ${itinerary.plan.region}?`)}
              />
            )}
            {tab === 'tips' && <TipsTab itinerary={itinerary} />}
          </main>
        )}

        {tab !== 'today' && tab !== 'reschedule' && !chatOpen && (
          <button
            onClick={() => openChat()}
            aria-label="Talk to JourZy"
            className="absolute right-4 bottom-24 w-[66px] h-[66px] rounded-3xl bg-jz-gold shadow-xl flex items-center justify-center z-20 hover:scale-105 active:scale-95 transition-all"
          >
            <MessageCircle className="w-[30px] h-[30px] text-jz-goldInk" strokeWidth={2.4} />
          </button>
        )}

        <nav className="flex border-t-[1.5px] border-jz-line bg-jz-card px-1 pt-1.5 pb-3 shrink-0 z-10">
          {TABS.map(t => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => { changeTab(t.id); setChatOpen(false); }}
                className="flex-1 min-h-[62px] flex flex-col items-center justify-center gap-1"
              >
                <span className={`w-[52px] h-[34px] rounded-xl flex items-center justify-center ${active ? 'bg-jz-tealTint' : ''}`}>
                  <Icon className="w-[26px] h-[26px]" color={active ? '#0F6E64' : '#5C6B74'} strokeWidth={active ? 2.6 : 2} />
                </span>
                <span className={`text-[14.5px] font-black ${active ? 'text-jz-teal' : 'text-jz-soft'}`}>{t.label}</span>
              </button>
            );
          })}
        </nav>

        {chatOpen && (
          <ChatOverlay
            itinerary={itinerary}
            prefill={chatPrefill}
            isPastTrip={isPastTrip}
            onClose={() => setChatOpen(false)}
            onReplaceActivity={handleReplaceActivity}
          />
        )}
      </div>
    </div>
  );
}
