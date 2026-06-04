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
  X
} from 'lucide-react';

export default function Itinerary() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'map' | 'flights' | 'packing' | 'weather' | 'tips'>((searchParams.get('tab') as any) || 'schedule');
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
          ]
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

  // Set the hotel recommendation as the default active detail panel view
  useEffect(() => {
    if (itinerary?.hotelRecommendation && !selectedDetail) {
      setSelectedDetail({ type: 'hotel', hotel: itinerary.hotelRecommendation });
    }
  }, [itinerary]);

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
    if (targetActivity) {
      setSelectedDetail({
        type: 'activity',
        activity: targetActivity,
        dayNumber,
        activityIdx
      });
    }

    try {
      const resp = await fetch(`/api/place-lookup?query=${encodeURIComponent(targetActivity!.location)}&region=${encodeURIComponent(itinerary.plan.region)}`);
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

          const targetUpdated = finalizedDays.find(d => d.dayNumber === dayNumber)?.activities[activityIdx];
          if (targetUpdated) {
            setSelectedDetail({
              type: 'activity',
              activity: targetUpdated,
              dayNumber,
              activityIdx
            });
          }
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
    setSelectedDetail({ type: 'hotel', hotel: newHotel });
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
      <main className="ml-64 flex-1 p-8 h-screen overflow-y-auto pb-24">
        {activeTab === 'schedule' && (
          <div className="flex gap-8 max-w-6xl mx-auto items-start relative">
            <div className="flex-1 min-w-0">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 capitalize">{itinerary.plan.region} Itinerary</h1>
                <p className="text-zinc-400">
                  {itinerary.plan.arrivalDate.toLocaleDateString()} - {itinerary.plan.leaveDate.toLocaleDateString()} · Click any activity to view alternatives and details
                </p>
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
                        {selectedDetail.activity.travelTimeFromPrevious && (
                          <Badge variant="outline" className="bg-zinc-950/80 text-zinc-400 border-zinc-800 text-[10px] py-0.5 px-2">
                            ⏱ {selectedDetail.activity.travelTimeFromPrevious}
                          </Badge>
                        )}
                      </div>
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
