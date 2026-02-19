import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { TravelPlan, GeneratedItinerary } from '../types/travel';
import { generateItinerary } from '../utils/generate-itinerary';
import { ItineraryTimeline } from '../components/itinerary-timeline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, MapPin, Calendar, Users, Download, Share2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function Itinerary() {
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);

  useEffect(() => {
    const planData = sessionStorage.getItem("travelPlan");
    if (!planData) {
      navigate("/");
      return;
    }

    const plan: TravelPlan = JSON.parse(planData);
    plan.arrivalDate = new Date(plan.arrivalDate);
    plan.leaveDate = new Date(plan.leaveDate);

    (async () => {
      try {
        const generated = await generateItinerary(plan);
        setItinerary(generated); // ✅ if backend returns {plan, days}
      } catch (e) {
        console.error(e);
        // optional: show an error UI state
      }
    })();
  }, [navigate]);

  if (!itinerary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating your personalized itinerary...</p>
        </div>
      </div>
    );
  }

  const { plan, days } = itinerary;
  const duration = differenceInDays(plan.leaveDate, plan.arrivalDate) + 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Planning
        </Button>

        {/* Trip Summary */}
        <Card className="mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Your AI-Generated Itinerary</h1>
            <div className="flex items-center gap-2 text-blue-50">
              <MapPin className="size-5" />
              <span className="text-xl">{plan.region}</span>
            </div>
          </div>
          
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="flex items-start gap-3">
                <Calendar className="size-5 text-blue-600 mt-1" />
                <div>
                  <div className="text-sm text-gray-600 mb-1">Travel Dates</div>
                  <div className="font-semibold">
                    {format(plan.arrivalDate, 'MMM d')} - {format(plan.leaveDate, 'MMM d, yyyy')}
                  </div>
                  <div className="text-sm text-gray-600">{duration} days trip</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="size-5 text-purple-600 mt-1" />
                <div>
                  <div className="text-sm text-gray-600 mb-1">Your Interests</div>
                  <div className="flex flex-wrap gap-1">
                    {plan.hobbies.length > 0 ? (
                      plan.hobbies.slice(0, 3).map((hobby, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {hobby}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">General exploration</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="size-5 text-green-600 mt-1" />
                <div>
                  <div className="text-sm text-gray-600 mb-1">Places</div>
                  <div className="flex flex-wrap gap-1">
                    {plan.placePreferences.length > 0 ? (
                      plan.placePreferences.slice(0, 3).map((place, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs capitalize">
                          {place}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">All attractions</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1">
                <Download className="mr-2 size-4" />
                Download PDF
              </Button>
              <Button variant="outline" className="flex-1">
                <Share2 className="mr-2 size-4" />
                Share Itinerary
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Daily Itinerary */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Day-by-Day Schedule</h2>
          <p className="text-gray-600 mb-6">
            Your personalized itinerary with activities tailored to your preferences
          </p>
          <ItineraryTimeline days={days} />
        </div>

        {/* Bottom Actions */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle>Ready to adjust your plan?</CardTitle>
            <CardDescription>
              You can go back and modify your preferences to regenerate a new itinerary
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} size="lg">
              <ArrowLeft className="mr-2 size-4" />
              Create New Itinerary
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
