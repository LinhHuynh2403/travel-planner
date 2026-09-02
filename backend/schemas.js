import { z } from "zod";

// ── Google Places ─────────────────────────────────────────────────────────
// Raw shapes returned by the Places Text Search and Place Details endpoints.
// Kept loose (most fields optional, .passthrough() on nested objects) since
// Google's own response frequently omits fields per-result (no rating yet,
// no price_level for a non-commercial landmark, etc.) — the goal is to catch
// a structurally broken/unexpected response, not to reject a normal one.

const latLngSchema = z.object({
  lat: z.number(),
  lng: z.number(),
}).passthrough();

const placesGeometrySchema = z.object({
  location: latLngSchema,
}).passthrough();

const placePhotoSchema = z.object({
  photo_reference: z.string(),
}).passthrough();

export const placesResultItemSchema = z.object({
  place_id: z.string(),
  name: z.string(),
  formatted_address: z.string().optional(),
  rating: z.number().optional(),
  user_ratings_total: z.number().optional(),
  price_level: z.number().optional(),
  geometry: placesGeometrySchema.optional(),
  photos: z.array(placePhotoSchema).optional(),
}).passthrough();

export const placesTextSearchResponseSchema = z.object({
  status: z.string().optional(),
  results: z.array(placesResultItemSchema).optional(),
}).passthrough();

export const placeDetailsResultSchema = z.object({
  name: z.string().optional(),
  formatted_address: z.string().optional(),
  geometry: placesGeometrySchema.optional(),
  opening_hours: z.record(z.string(), z.unknown()).optional(),
  rating: z.number().optional(),
  user_ratings_total: z.number().optional(),
  price_level: z.number().optional(),
  photos: z.array(placePhotoSchema).optional(),
}).passthrough();

export const placeDetailsResponseSchema = z.object({
  status: z.string().optional(),
  result: placeDetailsResultSchema.optional(),
}).passthrough();

// ── Open-Meteo (weather) ─────────────────────────────────────────────────
// Only the arrays the app actually depends on (day/hour count, temps, codes)
// are required — everything else is passed through untouched so the
// frontend keeps getting every field it already reads (units, timezone,
// elevation, etc.) even though this schema doesn't name them individually.

export const openMeteoGeocodeResponseSchema = z.object({
  results: z.array(z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).passthrough()).optional(),
}).passthrough();

export const openMeteoForecastResponseSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_max: z.array(z.number()),
    temperature_2m_min: z.array(z.number()),
    weather_code: z.array(z.number()),
  }).passthrough(),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: z.array(z.number()),
  }).passthrough(),
}).passthrough();

// ── Itinerary (LLM-generated) ─────────────────────────────────────────────
// This is the highest-risk source in the app: free-text JSON from a model,
// not an API with a fixed contract. Validation here is deliberately
// strict on the load-bearing skeleton that enrichItineraryPlaces() and
// normalizeItineraryDates() iterate over (days/activities arrays,
// dayNumber, title, category) — a bad shape there breaks the entire
// itinerary render, not just one field. Everything else (insights,
// logisticsGuide, packingList copy) stays loose/passthrough: those are
// cosmetic text fields where a missing one degrades gracefully instead of
// crashing a .map()/.sort() call.

const placeRefSchema = z.object({
  placeId: z.string().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  mapsUrl: z.string().optional(),
  rating: z.number().optional(),
  userRatingsTotal: z.number().optional(),
  priceLevel: z.number().optional(),
  photoReference: z.string().optional(),
}).passthrough();

const alternativeActivitySchema = z.object({
  title: z.string(),
  location: z.string().optional(),
  description: z.string().optional(),
  place: placeRefSchema.optional(),
}).passthrough();

const activitySchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  category: z.string(),
  location: z.string().optional(),
  travelTimeFromPrevious: z.string().optional(),
  cost: z.number().optional(),
  requested: z.boolean().optional(),
  place: placeRefSchema.optional(),
  alternatives: z.array(alternativeActivitySchema).optional(),
}).passthrough();

const daySchema = z.object({
  date: z.string().optional(),
  dayNumber: z.number(),
  activities: z.array(activitySchema),
  backupTip: z.string().optional(),
}).passthrough();

const hotelAlternativeSchema = z.object({
  name: z.string(),
  neighborhood: z.string().optional(),
  reasoning: z.string().optional(),
}).passthrough();

const hotelRecommendationSchema = z.object({
  name: z.string(),
  neighborhood: z.string().optional(),
  reasoning: z.string().optional(),
  checkInNote: z.string().optional(),
  pricePerNight: z.number().optional(),
  alternatives: z.array(hotelAlternativeSchema).optional(),
}).passthrough();

// culturalTips/safetyTips/customsRestrictions are rendered as plain text
// directly in the Guide tab (see guide-view.tsx) -- the model has, on
// occasion, emitted these as objects (e.g. {item, restriction}) instead of
// strings, which parses as valid JSON and passed the old fully-loose
// insights schema, but crashes React when rendered as a child. Pinning
// these three to string[] rejects that shape here and triggers the existing
// retry loop, instead of saving a trip that permanently crashes its own
// Guide tab. Everything else in insights stays loose/passthrough.
const insightsSchema = z.object({
  culturalTips: z.array(z.string()).optional(),
  safetyTips: z.array(z.string()).optional(),
  customsRestrictions: z.array(z.string()).optional(),
}).passthrough();

export const itinerarySchema = z.object({
  hotelRecommendation: hotelRecommendationSchema.optional(),
  plan: z.record(z.string(), z.unknown()).optional(),
  days: z.array(daySchema).min(1),
  packingList: z.array(z.unknown()).optional(),
  insights: insightsSchema.optional(),
  logisticsGuide: z.record(z.string(), z.unknown()).optional(),
}).passthrough();
