import type { TravelPlan, GeneratedItinerary } from "../types/travel";

export async function generateItinerary(plan: TravelPlan, chatHistory?: any[]): Promise<GeneratedItinerary> {
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

  return resp.json();
}
