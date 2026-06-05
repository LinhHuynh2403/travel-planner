import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { TravelPlan, GeneratedItinerary, ItineraryActivity, HotelRecommendation } from '../types/travel';
import { generateItinerary } from '../utils/generate-itinerary';
import { ItineraryTimeline } from '../components/itinerary-timeline';
import { MapTab } from '../components/map-tab';
import { FlightsTab } from '../components/flights-tab';
import { PackingTab } from '../components/packing-tab';
import { WeatherTab } from '../components/weather-tab';
import { TipsTab } from '../components/tips-tab';
import { BudgetTab } from '../components/budget-tab';
import { SafetyTab } from '../components/safety-tab';
import { CompanionTab } from '../components/companion-tab';
import { EventsTab } from '../components/events-tab';
import { MemoryTab } from '../components/memory-tab';
import { supabase } from '../utils/supabaseClient';
import { User } from '@supabase/supabase-js';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Calendar,
  Map,
  Plane,
  MessageSquare,
  Briefcase,
  CloudSun,
  Sparkles,
  HelpCircle,
  Clock,
  ExternalLink,
  MapPin,
  Building2,
  X,
  Coins,
  ShieldCheck,
  Radio,
  PartyPopper,
  Brain,
  BookmarkCheck,
  BookmarkPlus
} from 'lucide-react';

export default function Itinerary() {
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

  const [savedTrips, setSavedTrips] = useState<any[]>([]);
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [tripSaved, setTripSaved] = useState(false);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);

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

        // Force refresh or trigger itinerary load if already on itinerary page
        setItinerary(loadedItinerary as any);
        setActiveTab('schedule');
        setSearchParams({ tab: 'schedule' });
        const scrollContainer = document.getElementById("main-content-scroll");
        if (scrollContainer) {
          scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
        }
      }
    } catch (e) {
      console.error("Failed to load saved trip details:", e);
    }
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'map' | 'flights' | 'packing' | 'weather' | 'tips' | 'budget' | 'safety' | 'companion' | 'events' | 'memory'>((searchParams.get('tab') as any) || 'schedule');
  const [selectedActivity, setSelectedActivity] = useState<ItineraryActivity | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<
    | { type: 'activity'; activity: ItineraryActivity; dayNumber: number; activityIdx: number }
    | { type: 'hotel'; hotel: HotelRecommendation }
    | null
  >(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    const scrollContainer = document.getElementById("main-content-scroll");
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  useEffect(() => {
    const planData = sessionStorage.getItem("travelPlan");
    const itineraryData = sessionStorage.getItem("generatedItinerary");

    if (!planData && !itineraryData) {
      navigate("/");
      return;
    }

    const parseItinerary = (parsed: any): GeneratedItinerary => {
      if (parsed.plan) {
        parsed.plan.arrivalDate = new Date(parsed.plan.arrivalDate);
        parsed.plan.leaveDate = new Date(parsed.plan.leaveDate);
      }
      if (parsed.days) {
        parsed.days = parsed.days.map((day: any) => ({
          ...day,
          date: new Date(day.date)
        }));
      }
      // Ensure insights always exists so the Local Tips tab renders
      if (!parsed.insights) {
        const region = parsed.plan?.region || 'your destination';
        parsed.insights = {
          weatherOverview: `Check the latest forecast for ${region} before your trip.`,
          culturalTips: [
            `Learn a few basic local greetings — locals in ${region} appreciate the effort.`,
            'Dress modestly when visiting temples, churches, or other religious sites.',
            'Always ask permission before photographing people or sacred places.'
          ],
          safetyTips: [
            'Keep copies of your passport and important documents in a separate bag.',
            'Use licensed taxis or reputable ride-hailing apps for transportation.',
            'Stay aware of your surroundings in crowded tourist areas and secure your valuables.'
          ],
          customsRestrictions: [
            'Liquids in carry-on bags must be in containers of 100ml (3.4oz) or less, placed in a clear resealable bag.',
            'Fresh fruits, vegetables, meats, and dairy products are commonly prohibited at customs.',
            'Some common medications may be controlled or banned at your destination — verify before traveling.',
            'Duty-free limits for alcohol and tobacco vary by country — exceeding them may result in confiscation or fines.'
          ]
        };
      }
      if (!parsed.logisticsGuide) {
        parsed.logisticsGuide = {
          connectivity: "Pre-book a local eSIM or pick up a data SIM at the arrival terminal counters.",
          transitCards: "Look up standard local tap-and-go cards or use contactless cards at city turnstiles."
        };
      }

      return parsed;
    };

    if (itineraryData) {
      try {
        const parsed = JSON.parse(itineraryData);
        setItinerary(parseItinerary(parsed));
        return;
      } catch (e) {
        console.error("Failed to parse itineraryData from sessionStorage", e);
      }
    }

    // Fallback if accessed without pre-generation
    try {
      const plan: TravelPlan = JSON.parse(planData!);
      plan.arrivalDate = new Date(plan.arrivalDate);
      plan.leaveDate = new Date(plan.leaveDate);

      (async () => {
        try {
          const generated = await generateItinerary(plan);
          setItinerary(parseItinerary(generated));
        } catch (e) {
          console.error(e);
        }
      })();
    } catch (e) {
      console.error("Failed to parse planData from sessionStorage", e);
      navigate("/");
    }
  }, [navigate]);



  if (!itinerary) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center text-zinc-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Generating your personalized itinerary...</p>
        </div>
      </div>
    );
  }

  const handleViewOnMap = (activity: ItineraryActivity) => {
    setSelectedActivity(activity);
    setActiveTab('map');
    setSearchParams({ tab: 'map' });
    const scrollContainer = document.getElementById("main-content-scroll");
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleSwapActivity = (dayNumber: number, activityIdx: number, newActivityData: Partial<ItineraryActivity>) => {
    if (!itinerary) return;
    const updatedDays = [...itinerary.days];
    const day = updatedDays.find(d => d.dayNumber === dayNumber);
    if (day) {
      const original = day.activities[activityIdx];
      const swapped: ItineraryActivity = {
        ...original,
        ...newActivityData,
        time: original.time
      } as any;
      day.activities[activityIdx] = swapped;
      const updatedItinerary = {
        ...itinerary,
        days: updatedDays
      };
      setItinerary(updatedItinerary);
      sessionStorage.setItem("generatedItinerary", JSON.stringify(updatedItinerary));

      if (selectedDetail && selectedDetail.type === 'activity' && selectedDetail.dayNumber === dayNumber && selectedDetail.activityIdx === activityIdx) {
        setSelectedDetail({
          type: 'activity',
          activity: swapped,
          dayNumber,
          activityIdx
        });
      }

      if (selectedActivity && (selectedActivity.title === original.title || (selectedActivity.place && original.place && selectedActivity.place.placeId === original.place.placeId))) {
        setSelectedActivity(swapped);
      }
    }
  };

  const handleBackToTimeline = () => {
    setActiveTab('schedule');
    setSearchParams({ tab: 'schedule' });

    // Use selectedActivity if available, otherwise fallback to selectedDetail if it's an activity
    const activeAct = selectedActivity || (selectedDetail?.type === 'activity' ? selectedDetail.activity : null);

    if (activeAct) {
      // Find the day number and index for the selected activity
      let foundDayNum = -1;
      let foundIdx = -1;
      let foundAct = null;
      for (const day of itinerary?.days || []) {
        const idx = day.activities.findIndex(act =>
          act.title === activeAct.title ||
          (act.place && activeAct.place && act.place.placeId === activeAct.place.placeId)
        );
        if (idx !== -1) {
          foundDayNum = day.dayNumber;
          foundIdx = idx;
          foundAct = day.activities[idx];
          break;
        }
      }

      if (foundDayNum !== -1 && foundIdx !== -1 && foundAct) {
        // Keep both selectedActivity and selectedDetail in sync!
        setSelectedActivity(foundAct);
        setSelectedDetail({
          type: 'activity',
          activity: foundAct,
          dayNumber: foundDayNum,
          activityIdx: foundIdx
        });

        const elementId = `activity-${foundDayNum}-${foundIdx}`;
        // Wait for the timeline DOM to render before scrolling
        setTimeout(() => {
          const el = document.getElementById(elementId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
      }
    }
  };

  const handleSwapHotel = (altIdx: number) => {
    if (!itinerary || !itinerary.hotelRecommendation) return;
    const hotel = itinerary.hotelRecommendation;
    const alternatives = hotel.alternatives ? [...hotel.alternatives] : [];
    const alt = alternatives[altIdx];
    if (!alt) return;

    const newHotel = {
      name: alt.name,
      neighborhood: alt.neighborhood,
      reasoning: alt.reasoning,
      alternatives: alternatives.map((item, idx) => {
        if (idx === altIdx) {
          return {
            name: hotel.name,
            neighborhood: hotel.neighborhood,
            reasoning: hotel.reasoning
          };
        }
        return item;
      })
    };

    const newItinerary = {
      ...itinerary,
      hotelRecommendation: newHotel
    };

    setItinerary(newItinerary);
    sessionStorage.setItem("generatedItinerary", JSON.stringify(newItinerary));
    setSelectedDetail({ type: 'hotel', hotel: newHotel });
  };

  const handleSaveTrip = async () => {
    if (!user || !itinerary || isSavingTrip || tripSaved) return;
    setIsSavingTrip(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const resp = await fetch(`${API_BASE}/api/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          region: itinerary.plan.region,
          arrivalDate: itinerary.plan.arrivalDate instanceof Date
            ? itinerary.plan.arrivalDate.toISOString().split('T')[0]
            : itinerary.plan.arrivalDate,
          leaveDate: itinerary.plan.leaveDate instanceof Date
            ? itinerary.plan.leaveDate.toISOString().split('T')[0]
            : itinerary.plan.leaveDate,
          budget: (itinerary.plan as any).budget || 'moderate',
          whoTraveling: (itinerary.plan as any).whoTraveling || 'solo',
          itinerary: {
            hotelRecommendation: itinerary.hotelRecommendation || null,
            days: itinerary.days || [],
            packingList: itinerary.packingList || null,
            insights: itinerary.insights || null,
          },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSavedTripId(data.tripId || null);
        setTripSaved(true);
        // Refresh saved trips list in sidebar
        const tripsResp = await fetch(`${API_BASE}/api/trips?userId=${user.id}`);
        if (tripsResp.ok) {
          const tripsData = await tripsResp.json();
          setSavedTrips(tripsData.trips || []);
        }
      } else {
        const errData = await resp.json().catch(() => ({}));
        console.error('Save trip failed:', errData);
        alert(`Failed to save trip: ${errData.error || resp.statusText}`);
      }
    } catch (e) {
      console.error('Failed to save trip:', e);
      alert('Network error — could not save trip.');
    } finally {
      setIsSavingTrip(false);
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

        <nav className="flex-1 p-4 space-y-8 overflow-y-auto">
          <div>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-2">Plan</div>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => handleTabChange('schedule')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'schedule' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <Calendar className="size-4" /> My schedule
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabChange('map')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'map' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <Map className="size-4" /> Map view
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabChange('flights')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'flights' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <Plane className="size-4" /> Flights
                </button>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2 mt-6">More</div>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => navigate('/')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
                >
                  <MessageSquare className="size-4" /> Plan with AI
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabChange('packing')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'packing' ? 'bg-zinc-800 text-white border-l-2 border-emerald-500 -ml-[2px]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <Briefcase className="size-4" /> Packing list
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabChange('weather')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'weather' ? 'bg-zinc-800 text-white border-l-2 border-emerald-500 -ml-[2px]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <CloudSun className="size-4" /> Weather
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabChange('tips')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'tips' ? 'bg-zinc-800 text-white border-l-2 border-emerald-500 -ml-[2px]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <HelpCircle className="size-4" /> Local Tips
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabChange('budget')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'budget' ? 'bg-zinc-800 text-white border-l-2 border-emerald-500 -ml-[2px]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <Coins className="size-4" /> Budget Tracker
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabChange('safety')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'safety' ? 'bg-zinc-800 text-white border-l-2 border-emerald-500 -ml-[2px]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <ShieldCheck className="size-4" /> Safety Assistant
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabChange('companion')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'companion' ? 'bg-zinc-800 text-white border-l-2 border-emerald-500 -ml-[2px]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <span className="relative flex size-4 items-center justify-center shrink-0">
                    <Radio className="size-4" />
                    {activeTab === 'companion' && (
                      <span className="absolute -top-0.5 -right-0.5 flex size-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full size-2 bg-emerald-400" />
                      </span>
                    )}
                  </span>
                  Live Companion
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabChange('events')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'events' ? 'bg-zinc-800 text-white border-l-2 border-emerald-500 -ml-[2px]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <PartyPopper className="size-4" /> Events
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleTabChange('memory')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'memory' ? 'bg-zinc-800 text-white border-l-2 border-emerald-500 -ml-[2px]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <Brain className="size-4" /> Memory
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

        <div className="p-4 border-t border-zinc-800">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-sm font-semibold text-white truncate">
              {itinerary.plan.region}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {itinerary.plan.arrivalDate.toLocaleDateString()} - {itinerary.plan.leaveDate.toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400">
                In progress
              </div>
            </div>
            {user ? (
              <button
                onClick={handleSaveTrip}
                disabled={isSavingTrip || tripSaved}
                className={`w-full mt-3 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all border ${
                  tripSaved
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 cursor-default'
                    : 'bg-zinc-900 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30 text-zinc-400 border-zinc-700'
                }`}
              >
                {tripSaved ? (
                  <><BookmarkCheck className="size-3.5" /> Saved!</>
                ) : isSavingTrip ? (
                  <><span className="animate-spin">⏳</span> Saving...</>
                ) : (
                  <><BookmarkPlus className="size-3.5" /> Save Trip</>
                )}
              </button>
            ) : (
              <p className="text-[10px] text-zinc-600 mt-2 italic">Sign in to save trips</p>
            )}
          </div>
        </div>

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
      <main id="main-content-scroll" className="ml-64 flex-1 p-8 h-screen overflow-y-auto pb-24">
        {activeTab === 'schedule' && (
          <div className="flex gap-8 max-w-6xl mx-auto items-start relative">
            <div className="flex-1 min-w-0">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 capitalize">{itinerary.plan.region} Itinerary</h1>
                <p className="text-zinc-400">
                  {itinerary.plan.arrivalDate.toLocaleDateString()} - {itinerary.plan.leaveDate.toLocaleDateString()} · Click any activity to view alternatives and details
                </p>
              </div>

              {/* 💰 NEW WORKFLOW: INTERACTIVE REAL-TIME BUDGET PROGRESS DISPLAY */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md mb-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-zinc-300">Live Trip Budget Tracker</p>
                  <p className="text-[11px] text-zinc-500">
                    Aggregated price tier allocations across your primary activities and active stay configurations.
                  </p>
                </div>
                <div className="flex items-center gap-6 w-full md:w-auto justify-end">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 uppercase block tracking-wider font-bold">Planned Pace</span>
                    <span className="text-xs text-zinc-200 font-semibold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                      Moderate / Dense
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 uppercase block tracking-wider font-bold">Cost Estimate</span>
                    <span className="text-xs text-emerald-400 font-bold bg-emerald-950/30 border border-emerald-800/40 px-2 py-0.5 rounded">
                      Medium ($$)
                    </span>
                  </div>
                </div>
              </div>
              <ItineraryTimeline
                days={itinerary.days}
                region={itinerary.plan.region}
                onViewOnMap={handleViewOnMap}
                onSelectActivity={(activity, dayNum, idx) => {
                  setSelectedDetail({ type: 'activity', activity, dayNumber: dayNum, activityIdx: idx });
                }}
                onSelectHotel={(hotel) => {
                  setSelectedDetail({ type: 'hotel', hotel });
                }}
                hotelRecommendation={itinerary.hotelRecommendation}
                selectedDetailId={
                  selectedDetail?.type === 'hotel'
                    ? 'hotel'
                    : selectedDetail?.type === 'activity'
                      ? `activity-${selectedDetail.dayNumber}-${selectedDetail.activityIdx}`
                      : null
                }
              />
            </div>

            {/* Right Side Detail Drawer */}
            {selectedDetail && (
              <aside className="w-96 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-0 shrink-0 text-zinc-300 shadow-xl max-h-[calc(100vh-6rem)] overflow-y-auto">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
                  <h3 className="font-bold text-lg text-white">
                    {selectedDetail.type === 'hotel' ? 'Accommodation Base' : 'Activity Detail'}
                  </h3>
                  <button
                    onClick={() => setSelectedDetail(null)}
                    className="text-zinc-500 hover:text-zinc-200 p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {selectedDetail.type === 'hotel' ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-bold text-xl text-white mb-2">{selectedDetail.hotel.name}</h4>
                      <p className="text-xs text-zinc-555 mb-4 flex items-center gap-1.5">
                        <span className="inline-block size-2 rounded-full bg-emerald-500" />
                        {selectedDetail.hotel.neighborhood}
                      </p>
                      <div className="text-sm text-zinc-400 leading-relaxed bg-zinc-950/40 p-4 rounded-xl border border-zinc-850">
                        <span className="text-xs font-bold text-emerald-400 block mb-1">REASONING</span>
                        {selectedDetail.hotel.reasoning}
                      </div>
                    </div>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedDetail.hotel.name + ", " + (selectedDetail.hotel.neighborhood || ""))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700">
                        Open in Google Maps
                        <ExternalLink className="ml-2 size-4" />
                      </Button>
                    </a>


                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="size-4 text-zinc-500" />
                        <span className="font-semibold text-sm text-zinc-300">{selectedDetail.activity.time}</span>
                        {selectedDetail.activity.travelTimeFromPrevious && selectedDetail.activity.travelTimeFromPrevious.length <= 45 && (
                          <Badge variant="outline" className="bg-zinc-950/80 text-zinc-400 border-zinc-800 text-[10px] py-0.5 px-2">
                            ⏱ {selectedDetail.activity.travelTimeFromPrevious}
                          </Badge>
                        )}
                      </div>
                      {selectedDetail.activity.travelTimeFromPrevious && selectedDetail.activity.travelTimeFromPrevious.length > 45 && (
                        <div className="mb-3 text-[11px] text-zinc-400 bg-zinc-950/50 border border-zinc-800/80 rounded-lg p-2.5 flex items-start gap-2 max-w-full whitespace-normal">
                          <span className="text-zinc-500 mt-0.5 shrink-0">⏱</span>
                          <span className="leading-relaxed">{selectedDetail.activity.travelTimeFromPrevious}</span>
                        </div>
                      )}
                      <h4 className="font-bold text-xl text-white mb-2">{selectedDetail.activity.title}</h4>
                      <p className="text-xs text-zinc-500 mb-4 flex items-center gap-1.5">
                        <span className="inline-block size-2 rounded-full bg-blue-500" />
                        {selectedDetail.activity.location}
                      </p>
                      <div className="text-sm text-zinc-400 leading-relaxed bg-zinc-950/40 p-4 rounded-xl border border-zinc-850">
                        <span className="text-xs font-bold text-blue-400 block mb-1">DESCRIPTION</span>
                        {selectedDetail.activity.description}
                      </div>
                    </div>

                    <Button
                      className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                      onClick={() => handleViewOnMap(selectedDetail.activity)}
                    >
                      More Information
                      <MapPin className="ml-2 size-4" />
                    </Button>

                    {/* Alternatives for Dynamic Replanning */}
                    {selectedDetail.activity.alternatives && selectedDetail.activity.alternatives.length > 0 && (
                      <div className="pt-4 border-t border-zinc-800 space-y-3">
                        <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="size-3.5 text-amber-400 animate-pulse" />
                          Dynamic Alternatives
                        </h5>
                        <div className="space-y-2.5">
                          {selectedDetail.activity.alternatives.map((alt: any, idx: number) => (
                            <div key={idx} className="bg-zinc-950/60 border border-zinc-850 p-3.5 rounded-xl flex flex-col gap-2">
                              <div>
                                <p className="text-xs font-bold text-white leading-tight">{alt.title}</p>
                                <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{alt.location}</p>
                                <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">{alt.description}</p>
                              </div>
                              <Button
                                size="sm"
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-[10px] font-extrabold h-8 rounded-lg flex items-center justify-center gap-1"
                                onClick={() => handleSwapActivity(selectedDetail.dayNumber, selectedDetail.activityIdx, {
                                  title: alt.title,
                                  location: alt.location,
                                  description: alt.description,
                                  place: alt.place
                                })}
                              >
                                Swap Stop
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </aside>
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <MapTab
            days={itinerary.days}
            plan={itinerary.plan}
            selectedActivity={selectedActivity}
            onActivitySelect={(act) => setSelectedActivity(act)}
            onBack={() => setActiveTab('schedule')}
            onReplaceActivity={(newActivityData) => {
              if (!selectedActivity) return;
              let foundDayNum = -1;
              let foundIdx = -1;
              for (const day of itinerary.days) {
                const idx = day.activities.findIndex(a => a === selectedActivity);
                if (idx !== -1) {
                  foundDayNum = day.dayNumber;
                  foundIdx = idx;
                  break;
                }
              }
              if (foundDayNum !== -1 && foundIdx !== -1) {
                handleSwapActivity(foundDayNum, foundIdx, newActivityData);
                setActiveTab('schedule');
                setSearchParams({ tab: 'schedule' });
              }
            }}
          />
        )}

        {activeTab === 'flights' && (
          <FlightsTab itinerary={itinerary} />
        )}

        {activeTab === 'packing' && (
          <PackingTab packingList={itinerary.packingList} region={itinerary.plan.region} />
        )}

        {activeTab === 'weather' && (
          <WeatherTab insights={itinerary.insights} region={itinerary.plan.region} />
        )}

        {activeTab === 'tips' && (
          <TipsTab
            insights={itinerary.insights}
            region={itinerary.plan.region}
            logisticsGuide={(itinerary as any).logisticsGuide}
          />
        )}

        {activeTab === 'budget' && (
          <BudgetTab itinerary={itinerary} />
        )}

        {activeTab === 'safety' && (
          <SafetyTab itinerary={itinerary} />
        )}

        {activeTab === 'companion' && (
          <CompanionTab
            itinerary={itinerary}
            onSwapActivity={handleSwapActivity}
          />
        )}

        {activeTab === 'events' && (
          <EventsTab itinerary={itinerary} />
        )}

        {activeTab === 'memory' && (
          <MemoryTab itinerary={itinerary} />
        )}
      </main>
    </div>
  );
}
