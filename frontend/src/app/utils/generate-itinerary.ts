import type { TravelPlan, GeneratedItinerary } from "../types/travel";

export async function generateItinerary(plan: TravelPlan): Promise<GeneratedItinerary> {
  const resp = await fetch("/api/itinerary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || "Failed to generate itinerary");
  }

  return resp.json();
}
