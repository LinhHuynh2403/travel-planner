import { TravelForm } from '../components/travel-form';
import { Plane, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Plane className="size-12 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Travel Planner
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Let our AI create a personalized itinerary based on your preferences, hobbies, and favorite activities
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Sparkles className="size-5 text-purple-500" />
            <span className="text-sm text-gray-500">Powered by AI recommendations</span>
          </div>
        </div>

        <TravelForm />
      </div>
    </div>
  );
}
