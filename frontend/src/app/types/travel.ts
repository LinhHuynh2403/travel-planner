export interface TravelPlan {
  region: string;
  // Left unset from onboarding — the backend derives the real dates from the
  // free-text chat history (see extractPlanFromChatHistory), since users type
  // relative dates like "next Thursday for a week" that a fixed offset can't
  // capture. Only ever a plain string once resolved.
  arrivalDate?: Date | string;
  leaveDate?: Date | string;
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
  place?: {
    placeId: string;
    address: string;
    lat: number;
    lng: number;
    rating?: number;
    mapsUrl: string;
  };
}

export interface ExpandedLogisticsGuide {
  connectivity: string;
  transitCards: string;
  bookingTips?: string;
  airportToStay?: string;
  gettingAround?: string;
  luggageStorage?: string;
  mobilityNotes?: string;
  airlinePoints?: string;
}

export interface GeneratedItinerary {
  // The saved trip's backend row id — present once a trip has actually been
  // persisted (via openTrip from History/My Plan, or right after a fresh
  // generation saves it). Lets Reschedule replace the same trip instead of
  // creating a duplicate. Undefined for a trip that hasn't been saved yet.
  tripId?: string;
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
    currency?: { name: string; why: string };
    keyPhrases?: { en: string; local: string; say: string }[];
    timezoneNote?: string;
    budgetSummary?: {
      totalEstimatedCost: number;
      breakdown: { category: string; amount: number }[];
      fitsStatedBudget: string;
    };
  };
  hotelRecommendation?: HotelRecommendation;
  logisticsGuide?: ExpandedLogisticsGuide; // New Hook for Day-One logistics
}