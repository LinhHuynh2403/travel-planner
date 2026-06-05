import type { TravelPlan, GeneratedItinerary } from "../types/travel";

// ═══════════════════════════════════════════════════════════════
//  EXTENDED TYPES FOR THE NEW LOGISTICS & SPONTANEITY FEATURES
// ═══════════════════════════════════════════════════════════════
export interface ExpandedLogisticsGuide {
  connectivity: string;  // Detailed steps for local SIM / eSIM setups
  transitCards: string;  // Explicit payment/card guidelines (T-Money, Suica, etc.)
}

export interface JourZyItineraryResponse extends GeneratedItinerary {
  logisticsGuide?: ExpandedLogisticsGuide;
  // This explicitly maps to the safety guidelines and custom packing rules
  insights: {
    weatherOverview: string;
    culturalTips: string[];
    safetyTips: string[];
    customsRestrictions: string[];
  };
}

/**
 * Triggers the main backend engine to parse the user's conversational profile history 
 * and pre-fetched map coordinates into a unified, rich travel itinerary object.
 */
export async function generateItinerary(
  plan: TravelPlan,
  chatHistory?: any[]
): Promise<JourZyItineraryResponse> {
  const API_BASE = import.meta.env.VITE_API_URL || "";

  const resp = await fetch(`${API_BASE}/api/itinerary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, chatHistory }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || "Failed to generate itinerary");
  }

  // Cast cleanly to our upgraded, feature-rich interface payload
  return resp.json() as Promise<JourZyItineraryResponse>;
}

/**
 * FEATURE 10: Spontaneous Location Hot-Swap Function
 * Directly captures live device GPS coordinates and returns nearby alternatives 
 * filtered beautifully by the user's personal travel style/persona.
 */
export async function fetchSpontaneousBackup(
  latitude: number,
  longitude: number,
  userVibePreference: string
): Promise<any> {
  const API_BASE = import.meta.env.VITE_API_URL || "";

  const resp = await fetch(
    `${API_BASE}/api/nearby?lat=${latitude}&lng=${longitude}&keyword=${encodeURIComponent(userVibePreference)}`
  );

  if (!resp.ok) {
    throw new Error("Could not fetch spontaneous local alternatives");
  }

  return resp.json();
}