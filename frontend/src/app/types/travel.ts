export interface TravelPlan {
  region: string;
  arrivalDate: Date;
  leaveDate: Date;
  hobbies: string[];
  favoriteFood: string[];
  restaurantPreferences: string[];
  placePreferences: string[];
}

export interface ActivityAlternative {
  title: string;
  location: string;
  description: string;
}

export interface ItineraryActivity {
  time: string;
  title: string;
  description: string;
  category: "food" | "museum" | "exhibition" | "nature" | "activity" | "rest";
  location: string;

  // optional info returned from backend (Google Places lookup)
  place?: {
    placeId: string;
    address: string;
    lat: number;
    lng: number;
    mapsUrl: string;
  };
  travelTimeFromPrevious?: string;
  alternatives?: ActivityAlternative[];
}

export interface DayItinerary {
  date: Date;
  dayNumber: number;
  activities: ItineraryActivity[];
}

export interface PackingItem {
  category: string;
  items: string[];
}

export interface FlightOption {
  id: number;
  airline: string;
  price: number;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: string;
  tags: string[];
  aiReasoning: string;
}

export interface HotelAlternative {
  name: string;
  neighborhood: string;
  reasoning: string;
}

export interface HotelRecommendation {
  name: string;
  neighborhood: string;
  reasoning: string;
  alternatives?: HotelAlternative[];
}

export interface GeneratedItinerary {
  plan: TravelPlan;
  days: DayItinerary[];
  packingList?: PackingItem[];
  flights?: FlightOption[];
  insights?: {
    weatherOverview: string;
    culturalTips: string[];
    safetyTips: string[];
    customsRestrictions?: string[];
  };
  hotelRecommendation?: HotelRecommendation;
}
