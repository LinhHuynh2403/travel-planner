import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { TravelPlan, GeneratedItinerary, ItineraryActivity } from '../types/travel';
import { generateItinerary } from '../utils/generate-itinerary';
import { ItineraryTimeline } from '../components/itinerary-timeline';
import { MapTab } from '../components/map-tab';
import { FlightsTab } from '../components/flights-tab';
import { PackingTab } from '../components/packing-tab';
import { WeatherTab } from '../components/weather-tab';
import { TipsTab } from '../components/tips-tab';
import { Calendar, Map, Plane, MessageSquare, Briefcase, CloudSun, Sparkles, HelpCircle } from 'lucide-react';

export default function Itinerary() {
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'map' | 'flights' | 'packing' | 'weather' | 'tips'>('schedule');
  const [selectedActivity, setSelectedActivity] = useState<ItineraryActivity | null>(null);

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
  };

  const handleSwapActivity = async (dayNumber: number, activityIdx: number, altIdx: number) => {
    if (!itinerary) return;

    const updatedDays = itinerary.days.map(d => {
      if (d.dayNumber !== dayNumber) return d;
      const activities = d.activities.map((act, idx) => {
        if (idx !== activityIdx) return act;

        const alternatives = act.alternatives ? [...act.alternatives] : [];
        const alt = alternatives[altIdx];
        if (!alt) return act;

        const newMain: ItineraryActivity = {
          ...act,
          title: alt.title,
          location: alt.location,
          description: alt.description,
          place: undefined // Reset place coordinates until fetched
        };

        const newAlt = {
          title: act.title,
          location: act.location,
          description: act.description
        };
        alternatives[altIdx] = newAlt;
        newMain.alternatives = alternatives;

        return newMain;
      });
      return { ...d, activities };
    });

    const newItinerary = {
      ...itinerary,
      days: updatedDays
    };

    setItinerary(newItinerary);
    sessionStorage.setItem("generatedItinerary", JSON.stringify(newItinerary));

    const targetActivity = updatedDays.find(d => d.dayNumber === dayNumber)?.activities[activityIdx];
    if (!targetActivity) return;

    try {
      const resp = await fetch(`/api/place-lookup?query=${encodeURIComponent(targetActivity.location)}&region=${encodeURIComponent(itinerary.plan.region)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.place) {
          const finalizedDays = newItinerary.days.map(d => {
            if (d.dayNumber !== dayNumber) return d;
            const activities = d.activities.map((act, idx) => {
              if (idx !== activityIdx) return act;
              return {
                ...act,
                place: data.place
              };
            });
            return { ...d, activities };
          });
          const finalizedItinerary = { ...newItinerary, days: finalizedDays };
          setItinerary(finalizedItinerary);
          sessionStorage.setItem("generatedItinerary", JSON.stringify(finalizedItinerary));
        }
      }
    } catch (e) {
      console.error("Failed to lookup swapped place details", e);
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
                  onClick={() => setActiveTab('schedule')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'schedule' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <Calendar className="size-4" /> My schedule
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'map' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <Map className="size-4" /> Map view
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('flights')}
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
                  onClick={() => setActiveTab('packing')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'packing' ? 'bg-zinc-800 text-white border-l-2 border-emerald-500 -ml-[2px]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <Briefcase className="size-4" /> Packing list
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('weather')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'weather' ? 'bg-zinc-800 text-white border-l-2 border-emerald-500 -ml-[2px]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <CloudSun className="size-4" /> Weather
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('tips')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === 'tips' ? 'bg-zinc-800 text-white border-l-2 border-emerald-500 -ml-[2px]' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                >
                  <HelpCircle className="size-4" /> Local Tips
                </button>
              </li>
            </ul>
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="bg-zinc-800/50 rounded-lg p-3">
            <div className="text-sm font-semibold text-white truncate">
              {itinerary.plan.region}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {itinerary.plan.arrivalDate.toLocaleDateString()} - {itinerary.plan.leaveDate.toLocaleDateString()}
            </div>
            <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400">
              In progress
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">
        {activeTab === 'schedule' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">{itinerary.plan.region} itinerary</h1>
              <p className="text-zinc-400">
                {itinerary.plan.arrivalDate.toLocaleDateString()} - {itinerary.plan.leaveDate.toLocaleDateString()} · Click any activity to see its location and route
              </p>
            </div>
            <ItineraryTimeline
              days={itinerary.days}
              region={itinerary.plan.region}
              onViewOnMap={handleViewOnMap}
              onSwapActivity={handleSwapActivity}
              hotelRecommendation={itinerary.hotelRecommendation}
              onSwapHotel={handleSwapHotel}
            />
          </div>
        )}

        {activeTab === 'map' && (
          <MapTab
            days={itinerary.days}
            selectedActivity={selectedActivity}
            onActivitySelect={(act) => setSelectedActivity(act)}
            onBack={() => setActiveTab('schedule')}
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
          <TipsTab insights={itinerary.insights} region={itinerary.plan.region} />
        )}
      </main>
    </div>
  );
}
