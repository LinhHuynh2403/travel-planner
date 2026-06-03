import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Plane, ExternalLink, Settings2, MapPin } from 'lucide-react';
import { GeneratedItinerary } from '../types/travel';

interface FlightsTabProps {
  itinerary: GeneratedItinerary;
}

export function FlightsTab({ itinerary }: FlightsTabProps) {
  const [origin, setOrigin] = useState("San Francisco (SFO)");
  const [flightClass, setFlightClass] = useState("Economy");

  const region = itinerary.plan.region;
  const depDate = itinerary.plan.arrivalDate;
  const retDate = itinerary.plan.leaveDate;

  const departureDateStr = depDate ? new Date(depDate).toISOString().split('T')[0] : '';
  const returnDateStr = retDate ? new Date(retDate).toISOString().split('T')[0] : '';

  const cleanDestination = region.split(',')[0].trim();

  const getGoogleFlightsUrl = () => {
    return `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(cleanDestination)}%20from%20${encodeURIComponent(origin)}%20on%20${departureDateStr}%20through%20${returnDateStr}`;
  };

  return (
    <div className="flex gap-6 max-w-5xl mx-auto h-[calc(100vh-2rem)]">
      {/* Main Flights Search Panel */}
      <div className="flex-1 flex flex-col justify-center items-center">
        <Card className="bg-zinc-900 border-zinc-800 text-white w-full max-w-md">
          <CardContent className="p-8 text-center flex flex-col items-center">
            <Plane className="mx-auto mb-4 text-emerald-400 size-12" />

            <h3 className="text-xl font-semibold mb-3 text-white">
              Find Live Flights
            </h3>

            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Flight prices change constantly. Search live flight deals from <span className="text-emerald-400 font-medium">{origin}</span> to <span className="text-emerald-400 font-medium">{cleanDestination}</span> using trusted booking platforms:
            </p>

            <div className="flex flex-col gap-3 w-full">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-zinc-950 font-bold py-6 flex items-center justify-center gap-2 w-full"
                onClick={() => window.open(getGoogleFlightsUrl(), '_blank')}
              >
                Google Flights <ExternalLink className="size-4" />
              </Button>

              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-zinc-950 font-bold py-6 flex items-center justify-center gap-2 w-full"
                onClick={() =>
                  window.open(
                    `https://www.expedia.com/Flights`,
                    '_blank'
                  )
                }
              >
                Expedia <ExternalLink className="size-4" />
              </Button>

              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-zinc-950 font-bold py-6 flex items-center justify-center gap-2 w-full"
                onClick={() =>
                  window.open(
                    `https://www.skyscanner.com`,
                    '_blank'
                  )
                }
              >
                Skyscanner <ExternalLink className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Panel */}
      <div className="w-80 shrink-0">
        <Card className="bg-zinc-900 border-zinc-800 text-white h-full sticky top-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings2 className="text-zinc-400" />
              <h3 className="font-semibold text-lg">My travel style</h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-2 flex items-center gap-1">
                  <MapPin className="size-3.5 text-zinc-500" /> Flying From (Origin)
                </label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. San Francisco (SFO)"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-white outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Destination</label>
                <input
                  type="text"
                  value={cleanDestination}
                  disabled
                  className="w-full bg-zinc-950/50 border border-zinc-850 rounded-md p-2 text-zinc-500 text-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Seat Preference</label>
                <select
                  value={flightClass}
                  onChange={(e) => setFlightClass(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-white outline-none focus:border-emerald-500 text-sm"
                >
                  <option>Economy</option>
                  <option>Premium Economy</option>
                  <option>Business</option>
                  <option>First Class</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Max Layover Tolerance</label>
                <select className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-white outline-none focus:border-emerald-500 text-sm">
                  <option>No layovers (Non-stop only)</option>
                  <option>Up to 2 hours</option>
                  <option>Up to 4 hours</option>
                  <option>Any duration</option>
                </select>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-zinc-950 font-bold"
                  onClick={() => window.open(getGoogleFlightsUrl(), '_blank')}
                >
                  Search Live on Google Flights
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
