export interface TravelPlan {
  region: string;
  arrivalDate: Date;
  leaveDate: Date;
  hobbies: string[];
  favoriteFood: string[];
  restaurantPreferences: string[];
  placePreferences: string[];
  budget?: string;
  whoTraveling?: string;
}

export interface ActivityAlternative {
  title: string;
  location: string;
  description: string;
  place?: {
    placeId: string;
    address: string;
    lat: number;
    lng: number;
    rating?: number;
    mapsUrl: string;
  };
}

export interface ItineraryActivity {
  time: string;
  title: string;
  description: string;
  category: "food" | "museum" | "exhibition" | "nature" | "activity" | "rest";
  location: string;
  place?: {
    placeId: string;
    address: string;
    lat: number;
    lng: number;
    rating?: number;
    mapsUrl: string;
  };
  travelTimeFromPrevious?: string;
  alternatives?: ActivityAlternative[];
  cost?: number;
}

export interface DayItinerary {
  date: Date;
  dayNumber: number;
  activities: ItineraryActivity[];
  backupTip?: string;
}

// Items may be plain strings (older trips) or reasoned objects (new prompt).
export type PackingEntry = string | { name: string; why?: string };

export interface WeatherDay {
  d: string;           // e.g. "Mon 12"
  icon: string;        // sunny | partly | cloudy | rainy | snowy | stormy
  hi: number;
  lo: number;
  note: string;
}

export interface PackingItem {
  category: string;
  items: PackingEntry[];
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
  pricePerNight?: number;
}

export interface ExpandedLogisticsGuide {
  connectivity: string;
  transitCards: string;
}

export interface GeneratedItinerary {
  plan: TravelPlan;
  days: DayItinerary[];
  packingList?: PackingItem[];
  flights?: FlightOption[];
  insights?: {
    weatherOverview: string;
    weatherWeek?: WeatherDay[];   // seasonal-typical daily estimates
    culturalTips: string[];
    safetyTips: string[];
    customsRestrictions?: string[];
    emergencyNumbers?: {
      police: string;
      ambulance: string;
      fire: string;
      touristPolice?: string;
    };
    safeNeighborhoods?: string[];
    commonScams?: string[];
    budgetSummary?: {
      totalEstimatedCost: number;
      breakdown: { category: string; amount: number }[];
      fitsStatedBudget: string;
    };
  };
  hotelRecommendation?: HotelRecommendation;
  logisticsGuide?: ExpandedLogisticsGuide; // New Hook for Day-One logistics
}