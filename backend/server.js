import express from "express";
import cors from "cors";
import "dotenv/config";
import rateLimit from "express-rate-limit";
import { supabase } from "./db.js";
import fetch from "node-fetch";
import { getSystemChatInstruction, getDeterministicGeneratorPrompt, getItineraryChatInstruction, getPastTripChatInstruction, getRescheduleChatInstruction, getLanguageInstruction, getLanguageMatchInstruction, BOOKING_GUIDANCE, FLIGHT_GUIDANCE, getActivitySuggestionPrompt, getFlightSuggestionPrompt } from "./prompts.js";

const app = express();

// Needed so express-rate-limit sees the real client IP behind Render/Railway/Vercel proxies
app.set("trust proxy", 1);

// ── SECURITY: CORS locked to known frontend origins ──────────────────────────
// Set ALLOWED_ORIGINS in the deployment's env vars (e.g. Render dashboard),
// comma-separated — NOT in a committed .env, since the deployed frontend
// origin can change across redeploys. Current production frontend:
// ALLOWED_ORIGINS=https://travel-planner-ai-five-peach.vercel.app,http://localhost:5173
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,http://localhost:4173")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser tools / same-origin requests with no Origin header, and all localhost origins
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:")) return callback(null, true);
    // The bare "Not allowed by CORS" error gives no way to tell a typo in
    // ALLOWED_ORIGINS apart from a genuinely different origin — log exactly
    // what was rejected against exactly what's currently allowed.
    console.warn(`CORS rejected origin "${origin}". Currently allowed: ${allowedOrigins.join(", ")}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json({ limit: "1mb" }));

// ── SECURITY: rate limiting ───────────────────────────────────────────────────
// Global limiter: generous, protects every endpoint from hammering.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                 // 300 requests / 15 min / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});
app.use(globalLimiter);

// Strict limiter for endpoints that trigger paid LLM / Places calls.
const expensiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,                  // 20 generations or chats / hour / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit reached for AI features. Try again in a bit." },
});

// ── SECURITY: Supabase JWT auth middleware ────────────────────────────────────
// The frontend must send the logged-in user's access token:
//   headers: { Authorization: `Bearer ${session.access_token}` }
// We derive the user id from the verified token — NEVER from the request body.
async function verifyToken(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

// Hard requirement: rejects the request if not logged in.
async function requireAuth(req, res, next) {
  const user = await verifyToken(req);
  if (!user) return res.status(401).json({ error: "Authentication required" });
  req.user = user;
  next();
}

// Soft: attaches req.user if a valid token is present, continues either way.
async function optionalAuth(req, res, next) {
  req.user = await verifyToken(req);
  next();
}

// ── Input validation helpers ──────────────────────────────────────────────────
const MAX_TRIP_DAYS = 30;
const MAX_CHAT_MESSAGES = 60;

function isValidDateStr(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s));
}

function validatePlanDates(plan) {
  if (!isValidDateStr(plan.arrivalDate) || !isValidDateStr(plan.leaveDate)) {
    return "arrivalDate and leaveDate must be valid YYYY-MM-DD dates";
  }
  const days =
    Math.floor((new Date(plan.leaveDate) - new Date(plan.arrivalDate)) / (1000 * 60 * 60 * 24)) + 1;
  if (days < 1) return "leaveDate must be on or after arrivalDate";
  if (days > MAX_TRIP_DAYS) return `Trips longer than ${MAX_TRIP_DAYS} days are not supported`;
  return null;
}

function buildPrompt(plan, chatHistory, realPlaces = {}, memoryProfile = null) {
  const durationDays =
    Math.floor((new Date(plan.leaveDate) - new Date(plan.arrivalDate)) / (1000 * 60 * 60 * 24)) + 1;

  const chatContext = chatHistory && chatHistory.length > 0
    ? `Conversation history regarding user specifications:\n${chatHistory.filter(m => m).map(m => `${(m.role || 'user').toUpperCase()}: ${m.text || ''}`).join('\n')}`
    : `Hobbies: ${plan.hobbies?.join(', ')}`;

  return getDeterministicGeneratorPrompt(plan, durationDays, chatContext, realPlaces, memoryProfile);
}

// NOTE: removed getUserLocation() — it was unused and geolocated the SERVER's IP
// (not the user's) via ip-api.com, whose free tier prohibits commercial use.

function capitalizeRegion(region) {
  if (!region) return "";
  return region
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}


function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in model output");
  return text.slice(start, end + 1);
}

// SAFETY NET: never trust the model's own date arithmetic — it has
// repeatedly hallucinated wrong years (e.g. "2024" for a 2026 trip) and, for
// long trips, sampled a handful of representative days (day 1, 8, 15) instead
// of enumerating every day. Deterministically overwrite each day's "date"
// from the validated arrivalDate + dayNumber offset, so the displayed dates
// are always correct even when the model's day count or math is wrong. This
// can't fabricate missing days' activities, so a day-count mismatch is only
// logged for visibility — the actual fix for that lives in the prompt.
function normalizeItineraryDates(itinerary, plan, durationDays) {
  if (!itinerary?.days || !Array.isArray(itinerary.days)) return itinerary;

  const arrival = new Date(plan.arrivalDate + "T00:00:00Z");
  itinerary.days = itinerary.days
    .slice()
    .sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0))
    .map(day => {
      if (!day.dayNumber) return day;
      const real = new Date(arrival);
      real.setUTCDate(real.getUTCDate() + (day.dayNumber - 1));
      return { ...day, date: real.toISOString().split("T")[0] };
    });

  if (itinerary.days.length !== durationDays) {
    console.warn(
      `Itinerary day-count mismatch for ${plan.region}: requested ${durationDays} days, model returned ${itinerary.days.length}.`
    );
  }

  // The plan echo is meant to mirror the validated request, not whatever the
  // model may have drifted to while reasoning about dates.
  if (itinerary.plan) {
    itinerary.plan.arrivalDate = plan.arrivalDate;
    itinerary.plan.leaveDate = plan.leaveDate;
  }

  return itinerary;
}

const tools = [
  {
    functionDeclarations: [
      {
        name: 'get_weather',
        description: 'Get weather forecast for a city during travel dates.',
        parameters: {
          type: 'OBJECT',
          properties: {
            city: { type: 'STRING', description: 'City name e.g. Tokyo' },
            country: { type: 'STRING', description: 'Country name e.g. Japan' },
          },
          required: ['city'],
        },
      },
      {
        name: 'search_places',
        description: 'Search for restaurants, attractions, or hotels in a city.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'e.g. best ramen in Shinjuku' },
            city: { type: 'STRING', description: 'City to search in' },
          },
          required: ['query', 'city'],
        },
      },
      {
        name: 'get_place_details',
        description: 'Get address and details for a specific place by its Google Place ID.',
        parameters: {
          type: 'OBJECT',
          properties: {
            place_id: { type: 'STRING', description: 'Google Place ID' },
          },
          required: ['place_id'],
        },
      },
    ],
  },
];

async function getWeather(city, country) {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return { error: "Weather API key missing" };
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city + ',' + (country || ''))}&units=metric&appid=${key}`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    return data;
  } catch (e) {
    return { error: String(e) };
  }
}

async function searchPlaces(query, city) {
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key) return { error: "Maps API key missing" };
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + " " + city)}&key=${key}`;
  try {
    const resp = await fetch(searchUrl);
    const data = await resp.json();
    // Slightly more than the "top pick" ever needs — the itinerary chat's
    // <<SUGGEST>> resolution reasons over a few real candidates (spatial fit,
    // budget) rather than blindly trusting whichever result Google ranked
    // first; see getActivitySuggestionPrompt in prompts.js.
    return data.results ? data.results.slice(0, 6) : data;
  } catch (e) {
    return { error: String(e) };
  }
}

// Pure enrichment on top of the <<SUGGEST>> flow: given several REAL,
// verified Places candidates, asks the model to pick the single best one
// with genuine spatial/budget/mood reasoning instead of just trusting
// whichever result Google ranked first. Never a hard dependency — any
// failure here (missing key, bad JSON, no matching placeId) returns null
// and the caller falls back to the original top-ranked result.
async function synthesizeBestSuggestion(traveler, request, candidates, currentDayPlan) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || !Array.isArray(candidates) || candidates.length < 2) return null;
  try {
    const verifiedPlacesJson = JSON.stringify(candidates.map(c => ({
      placeId: c.place_id, name: c.name, address: c.formatted_address || "", rating: c.rating,
      lat: c.geometry?.location?.lat, lng: c.geometry?.location?.lng,
    })));
    const prompt = getActivitySuggestionPrompt(traveler, request, verifiedPlacesJson, currentDayPlan || "(not specified)");
    // gemini-3.1-flash-lite — reverted from gemini-3-flash-preview (2026-07-10):
    // confirmed live, repeatedly, that the preview model is under heavy
    // capacity overload (503 "high demand"), which was making every request
    // fall through to a much slower OpenRouter fallback. flash-lite is a
    // stable GA model with no such issue.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 300, thinkingConfig: { thinkingBudget: 0 } },
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const match = raw.match(/<<SUGGEST>>([\s\S]*?)<<END>>/);
    if (!match) return null;
    const parsed = JSON.parse(match[1]);
    const picked = candidates.find(c => c.place_id === parsed.placeId);
    if (!picked) return null;
    return { picked, why: parsed.why, cost: parsed.cost, travelTimeFromPlan: parsed.travelTimeFromPlan, swapsOut: parsed.swapsOut };
  } catch (e) {
    console.warn("Activity suggestion synthesis failed, falling back to top result:", e.message);
    return null;
  }
}

// A few country names the model is likely to abbreviate that don't
// substring-match Travelpayouts' full country_name (e.g. "USA" vs "United
// States") — expand the common ones so the country filter below still hits.
const COUNTRY_ALIASES = { usa: "united states", us: "united states", uk: "united kingdom", uae: "united arab emirates" };

// Resolves a free-text "City" or "City, Country" string (per FLIGHT_SEARCH_HANDOFF
// in prompts.js) to the IATA city/airport code Travelpayouts' fare endpoints
// require. No token needed for this specific autocomplete API.
//
// IMPORTANT: query the autocomplete API with the city name ALONE — querying
// with "City, Country" together (e.g. "Tokyo, Japan") empirically returns
// EMPTY results for most real cities (Paris/France, London/United Kingdom,
// New York/USA, Hanoi/Vietnam all failed in testing), even though the
// country suffix is exactly what the API's own response calls it. Instead,
// query the city alone (which reliably returns several same-named-city
// candidates worldwide — e.g. "San Jose" returns both San Jose, USA and San
// Jose, Costa Rica) and use the country to pick the right one from that list.
async function resolveIataCode(cityName) {
  try {
    const [cityPart, countryPartRaw] = cityName.split(",").map(s => s?.trim());
    const url = `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(cityPart)}&locale=en&types[]=city&types[]=airport`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const results = await resp.json();
    if (!Array.isArray(results) || results.length === 0) return null;

    if (countryPartRaw) {
      const countryPart = (COUNTRY_ALIASES[countryPartRaw.toLowerCase()] || countryPartRaw).toLowerCase();
      const match = results.find(r =>
        (r.country_name || "").toLowerCase().includes(countryPart) ||
        countryPart.includes((r.country_name || "").toLowerCase())
      );
      if (match) return match.code;
    }
    // No country given, or none of the candidates matched it — fall back to
    // the API's own top-ranked (highest-weight) result.
    return results[0].code;
  } catch (e) {
    console.warn("IATA code lookup failed:", e.message);
    return null;
  }
}

// Travelpayouts' fare feed only gives a 2-letter IATA airline code (e.g.
// "VN"), not a human-readable name — resolve it via their free, unauthenticated
// airline reference list so the traveler sees "Vietnam Airlines" instead of a
// bare code. Fetched once per server process and cached in memory since this
// reference data changes essentially never.
let airlineNameCache = null;
async function getAirlineName(code) {
  if (!code) return code;
  try {
    if (!airlineNameCache) {
      const resp = await fetch("https://api.travelpayouts.com/data/en/airlines.json");
      const list = resp.ok ? await resp.json() : [];
      airlineNameCache = new Map(list.map(a => [a.code, a.name]));
    }
    return airlineNameCache.get(code) || code;
  } catch (e) {
    console.warn("Airline name lookup failed:", e.message);
    return code;
  }
}

// Cached lowest-fare data (NOT a live bookable quote — see the NOTE above
// getFlightSuggestionPrompt in prompts.js for exactly what fields this feed
// does/doesn't have) from Travelpayouts' free v1/prices/cheap endpoint.
// Returns the raw { "<transfers>": {price, airline, flight_number,
// departure_at, return_at, expires_at, duration_to, duration_back} } map for
// the given route, or {}.
async function fetchCheapFlights(originIata, destIata, departDate, returnDate, token) {
  const params = new URLSearchParams({
    origin: originIata, destination: destIata, depart_date: departDate,
    currency: "usd", token,
  });
  if (returnDate) params.set("return_date", returnDate);
  const resp = await fetch(`https://api.travelpayouts.com/v1/prices/cheap?${params.toString()}`);
  if (!resp.ok) return {};
  const data = await resp.json();
  return data?.data?.[destIata] || {};
}

async function searchCheapFlights(originIata, destIata, departDate, returnDate) {
  const token = process.env.TRAVELPAYOUTS_API_TOKEN;
  if (!token) return {};
  try {
    // Exact-day queries against this cached-fare feed are frequently empty
    // for anything but the busiest routes (confirmed empirically — a
    // specific 2026-10-12 date returned {} while the same route at
    // month-level granularity returned real cached fares). Try the exact
    // date first since it's the most relevant if present, then fall back to
    // the traveler's departure month so a real answer beats none.
    const exact = await fetchCheapFlights(originIata, destIata, departDate, returnDate, token);
    if (Object.keys(exact).length > 0) return exact;

    const departMonth = departDate.slice(0, 7);
    const returnMonth = returnDate ? returnDate.slice(0, 7) : null;
    return await fetchCheapFlights(originIata, destIata, departMonth, returnMonth, token);
  } catch (e) {
    console.warn("Flight price search failed:", e.message);
    return {};
  }
}

// Ranks/explains the real cached fares above via getFlightSuggestionPrompt —
// never invents a flight; only selects and reasons over what the API
// actually returned. Any failure here (missing key, bad JSON) returns null
// and the caller simply skips attaching a flight suggestion to the reply.
async function synthesizeFlightPicks(traveler, flightResultsJson, languageInstruction) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return null;
  try {
    const prompt = getFlightSuggestionPrompt(traveler, flightResultsJson, languageInstruction);
    // gemini-3.1-flash-lite — see synthesizeBestSuggestion above for why
    // this reverted off gemini-3-flash-preview (preview-model overload).
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 700, thinkingConfig: { thinkingBudget: 0 } },
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = JSON.parse(extractJson(raw));

    // Ground every pick in a REAL entry from the API results rather than
    // trusting the model's own echoed fields verbatim — match on
    // transfers+price (a specific number/small enum the model can't
    // plausibly hallucinate a false match for) and then overwrite
    // airline/flightNumber/dates from the matched entry itself. This is
    // deliberately more forgiving than requiring an exact string match on
    // "airline" and "flightNumber": the model was reliably writing out a
    // full airline name (e.g. "Vietnam Airlines") or a combined
    // code+number (e.g. "VN1234") instead of the feed's bare code ("VN")
    // and bare digits ("1234"), which silently failed a strict `===` check
    // and dropped every pick, leaving the traveler with a reply that never
    // showed any real flight details at all.
    const realEntries = Object.values(JSON.parse(flightResultsJson));
    const picks = [];
    for (const p of (parsed.picks || [])) {
      const match = realEntries.find(r => r.transfers === p.transfers && r.price === p.price);
      if (!match) continue;
      picks.push({
        ...p,
        price: match.price,
        transfers: match.transfers,
        airline: await getAirlineName(match.airline),
        flightNumber: `${match.airline}${match.flight_number}`,
        departureAt: match.departure_at || p.departureAt,
        returnAt: match.return_at || p.returnAt || undefined,
        durationMinutesOut: match.duration_to_minutes ?? p.durationMinutesOut,
      });
    }
    if (picks.length === 0) return null;
    return { picks, honestNote: parsed.honestNote, bookVia: parsed.bookVia };
  } catch (e) {
    console.warn("Flight suggestion synthesis failed:", e.message);
    return null;
  }
}

async function getPlaceDetails(place_id) {
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key) return { error: "Maps API key missing" };
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,formatted_address,geometry,opening_hours,rating,price_level&key=${key}`;
  try {
    const resp = await fetch(detailsUrl);
    const data = await resp.json();
    return data.result || data;
  } catch (e) {
    return { error: String(e) };
  }
}

async function runAgent(plan, chatHistory) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("No Gemini key provided");
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

  const realPlaces = await fetchRealPlaces(plan);
  const prompt = buildPrompt(plan, chatHistory, realPlaces);

  let contents = [
    {
      role: 'user',
      parts: [{ text: prompt }],
    }
  ];

  // SECURITY: cap agent iterations — an unbounded loop here means unbounded
  // paid Gemini + Places calls if the model keeps requesting tools.
  const MAX_AGENT_ITERATIONS = 6;
  for (let iteration = 0; iteration < MAX_AGENT_ITERATIONS; iteration++) {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        tools,
        generationConfig: { temperature: 0.4 }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error("Gemini error: " + err);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content) {
      throw new Error("Invalid response from Gemini");
    }

    const responseContent = candidate.content;
    contents.push(responseContent);

    const functionCalls = responseContent.parts.filter(p => p.functionCall);

    if (functionCalls.length === 0) {
      const textPart = responseContent.parts.find(p => p.text);
      return textPart ? textPart.text : '';
    }

    const toolResultParts = [];
    for (const part of functionCalls) {
      const { name, args } = part.functionCall;
      let result;

      if (name === 'get_weather') {
        result = await getWeather(args.city, args.country);
      } else if (name === 'search_places') {
        result = await searchPlaces(args.query, args.city);
      } else if (name === 'get_place_details') {
        result = await getPlaceDetails(args.place_id);
      }

      toolResultParts.push({
        functionResponse: {
          name,
          response: { result: result || {} },
        },
      });
    }

    contents.push({ role: 'user', parts: toolResultParts });
  }

  throw new Error("Agent exceeded maximum tool-call iterations without producing an answer");
}

async function getBestOllamaModel(preferredModel) {
  try {
    const res = await fetch("http://localhost:11434/api/tags");
    if (res.ok) {
      const data = await res.json();
      const installedModels = (data.models || []).map(m => m.name);

      if (installedModels.includes(preferredModel)) return preferredModel;

      const preferredBase = preferredModel.split(":")[0];
      const match = installedModels.find(m => m.startsWith(preferredBase) || m.includes(preferredBase));
      if (match) return match;

      const fallbacks = ["llama3.1:latest", "gemma3:latest", "llama3.2:latest", "llama3:latest"];
      for (const f of fallbacks) {
        if (installedModels.includes(f)) return f;
      }
      if (installedModels.length > 0) return installedModels[0];
    }
  } catch (e) {
    console.warn("Could not query Ollama models list:", e.message);
  }
  return preferredModel;
}

async function fetchRealPlaces(plan) {
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key) {
    console.warn("Google Maps key is missing. Places API pre-fetching skipped.");
    return { hotels: [], restaurants: [], attractions: [] };
  }

  const region = plan.region;

  // 1. Hotel Query
  const hotelQuery = `best hotels in ${region}`;

  // 2. Restaurant Queries
  const restaurantQueries = [];
  if (plan.favoriteFood && plan.favoriteFood.length > 0) {
    plan.favoriteFood.slice(0, 2).forEach(food => {
      restaurantQueries.push(`${food} in ${region}`);
    });
  }
  if (plan.restaurantPreferences && plan.restaurantPreferences.length > 0) {
    plan.restaurantPreferences.slice(0, 2).forEach(pref => {
      restaurantQueries.push(`${pref} dining in ${region}`);
    });
  }
  if (restaurantQueries.length === 0) {
    restaurantQueries.push(`best restaurants in ${region}`);
  }

  // 3. Attraction Queries
  const attractionQueries = [];
  if (plan.hobbies && plan.hobbies.length > 0) {
    plan.hobbies.slice(0, 2).forEach(hobby => {
      attractionQueries.push(`${hobby} in ${region}`);
    });
  }
  if (plan.placePreferences && plan.placePreferences.length > 0) {
    plan.placePreferences.slice(0, 2).forEach(pref => {
      attractionQueries.push(`${pref} in ${region}`);
    });
  }
  if (attractionQueries.length === 0) {
    attractionQueries.push(`top attractions in ${region}`);
  }

  const uniqueQueries = {
    hotels: [hotelQuery],
    restaurants: Array.from(new Set(restaurantQueries)).slice(0, 3),
    attractions: Array.from(new Set(attractionQueries)).slice(0, 3),
  };

  const results = {
    hotels: [],
    restaurants: [],
    attractions: [],
  };

  const fetchAndFormat = async (query) => {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${key}`;
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      if (!data.results) return [];
      return data.results.slice(0, 12).map(p => ({
        placeId: p.place_id,
        name: p.name,
        address: p.formatted_address || "",
        rating: p.rating || 0,
        userRatingsTotal: p.user_ratings_total || 0,
        priceLevel: p.price_level !== undefined ? p.price_level : -1,
        lat: p.geometry?.location?.lat,
        lng: p.geometry?.location?.lng,
      }));
    } catch (e) {
      console.error(`Error fetching query "${query}":`, e);
      return [];
    }
  };

  try {
    const hotelList = await fetchAndFormat(uniqueQueries.hotels[0]);
    results.hotels = hotelList;

    const restaurantLists = await Promise.all(uniqueQueries.restaurants.map(q => fetchAndFormat(q)));
    const rawRestaurants = restaurantLists.flat();
    const seenRestIds = new Set();
    results.restaurants = rawRestaurants.filter(r => {
      if (seenRestIds.has(r.placeId)) return false;
      seenRestIds.add(r.placeId);
      return true;
    }).slice(0, 25);

    const attractionLists = await Promise.all(uniqueQueries.attractions.map(q => fetchAndFormat(q)));
    const rawAttractions = attractionLists.flat();
    const seenAttrIds = new Set();
    results.attractions = rawAttractions.filter(a => {
      if (seenAttrIds.has(a.placeId)) return false;
      seenAttrIds.add(a.placeId);
      return true;
    }).slice(0, 25);
  } catch (err) {
    console.error("Failed to pre-fetch places details:", err);
  }

  return results;
}

async function extractPlanFromChatHistory(chatHistory) {
  const currentDateTime = new Date();
  const defaultArrival = new Date(currentDateTime);
  defaultArrival.setDate(defaultArrival.getDate() + 30);
  const defaultLeave = new Date(defaultArrival);
  defaultLeave.setDate(defaultLeave.getDate() + 7);
  // Without an explicit "today" anchor the model has no real reference point
  // for relative phrases like "next week" or "in 2 months" — it was
  // silently guessing (e.g. producing a May date for a trip discussed in
  // July), since only a fallback DEFAULT date was given, never today's
  // actual date. Same fix already applied to the chat route's prompt.
  const todayLabel = currentDateTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const prompt = `Today's actual date is ${todayLabel} (${currentDateTime.toISOString().split('T')[0]}). Use this as the reference point for any relative date the traveler mentioned (e.g. "next week", "in 2 months", "this weekend") — do not guess or use your own assumed date.

Analyze this travel planner conversation history and extract the core details:
1. Region/Destination (e.g. "Tokyo, Japan" or "Paris, France").
2. Arrival Date (format YYYY-MM-DD, computed from today's actual date above. If year is omitted, assume the next occurrence. Default to: ${defaultArrival.toISOString().split('T')[0]}).
3. Leave Date (format YYYY-MM-DD. Default to: ${defaultLeave.toISOString().split('T')[0]}).
4. Budget level (e.g. "budget", "moderate", "luxury"). Ask thoroughly to determine the user's budget level (e.g: under $1000, under $2000, under $3000, etc)
5. Travel Group / Who is traveling (e.g. "solo", "couple", "group of 3").

Return ONLY a valid JSON object matching this schema. Do not enclose in markdown code blocks:
{
  "region": "",
  "arrivalDate": "",
  "leaveDate": "",
  "budget": "",
  "whoTraveling": ""
}

Conversation:
${chatHistory.filter(m => m).map(m => `${(m.role || 'user').toUpperCase()}: ${m.text || ''}`).join('\n')}`;

  try {
    // 1. Try Gemini — gemini-3.1-flash-lite, same as the deterministic
    // generator this feeds into (reverted off gemini-3-flash-preview, see
    // that route for why).
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } }
          })
        }
      );
      if (resp.ok) {
        const result = await resp.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = JSON.parse(text.trim());
        if (parsed.region && parsed.arrivalDate) return parsed;
      }
    }

    // 2. Try OpenRouter
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey) {
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openrouterKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500
        })
      });
      if (resp.ok) {
        const result = await resp.json();
        const text = result.choices?.[0]?.message?.content || "";
        const parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
        if (parsed.region && parsed.arrivalDate) return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to extract plan from chat history:", err);
  }

  // Fallback to defaults
  return {
    region: "Tokyo, Japan",
    arrivalDate: defaultArrival.toISOString().split('T')[0],
    leaveDate: defaultLeave.toISOString().split('T')[0],
    budget: "moderate",
    whoTraveling: "solo"
  };
}

app.post("/api/itinerary", expensiveLimiter, optionalAuth, async (req, res) => {
  const payload = req.body;
  let plan = payload.plan || payload || {};
  let chatHistory = payload.chatHistory || [];
  const language = payload.language;

  // The frontend's "stop generating" button aborts its OWN fetch, but that
  // alone doesn't stop US from burning more LLM API calls/time on a request
  // nobody is waiting on anymore. Tie an AbortController to the client
  // connection actually closing so every upstream fetch below gets
  // cancelled too, and so we never try to write a response to a socket
  // that's already gone. IMPORTANT: this must be res.on("close"), not
  // req.on("close") — tested live and confirmed req's close event does NOT
  // reliably fire on client disconnect/reload (a full generation completed
  // uninterrupted after reloading mid-request); res.on("close") is the
  // event Node actually fires when the underlying connection drops before
  // the response finishes.
  const abortController = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) abortController.abort();
  });

  // Cap chat history size so a hostile payload can't inflate the LLM prompt (token cost)
  if (Array.isArray(chatHistory) && chatHistory.length > MAX_CHAT_MESSAGES) {
    chatHistory = chatHistory.slice(-MAX_CHAT_MESSAGES);
  }

  if (!plan?.region || !plan?.arrivalDate || !plan?.leaveDate) {
    console.log("Missing plan details, extracting from chat history...");
    const extractedPlan = await extractPlanFromChatHistory(chatHistory);
    plan = { ...plan, ...extractedPlan };
  }

  plan.region = capitalizeRegion(String(plan.region || "Tokyo, Japan").slice(0, 100));

  // Validate dates BEFORE spending money on Places/LLM calls
  const dateError = validatePlanDates(plan);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  try {
    const durationDays =
      Math.floor((new Date(plan.leaveDate) - new Date(plan.arrivalDate)) / (1000 * 60 * 60 * 24)) + 1;

    const chatContext = chatHistory && chatHistory.length > 0
      ? `Here is the conversation history where the traveler discussed their preferences:\n${chatHistory.filter(m => m).map(m => `${(m.role || 'user').toUpperCase()}: ${m.text || ''}`).join('\n')}`
      : `Hobbies: ${plan.hobbies?.join(', ')}`;

    console.log(`Pre-fetching real locations in ${plan.region} from Places API...`);
    const realPlaces = await fetchRealPlaces(plan);

    // Fetch user memory profile to inject into AI prompt
    // SECURITY: user id comes from the verified JWT (req.user), never the payload —
    // otherwise anyone could pull another user's stored preferences into their prompt.
    let memoryProfile = null;
    const userId = req.user?.id || null;
    if (userId) {
      try {
        const { data: memData } = await supabase
          .from("user_memory")
          .select("preferences")
          .eq("user_id", userId)
          .single();
        if (memData?.preferences) memoryProfile = memData.preferences;
      } catch (_) { }
    }

    const languageInstruction = getLanguageInstruction(language);
    const prompt = getDeterministicGeneratorPrompt(plan, durationDays, chatContext, realPlaces, memoryProfile)
      + (languageInstruction ? `\n\n${languageInstruction}` : "");

    // Retry the whole generation+parse cycle a few times before giving up.
    // Testing showed this exact prompt/model intermittently produces JSON
    // with a stray unescaped character (a genuine model mistake, not a
    // truncation issue — maxOutputTokens/thinkingConfig above already rule
    // that out) that fails to parse — but a fresh attempt at the SAME
    // request almost always succeeds. A user hitting "ready" should get a
    // real itinerary, not a "Sorry" on the first bad roll of the dice.
    const MAX_GENERATION_ATTEMPTS = 3;
    let itinerary;
    let lastParseError = null;

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS && !itinerary; attempt++) {
      if (abortController.signal.aborted) {
        console.log("Itinerary generation aborted by client disconnect — stopping retries.");
        break;
      }
      let raw = "";
      let success = false;

      // 1. Fire generation pipelines (Ollama falling back to Gemini/OpenRouter)
      // Only attempt Ollama when explicitly enabled — in production there is no
      // localhost:11434, and probing it on every request just adds latency.
      if (process.env.USE_OLLAMA === "true") try {
        const bestModel = await getBestOllamaModel("qwen3:8b");
        const ollamaRes = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: bestModel, prompt, stream: false, options: { temperature: 0.4 } }),
          signal: abortController.signal,
        });
        if (ollamaRes.ok) {
          const data = await ollamaRes.json();
          raw = (data.response || "").trim();
          success = true;
        }
      } catch (err) {
        console.warn("Local Ollama route bypassed, switching track...", err.message);
      }

      // 2. Try Gemini API for Itinerary generation
      if (!success && process.env.GEMINI_API_KEY) {
        try {
          // gemini-3.1-flash-lite — reverted off gemini-3-flash-preview
          // (2026-07-10): confirmed live, repeatedly (both in testing and
          // in real user reports of slow/stuck generation), that the
          // preview model is under heavy capacity overload (503 "high
          // demand"). Every failed attempt was falling through to a much
          // slower OpenRouter call, compounding across retries. flash-lite
          // is a stable GA model with no such issue and already handled
          // this structured JSON task cleanly before. No Pro-escalation
          // tier either — pointless to escalate from one preview-adjacent
          // model to another when the primary is now the reliable one.
          console.log(`Sending itinerary generation prompt to Gemini API (gemini-3.1-flash-lite)... (attempt ${attempt}/${MAX_GENERATION_ATTEMPTS})`);
          const geminiKey = process.env.GEMINI_API_KEY;
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`;

          const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.4,
                responseMimeType: "application/json",
                // 65536 output tokens — use the full budget since multi-week
                // trips (days x activities x 3 alternatives each, all with
                // full place metadata) can run long.
                maxOutputTokens: 65536,
                // Flash "thinks" before answering by default, and those
                // thinking tokens are drawn from the SAME maxOutputTokens
                // budget as the final answer. On a long, complex itinerary
                // prompt this was silently consuming enough of the budget that
                // the actual JSON got cut off mid-document, producing invalid
                // JSON ("Failed to parse itinerary generated by AI") even
                // though the request itself succeeded. This is a structured
                // JSON-generation task with an explicit schema, not a task
                // that benefits from visible reasoning, so disable thinking
                // entirely and spend the whole budget on the real output.
                thinkingConfig: { thinkingBudget: 0 }
              }
            }),
            signal: abortController.signal,
          });

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            if (geminiData.candidates && geminiData.candidates[0].content?.parts?.[0]?.text) {
              raw = geminiData.candidates[0].content.parts[0].text.trim();
              success = true;
              console.log("Successfully generated itinerary via Gemini API!");
            }
          } else {
            console.warn(`Gemini API itinerary responded with status ${geminiRes.status}.`);
          }
        } catch (geminiError) {
          console.warn("Gemini API itinerary generation failed.", geminiError.message);
        }
      }

      // 3. Try OpenRouter API for Itinerary generation
      if (!success && process.env.OPENROUTER_API_KEY) {
        try {
          console.log("Sending itinerary generation prompt to OpenRouter API...");
          const openRouterKey = process.env.OPENROUTER_API_KEY;
          const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

          const orRes = await fetch(OR_URL, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openRouterKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.4,
              // Full itinerary JSON (days, activities, alternatives x3 each,
              // packing list, insights) regularly runs past 6000 tokens too —
              // confirmed live (2026-07-09): 3/3 real generation attempts cut
              // off mid-sentence at the very edge of a 6000-token budget,
              // producing invalid JSON every time on this fallback path.
              // Raised to 12000 for headroom. NOTE: this account has
              // previously shown very little balance (402 "requires more
              // credits" around ~8-10k tokens) — if 12000 starts producing
              // 402s instead of truncation, that's a billing issue, not a
              // code bug — top up at openrouter.ai/settings/credits.
              max_tokens: 12000,
              response_format: { type: "json_object" }
            }),
            signal: abortController.signal,
          });

          if (orRes.ok) {
            const orData = await orRes.json();
            if (orData.choices && orData.choices[0].message.content) {
              raw = orData.choices[0].message.content.trim();
              success = true;
              console.log("Successfully generated itinerary via OpenRouter API!");
            }
          } else {
            console.warn(`OpenRouter API itinerary generation responded with status ${orRes.status}.`, await orRes.text());
          }
        } catch (orError) {
          console.warn("OpenRouter API itinerary generation failed.", orError.message);
        }
      }

      if (success && raw) {
        try {
          const jsonText = extractJson(raw);
          itinerary = JSON.parse(jsonText);
        } catch (parseErr) {
          lastParseError = parseErr;
          // parseErr alone ("Unexpected token X in JSON at position N") isn't
          // enough to tell a genuine model-output syntax bug apart from a
          // maxOutputTokens truncation cutting the JSON off mid-document —
          // log enough of the raw text to tell the two apart, and retry
          // instead of giving up on what testing showed is usually a
          // one-off stochastic mistake.
          const posMatch = /position (\d+)/.exec(parseErr.message);
          const pos = posMatch ? Number(posMatch[1]) : null;
          console.warn(`Itinerary JSON parse failed on attempt ${attempt}/${MAX_GENERATION_ATTEMPTS}:`, parseErr.message, {
            rawLength: raw.length,
            nearError: pos !== null ? raw.slice(Math.max(0, pos - 150), pos + 150) : undefined,
            start: raw.slice(0, 200),
            end: raw.slice(-200),
          });
        }
      }
    }

    // Client disconnected (traveler hit "stop generating," closed the tab,
    // reloaded, etc.) — nothing left to do. Writing to res here would throw
    // ("write after end") since the connection is already gone, and there's
    // no one left to receive the answer anyway.
    if (abortController.signal.aborted) {
      console.log("Itinerary generation aborted by client disconnect — discarding result, not responding.");
      return;
    }

    if (!itinerary) {
      if (lastParseError) {
        console.error(`Model JSON parse failed on all ${MAX_GENERATION_ATTEMPTS} attempts:`, lastParseError.message);
        return res.status(500).json({ error: "Failed to parse itinerary generated by AI. Please try again." });
      }
      console.error("All LLM pipelines failed or key was invalid.");
      return res.status(500).json({ error: "Failed to generate itinerary. No active LLM pipeline succeeded." });
    }

    itinerary = normalizeItineraryDates(itinerary, plan, durationDays);

    // Enrich itinerary activities and alternatives with real Google Places coordinates/addresses
    console.log("Enriching itinerary with verified coordinates and locations...");
    itinerary = await enrichItineraryPlaces(itinerary, realPlaces);

    // The generator prompt already asks the model for emergencyNumbers,
    // safeNeighborhoods, commonScams, and logisticsGuide directly (see
    // prompts.js) — trust that instead of a hardcoded fallback that only
    // covered 4 countries and fell back to near-useless generic text
    // ("Check Local Directory") for everywhere else. Keep only a minimal
    // null-safety guard so the frontend never crashes on a missing object.
    if (!itinerary.insights) {
      itinerary.insights = { weatherOverview: "", culturalTips: [], safetyTips: [], customsRestrictions: [] };
    }

    if (abortController.signal.aborted) {
      console.log("Itinerary finished generating but client had already disconnected — discarding result.");
      return;
    }

    return res.json(itinerary);
  } catch (e) {
    // A genuinely aborted fetch (e.g. fetchRealPlaces or enrichItineraryPlaces
    // mid-flight when the client disconnects) throws an AbortError that isn't
    // caught by the per-provider try/catches above — never try to write to a
    // socket that's already gone.
    if (abortController.signal.aborted) {
      console.log("Itinerary generation aborted by client disconnect — discarding result, not responding.");
      return;
    }
    console.error("Critical failure in itinerary route:", e);
    return res.status(500).json({ error: "Failed to generate itinerary. Please try again." });
  }
});

app.post("/api/chat", expensiveLimiter, optionalAuth, async (req, res) => {
  const { messages, text, sessionId, mode, itineraryContext, region, timezone, language } = req.body;
  let chatHistory = messages || [];
  let dbAvailable = false;

  // SECURITY: user id comes ONLY from the verified JWT. Previously the client
  // sent userId in the body, letting anyone write chat rows into any account.
  const userId = req.user?.id || null;
  let memoryProfile = null;

  if (userId) {
    try {
      const { data: memData } = await supabase
        .from("user_memory")
        .select("preferences")
        .eq("user_id", userId)
        .single();
      if (memData?.preferences) memoryProfile = memData.preferences;
    } catch (_) { }
  }

  // Persist to DB only for authenticated users with a session id
  if (text && sessionId && userId) {
    try {
      // 1. Save the incoming user message to the Database first
      await supabase.from('chat_histories').insert([
        { user_id: userId, session_id: sessionId, role: 'user', text: text }
      ]);

      // 2. Retrieve the complete, true historical log from the DB
      const { data: history, error } = await supabase
        .from('chat_histories')
        .select('role, text')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // 3. Format the chat logs into the exact message format
      chatHistory = history.map(msg => ({
        role: msg.role,
        text: msg.text
      }));
      dbAvailable = true;
    } catch (e) {
      console.warn("Supabase load/save failed. Falling back to local payload.", e.message);
      chatHistory = messages || [{ role: 'user', text }];
      dbAvailable = false;
    }
  }

  if (!chatHistory || !Array.isArray(chatHistory)) {
    return res.status(400).json({ error: "Missing chat context" });
  }

  // The frontend no longer ships any hardcoded opening line — even JourZy's
  // first "hello" is AI-generated — so on a genuinely empty transcript, give
  // the model a synthetic, never-displayed kickoff turn to react to instead
  // of an empty conversation (Gemini/OpenRouter both require at least one
  // turn). This is never shown to the traveler or stored as their message.
  if (chatHistory.length === 0) {
    let kickoffText = "";
    if (mode === "reschedule") kickoffText = "(The traveler just opened the Reschedule tab for this trip. Greet them warmly as JourZy and ask what they'd like to change, per your instructions.)";
    else if (mode === "pastTrip") kickoffText = "(The traveler just opened the chat for this past trip. Greet them warmly as JourZy, bring up a specific highlight or memory from the trip, and ask how they liked it, per your instructions.)";
    else if (mode === "itinerary") kickoffText = "(The traveler just opened the chat for this active/upcoming trip. Greet them warmly as JourZy and ask if they have any questions or need to swap anything in the itinerary.)";
    else kickoffText = "(The traveler just opened the app for the first time. Greet them warmly as JourZy and start the conversation, per your instructions.)";

    chatHistory = [{ role: "user", text: kickoffText }];
  }

  // Cap history so a hostile payload can't inflate the LLM prompt
  if (chatHistory.length > MAX_CHAT_MESSAGES) {
    chatHistory = chatHistory.slice(-MAX_CHAT_MESSAGES);
  }

  try {
    // Use the traveler's actual device timezone when provided, instead of a
    // hardcoded one — JourZy should know what time it really is for them.
    let currentDateTime;
    try {
      currentDateTime = new Date().toLocaleString("en-US", { timeZone: timezone || "UTC" });
    } catch (e) {
      currentDateTime = new Date().toLocaleString("en-US", { timeZone: "UTC" });
    }

    const baseInstruction = mode === "itinerary"
      ? getItineraryChatInstruction(itineraryContext || "(no trip details provided)")
      : mode === "pastTrip"
        ? getPastTripChatInstruction(itineraryContext || "(no trip details provided)")
        : mode === "reschedule"
          ? getRescheduleChatInstruction(itineraryContext || "(no trip details provided)")
          : getSystemChatInstruction(memoryProfile);
    // The device/browser locale (navigator.language) is only a real signal
    // before the traveler has typed anything — plenty of people (this app's
    // own Vietnamese-locale users typing in English, for instance) chat in a
    // language that doesn't match their OS/browser setting. Forcing the
    // locale-based instruction on every single turn regardless of what's
    // actually in the conversation caused the model to snap back to the
    // device language mid-conversation (observed live: an English
    // conversation flipped to Vietnamese right at the final <<READY>>
    // confirmation once a weaker fallback model ended up handling the
    // reply, under a since-simplified chat model setup). Once the traveler
    // has actually written something real, trust
    // the conversation's own established language via chat history/context
    // instead of re-asserting a possibly-wrong locale guess every turn.
    const hasRealUserMessage = chatHistory.some(m => (m.role || "user") !== "ai" && (m.text || "").trim() && !/^\(/.test((m.text || "").trim()));
    const languageInstruction = hasRealUserMessage ? "" : getLanguageInstruction(language);
    const flightSearchEnabled = !!process.env.TRAVELPAYOUTS_API_TOKEN;
    const systemInstruction = [baseInstruction, flightSearchEnabled ? FLIGHT_GUIDANCE : BOOKING_GUIDANCE, languageInstruction].filter(Boolean).join("\n\n");

    let replyText = "";
    let success = false;

    // 1. Try Local Ollama first (prioritizing qwen3:8b) — only when enabled
    if (process.env.USE_OLLAMA === "true") try {
      const bestModel = await getBestOllamaModel("qwen3:8b");
      const prompt = `${systemInstruction}

[Current Date and Time: ${currentDateTime}]

Conversation history:
${chatHistory.filter(m => m).map(m => `${(m.role || 'user') === 'ai' ? 'model' : 'user'}: ${m.text || ''}`).join('\n')}

Model reply:`;

      console.log(`Sending chat prompt to Ollama using model: ${bestModel}...`);
      const ollamaRes = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: bestModel,
          prompt,
          stream: false,
          options: { temperature: 0.7 },
        }),
      });

      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        replyText = (data.response || "").trim();
        if (replyText) {
          success = true;
          console.log("Successfully generated chat response via Ollama!");
        }
      }
    } catch (ollamaError) {
      console.warn("Local Ollama chat failed or not running:", ollamaError.message);
    }

    // 1.5 Try Gemini API next — tried before OpenRouter because the itinerary-chat
    // flow depends on strict adherence to the "<<SUGGEST: ... >>" tag format
    // (see getItineraryChatInstruction), and Gemini has proven far more reliable
    // at following that exact structured-output contract than the OpenRouter
    // Qwen model, which would often describe an alternative in prose without
    // ever emitting the tag — silently breaking the real-place lookup + replace
    // flow the whole in-trip chat depends on.
    if (!success && process.env.GEMINI_API_KEY) {
      try {
        console.log("Sending chat prompt to Gemini API...");
        const geminiKey = process.env.GEMINI_API_KEY;
        // gemini-3.1-flash-lite for all chat turns (onboarding, in-trip
        // companion, reschedule, past-trip) — fast/cheap conversational
        // replies. Also now the model for the generator and suggestion-
        // synthesis tasks (see /api/itinerary) after reverting those off
        // the overloaded gemini-3-flash-preview.
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiKey}`;

        const contents = chatHistory.filter(m => m).map(m => ({
          role: (m.role || 'user') === 'ai' ? 'model' : 'user',
          parts: [{ text: m.text || '' }]
        }));

        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: contents,
            systemInstruction: {
              parts: [{ text: `${systemInstruction}\nCurrent Date: ${currentDateTime}` }]
            },
            generationConfig: {
              temperature: 0.7,
              // Was 250 — too tight even for a compliant 2-4 sentence reply
              // plus a <<SUGGEST>> tag, and silently truncated mid-word
              // whenever the model ran long. The prompt now hard-bans
              // multi-day dumps, so this only needs to cover a normal reply.
              maxOutputTokens: 600,
              // Flash "thinks" before answering by default, and those tokens
              // draw from this SAME budget — tested empirically and it
              // consumed 572/600 tokens on thinking alone, cutting the
              // actual reply off mid-sentence (finishReason MAX_TOKENS after
              // only 24 usable tokens). This is a short conversational
              // reply, not a task that benefits from visible reasoning, so
              // disable thinking entirely.
              thinkingConfig: { thinkingBudget: 0 }
            }
          })
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          if (geminiData.candidates && geminiData.candidates[0].content?.parts?.[0]?.text) {
            replyText = geminiData.candidates[0].content.parts[0].text.trim();
            success = true;
            console.log("Successfully generated chat response via Gemini API!");
          }
        } else {
          console.warn(`Gemini API responded with status ${geminiRes.status}.`);
          const errText = await geminiRes.text();
          console.warn("Gemini API Error Detail:", errText);
        }
      } catch (geminiError) {
        console.warn("Gemini API chat failed.", geminiError.message);
      }
    }

    // 1.6 Try OpenRouter API if Ollama and Gemini fail
    if (!success && process.env.OPENROUTER_API_KEY) {
      try {
        console.log("Sending chat prompt to OpenRouter API (Qwen)...");
        const openRouterKey = process.env.OPENROUTER_API_KEY;
        const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

        const orMessages = [
          { role: 'system', content: `${systemInstruction}\nCurrent Date: ${currentDateTime}` },
          ...chatHistory.filter(m => m).map(m => ({
            role: (m.role || 'user') === 'ai' ? 'assistant' : 'user',
            content: m.text || ''
          }))
        ];

        const orRes = await fetch(OR_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://travel-planner-ai-five-peach.vercel.app",
            "X-Title": "JourZy Travel"
          },
          body: JSON.stringify({
            model: "qwen/qwen-2.5-72b-instruct",
            messages: orMessages,
            temperature: 0.7,
            // Was 400 — silently truncated mid-word on longer replies (e.g.
            // Qwen ignoring the "one place only" instruction). The prompt
            // now hard-bans multi-day dumps, so this only needs to cover a
            // normal single-suggestion reply with headroom to spare.
            max_tokens: 600
          })
        });

        if (orRes.ok) {
          const orData = await orRes.json();
          if (orData.choices && orData.choices[0].message.content) {
            replyText = orData.choices[0].message.content.trim();
            success = true;
            console.log("Successfully generated chat response via OpenRouter API!");
          }
        } else {
          console.warn(`OpenRouter API responded with status ${orRes.status}.`);
        }
      } catch (orError) {
        console.warn("OpenRouter API chat failed.", orError.message);
      }
    }

    // 2. Fallback: Canned response matching
    if (!success) {
      console.warn("Using canned response fallback for chat.");
      const lastUserText = (chatHistory[chatHistory.length - 1]?.text || "").toLowerCase();

      if (mode === "itinerary" || mode === "pastTrip") {
        replyText = "Sorry, I'm having trouble connecting right now — mind trying that again in a moment?";
      } else {
        replyText = "Got it! What other activities, hobbies, or food preferences do you have? Or just type 'good to go' when you're ready to generate the schedule!";
        if (lastUserText.includes("yes") || lastUserText.includes("flight") || lastUserText.includes("arrive") || lastUserText.includes("leave") || /\b\d{1,2}(:\d{2})?\s*(am|pm)?\b/i.test(lastUserText)) {
          replyText = "Awesome, noted! Let me know if there are any specific activities, restaurants, or sights you'd like to include, or say 'good to go' to build your schedule!";
        } else if (lastUserText.includes("no") || lastUserText.includes("haven't") || lastUserText.includes("not yet")) {
          replyText = "No problem! You can check the flights page using the menu on the left. Once you're ready to plan your activities, what other hobbies or preferences do you have? Or say 'good to go' to build the itinerary!";
        }
      }
    }

    // SAFETY NET (defense in depth beyond the prompt wording): the itinerary
    // chat must never write out a multi-day/multi-stop plan — this chat can
    // only ever attach ONE verified place via <<SUGGEST>>, so a dump of
    // several days' worth of invented activities is unverified, made-up info
    // slipping past the prompt instructions, plus it silently updates
    // nothing in the traveler's real schedule. Model compliance with the
    // prompt alone has proven unreliable (esp. on the OpenRouter fallback
    // model), so detect the pattern and override deterministically.
    if (mode === "itinerary" && success) {
      const dayHeaders = new Set((replyText.match(/\bday\s+\d+\b/gi) || []).map(m => m.toLowerCase()));
      const timeBullets = replyText.match(/^[-•]\s*\d{1,2}:\d{2}\s*(AM|PM)/gim) || [];
      if (dayHeaders.size >= 2 || timeBullets.length >= 4) {
        console.warn("Itinerary chat produced a multi-day dump — overriding with a safe redirect.", { dayHeaders: dayHeaders.size, timeBullets: timeBullets.length });
        replyText = "I can only swap in one real, verified place at a time, so I can't lay out several days at once here — which single day or stop would you like to start with?";
      }
    }

    // In itinerary-chat mode, the model may end its reply with a hidden
    // <<SUGGEST: query | city>> tag instead of naming a specific place itself.
    // Strip that tag and resolve it to one REAL, verified place via Google
    // Places, so the traveler never sees an AI-hallucinated name/rating.
    let suggestion = null;
    if (mode === "itinerary") {
      const suggestMatch = replyText.match(/<<SUGGEST:\s*(.+?)\s*\|\s*(.+?)\s*>>/i);
      if (suggestMatch) {
        replyText = replyText.replace(suggestMatch[0], "").trim();
        try {
          // Prefer the authoritative trip region over the model's own city
          // guess in the tag — the model sometimes writes just "Nha Trang"
          // with no country, which Google's text search can resolve to a
          // same-named place in the wrong country entirely.
          const results = await searchPlaces(suggestMatch[1].trim(), (region || suggestMatch[2]).trim());
          const candidates = Array.isArray(results) ? results : [];
          let top = candidates[0] || null;

          // Enrichment: with 2+ real candidates, let the model reason over
          // them (spatial fit to today's plan, budget, mood) instead of
          // always trusting Google's #1 ranked result. Traveler fields we
          // don't have in this route are marked "not specified" rather than
          // guessed — the prompt is told never to invent them.
          const enrichment = await synthesizeBestSuggestion(
            {
              destination: region || suggestMatch[2].trim(),
              loves: "not specified", dislikes: "not specified",
              transport: "not specified", remainingBudget: "not specified", party: "not specified",
            },
            text || suggestMatch[1].trim(),
            candidates,
            itineraryContext || "(not specified)"
          );
          if (enrichment?.picked) top = enrichment.picked;

          if (top) {
            suggestion = {
              placeId: top.place_id,
              title: top.name,
              address: top.formatted_address || "",
              rating: top.rating || undefined,
              lat: top.geometry?.location?.lat,
              lng: top.geometry?.location?.lng,
              mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((top.name || "") + " " + (top.formatted_address || ""))}&query_place_id=${top.place_id}`,
              why: enrichment?.why || undefined,
              travelTimeFromPlan: enrichment?.travelTimeFromPlan || undefined,
            };
          }
        } catch (e) {
          console.warn("Failed to resolve suggested place:", e.message);
        }
      }
    }

    // When flight search is enabled (see FLIGHT_GUIDANCE / FLIGHT_SEARCH_HANDOFF
    // above), the model may end its reply with a hidden
    // <<FLIGHTS: origin | destination | departDate | returnDate>> tag instead
    // of stating any flight details itself. Strip it and resolve it to REAL
    // cached fare data via Travelpayouts, then let synthesizeFlightPicks rank
    // and explain the actual options — the model never invents a price.
    let flightSuggestion = null;
    if (flightSearchEnabled) {
      const flightsMatch = replyText.match(/<<FLIGHTS:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*>>/i);
      if (flightsMatch) {
        replyText = replyText.replace(flightsMatch[0], "").trim();
        try {
          const [, originCity, destCity, departDate, returnDateRaw] = flightsMatch;
          const returnDate = /^oneway$/i.test(returnDateRaw.trim()) ? null : returnDateRaw.trim();

          const [originIata, destIata] = await Promise.all([
            resolveIataCode(originCity.trim()),
            resolveIataCode(destCity.trim()),
          ]);

          if (originIata && destIata) {
            const fareMap = await searchCheapFlights(originIata, destIata, departDate.trim(), returnDate);
            const entries = Object.entries(fareMap).map(([transfers, fare]) => ({
              transfers: Number(transfers),
              price: fare.price,
              airline: fare.airline,
              flight_number: fare.flight_number,
              departure_at: fare.departure_at,
              return_at: fare.return_at,
              expires_at: fare.expires_at,
              // Total minutes in the air + connections each way, when the
              // feed includes it (usually present at month-level queries,
              // sometimes absent) — the only duration signal this endpoint
              // has; no per-layover breakdown exists.
              duration_to_minutes: fare.duration_to ?? undefined,
              duration_back_minutes: fare.duration_back ?? undefined,
            }));

            if (entries.length > 0) {
              // This synthesis prompt has no chat transcript of its own to
              // infer language from, unlike the main chat model — ground it
              // in the traveler's actual last message instead of the device
              // locale, which would otherwise risk the same language-flip
              // bug the main chat had (see getLanguageMatchInstruction).
              const flightLanguageInstruction = getLanguageMatchInstruction(text) || getLanguageInstruction(language);
              // The traveler may have already stated a total trip budget
              // earlier in this same conversation (onboarding recaps it
              // explicitly, e.g. "- Budget: $1,000 USD"). Ground the flight
              // advisor in that real transcript instead of a hardcoded
              // "not specified" — otherwise it has no way to honor the
              // "never fabricate budgetLeftAfter" rule correctly, since it
              // would never see a real number to work from even when one
              // was genuinely given. Capped to the most recent portion so a
              // long conversation can't blow up prompt size.
              const conversationContext = chatHistory
                .filter(m => m && (m.text || "").trim())
                .map(m => `${(m.role || "user") === "ai" ? "JourZy" : "Traveler"}: ${m.text}`)
                .join("\n")
                .slice(-3000);
              const picksResult = await synthesizeFlightPicks(
                {
                  origin: originCity.trim(), destination: destCity.trim(),
                  departDate: departDate.trim(), returnDate: returnDate || "one-way",
                  budget: "not specified", party: "not specified",
                  pointsPrograms: "none mentioned",
                  conversationContext,
                },
                JSON.stringify(entries),
                flightLanguageInstruction
              );
              if (picksResult) flightSuggestion = picksResult;
            }
          }
        } catch (e) {
          console.warn("Failed to resolve flight search:", e.message);
        }
      }
    }

    // In onboarding chat, JourZy may emit a hidden <<NAME: Their Name>> tag
    // the moment the traveler tells it their name (see SYSTEM_CHAT_INSTRUCTION
    // rule 1.5) — strip it from the visible reply and persist it to their
    // memory profile (same table/shape as POST /api/memory) so future visits
    // can greet them by name, same as the old scripted name-capture step did.
    if (mode !== "itinerary" && mode !== "pastTrip" && mode !== "reschedule") {
      const nameMatch = replyText.match(/<<NAME:\s*(.+?)\s*>>/i);
      if (nameMatch) {
        replyText = replyText.replace(nameMatch[0], "").trim();
        const capturedName = nameMatch[1].trim().slice(0, 40);
        if (capturedName && userId) {
          try {
            const { data: existing } = await supabase
              .from("user_memory")
              .select("preferences")
              .eq("user_id", userId)
              .single();
            const existingPrefs = existing?.preferences || {};
            await supabase
              .from("user_memory")
              .upsert(
                { user_id: userId, preferences: { ...existingPrefs, userName: capturedName }, updated_at: new Date().toISOString() },
                { onConflict: "user_id" }
              );
          } catch (e) {
            console.warn("Failed to save captured name to memory:", e.message);
          }
        }
      }
    }

    let isReady = false;
    const readyMatch = replyText.match(/<<READY>>/i);
    if (readyMatch) {
      replyText = replyText.replace(readyMatch[0], "").trim();
      // SAFETY NET (defense in depth beyond the prompt's "TWO-TURN RULE, NO
      // EXCEPTIONS" wording in READY_PROTOCOL): <<READY>> must only ever be
      // honored on a turn AFTER the traveler has already seen the recap +
      // "are you ready?" question on a PRIOR turn and separately replied to
      // confirm it — never on the very same turn that first presents that
      // recap, even when the traveler dumped every category into one
      // message with nothing left to ask (they still haven't said yes to
      // anything yet). Model compliance with the prompt wording alone has
      // proven unreliable here — observed live: the recap/question and
      // <<READY>> arriving in the same reply, silently building and
      // attempting to save a trip the traveler never confirmed. Detect it
      // deterministically via whether a prior AI turn already showed the
      // recap's "- **" bullet format; only then trust the tag.
      const recapAlreadyShownBefore = chatHistory.some(m => (m.role || "user") === "ai" && /^-\s*\*\*/m.test(m.text || ""));
      if (recapAlreadyShownBefore) {
        isReady = true;
      } else {
        console.warn("Blocked premature <<READY>> — recap/question was shown for the first time in this same reply.");
      }
    }

    if (success && sessionId && userId && replyText && dbAvailable) {
      try {
        await supabase.from('chat_histories').insert([
          { user_id: userId, session_id: sessionId, role: 'ai', text: replyText }
        ]);
      } catch (e) {
        console.warn("Failed to save AI response to Supabase.", e.message);
      }
    }

    return res.json({ text: replyText, suggestion, flightSuggestion, isReady });
  } catch (e) {
    console.error("Chat route critical failure:", e);
    return res.status(500).json({ error: "Chat failed. Please try again." });
  }
});

app.get("/api/chat/history", requireAuth, async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

  try {
    // SECURITY: filter by BOTH session id and the authenticated user's id,
    // so users can't read other people's conversations by guessing session ids.
    const { data, error } = await supabase
      .from('chat_histories')
      .select('role, text, id')
      .eq('session_id', sessionId)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Chat history fetch error:", error);
      return res.status(500).json({ error: "Failed to load chat history" });
    }
    return res.json({ messages: data });
  } catch (e) {
    console.error("Chat history route failure:", e);
    return res.status(500).json({ error: "Failed to load chat history" });
  }
});

app.get("/api/weather", async (req, res) => {
  const { lat, lng, q } = req.query;
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return res.status(503).json({ error: "Weather service not configured" });

  // imperial (°F) — the frontend renders these raw with no unit conversion,
  // matching the °F convention used by the AI-fallback weatherWeek insights.
  let url;
  if (lat && lng) {
    url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=imperial&appid=${key}`;
  } else if (q) {
    url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(q)}&units=imperial&appid=${key}`;
  } else {
    return res.status(400).json({ error: "Missing coordinates or location query" });
  }

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    return res.json(data);
  } catch (e) {
    console.error("Weather fetch failed:", e);
    return res.status(500).json({ error: "Failed to fetch weather" });
  }
});

app.get("/api/nearby", async (req, res) => {
  const { lat, lng, keyword } = req.query;
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key || !lat || !lng) return res.status(400).json({ error: "Missing parameters" });

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&keyword=${encodeURIComponent(keyword || "restaurant")}&key=${key}`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();

    const places = (data.results || []).slice(0, 6).map(p => ({
      placeId: p.place_id,
      name: p.name,
      rating: p.rating,
      userRatingsTotal: p.user_ratings_total,
      priceLevel: p.price_level,
      isOpenNow: p.opening_hours?.open_now,
      vicinity: p.vicinity,
      photoUrl: p.photos?.[0]?.photo_reference
        ? `/api/photo?reference=${p.photos[0].photo_reference}`
        : null
    }));
    return res.json({ places });
  } catch (e) {
    console.error("Nearby search failed:", e);
    return res.status(500).json({ error: "Failed to fetch nearby places" });
  }
});

app.get("/api/photo", async (req, res) => {
  const { reference } = req.query;
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key || !reference) return res.status(400).send("Missing parameters");

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${reference}&key=${key}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return res.status(resp.status).send("Failed to fetch photo");

    const contentType = resp.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    const buffer = await resp.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (e) {
    console.error("Photo proxy failed:", e);
    return res.status(500).send("Failed to fetch photo");
  }
});

app.get("/api/place-lookup", async (req, res) => {
  const { query, region } = req.query;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing query" });
  }
  try {
    const place = await lookupPlace(String(query).slice(0, 200), String(region || "").slice(0, 100));
    return res.json({ place });
  } catch (e) {
    console.error("Place lookup failed:", e);
    return res.status(500).json({ error: "Place lookup failed" });
  }
});

app.post("/api/trips", requireAuth, async (req, res) => {
  const { region, arrivalDate, leaveDate, budget, whoTraveling, itinerary } = req.body;
  // SECURITY: user id comes from the verified JWT, never the request body
  const userId = req.user.id;

  if (!region || !arrivalDate || !leaveDate || !itinerary) {
    return res.status(400).json({ error: "Missing required fields for saving trip" });
  }

  // A trip with zero days is useless and almost certainly means generation
  // upstream produced a malformed itinerary — reject it here rather than
  // saving a "ghost" trip that will show "No itinerary data" forever with no
  // way for the traveler to know why.
  const days = itinerary.days || [];
  if (!Array.isArray(days) || days.length === 0) {
    return res.status(400).json({ error: "Itinerary has no days — nothing to save" });
  }

  let tripId = null;
  try {
    const { data: tripData, error: tripError } = await supabase
      .from("trips")
      .insert([
        {
          user_id: userId,
          region,
          arrival_date: arrivalDate,
          leave_date: leaveDate,
          budget,
          who_traveling: whoTraveling
        }
      ])
      .select();

    if (tripError) throw tripError;
    tripId = tripData[0].id;

    const { error: itineraryError } = await supabase
      .from("itineraries")
      .insert([
        {
          trip_id: tripId,
          hotel_recommendation: itinerary.hotelRecommendation || itinerary.hotel_recommendation || null,
          days,
          packing_list: itinerary.packingList || itinerary.packing_list || null,
          insights: itinerary.insights || null,
          logistics_guide: itinerary.logisticsGuide || itinerary.logistics_guide || null
        }
      ]);

    if (itineraryError) throw itineraryError;

    return res.json({ success: true, tripId });
  } catch (e) {
    console.error("Error saving trip:", e);
    // Roll back the trip row if the itinerary insert is what failed — a
    // "trips" row with no matching "itineraries" row is a permanent ghost
    // entry the traveler can never open (this is exactly the bug that
    // produced a real trip stuck showing "No itinerary data"/"Budget data
    // not available" with no way to recover except manual DB cleanup).
    if (tripId) {
      try {
        await supabase.from("trips").delete().eq("id", tripId);
      } catch (rollbackErr) {
        console.error("Failed to roll back orphaned trip row:", tripId, rollbackErr);
      }
    }
    return res.status(500).json({ error: "Failed to save trip" });
  }
});

app.get("/api/trips", requireAuth, async (req, res) => {
  try {
    // SECURITY: list only the authenticated user's trips
    const { data, error } = await supabase
      .from("trips")
      .select("*, itineraries(*)")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ trips: data });
  } catch (e) {
    console.error("Error fetching trips:", e);
    return res.status(500).json({ error: "Failed to fetch trips" });
  }
});

app.get("/api/trips/:tripId", requireAuth, async (req, res) => {
  const { tripId } = req.params;

  try {
    // SECURITY: ownership check — the trip must belong to the authenticated user
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .eq("user_id", req.user.id)
      .single();

    if (tripError || !trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const { data: itinerary, error: itineraryError } = await supabase
      .from("itineraries")
      .select("*")
      .eq("trip_id", tripId)
      .single();

    if (itineraryError && itineraryError.code !== "PGRST116") throw itineraryError;

    return res.json({ trip, itinerary });
  } catch (e) {
    console.error("Error fetching trip details:", e);
    return res.status(500).json({ error: "Failed to fetch trip details" });
  }
});

app.delete("/api/trips/:tripId", requireAuth, async (req, res) => {
  const { tripId } = req.params;

  try {
    // SECURITY: previously ANYONE could delete ANY trip by guessing its id.
    // The delete is now scoped to the authenticated owner, and we verify a
    // row was actually removed.
    const { data, error } = await supabase
      .from("trips")
      .delete()
      .eq("id", tripId)
      .eq("user_id", req.user.id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Trip not found" });
    }
    return res.json({ success: true });
  } catch (e) {
    console.error("Error deleting trip:", e);
    return res.status(500).json({ error: "Failed to delete trip" });
  }
});

// ─── MILESTONE 7: EVENT DISCOVERY ─────────────────────────────────────────────
app.get("/api/events", async (req, res) => {
  const { region, arrivalDate, leaveDate } = req.query;
  // BUG FIX: was process.env.GOOGLE_MAPS_API_KEY — a variable that doesn't exist
  // in your .env — so events ALWAYS fell back to mock data even with a valid key.
  const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_KEY;

  if (!region) return res.status(400).json({ error: "region is required" });

  const eventCategories = [
    { type: "festival", keyword: `festival ${region}` },
    { type: "concert", keyword: `concert music ${region}` },
    { type: "market", keyword: `night market street market ${region}` },
    { type: "sports", keyword: `sports event ${region}` },
    { type: "exhibition", keyword: `art exhibition ${region}` },
  ];

  const results = [];

  if (!GOOGLE_API_KEY) {
    // Return mock events when no API key
    const mockEvents = [
      { id: "evt-1", type: "festival", title: `Local Cultural Festival in ${region}`, location: region, description: "A vibrant annual festival celebrating local culture, food, and art.", date: arrivalDate || new Date().toISOString().split('T')[0], imageUrl: null },
      { id: "evt-2", type: "market", title: `Weekend Night Market near ${region}`, location: `${region} Market District`, description: "Browse hundreds of local vendor stalls, street food, and handmade crafts.", date: arrivalDate || new Date().toISOString().split('T')[0], imageUrl: null },
      { id: "evt-3", type: "concert", title: `Live Music at ${region}`, location: `${region} Amphitheater`, description: "Open-air concert series with local and international artists performing through the travel season.", date: leaveDate || new Date().toISOString().split('T')[0], imageUrl: null },
    ];
    return res.json({ events: mockEvents, source: "mock" });
  }

  try {
    for (const cat of eventCategories) {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(cat.keyword)}&key=${GOOGLE_API_KEY}&type=point_of_interest`;
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json();

      const places = (data.results || []).slice(0, 2);
      for (const place of places) {
        let imageUrl = null;
        if (place.photos && place.photos[0]?.photo_reference) {
          imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${GOOGLE_API_KEY}`;
        }
        results.push({
          id: place.place_id,
          type: cat.type,
          title: place.name,
          location: place.formatted_address || place.vicinity || region,
          description: place.editorial_summary?.overview || `Highly-rated ${cat.type} in ${region} — rated ${place.rating || "N/A"} ★`,
          mapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
          rating: place.rating,
          imageUrl,
        });
      }
    }

    return res.json({ events: results, source: "google_places" });
  } catch (e) {
    console.error("Event discovery error:", e);
    return res.status(500).json({ error: "Failed to fetch events" });
  }
});

// ─── MILESTONE 7: USER MEMORY (preferences) ───────────────────────────────────
app.post("/api/memory", requireAuth, async (req, res) => {
  const { preferences } = req.body;
  // SECURITY: user id from verified JWT — previously anyone could overwrite
  // any user's stored preference profile by sending an arbitrary userId.
  const userId = req.user.id;
  if (!preferences) return res.status(400).json({ error: "preferences required" });
  try {
    const { data, error } = await supabase
      .from("user_memory")
      .upsert({ user_id: userId, preferences, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return res.json({ success: true, memory: data });
  } catch (e) {
    console.error("Save memory error:", e);
    return res.status(500).json({ error: "Failed to save preferences" });
  }
});

app.get("/api/memory", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("user_memory")
      .select("*")
      .eq("user_id", req.user.id)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return res.json({ memory: data || null });
  } catch (e) {
    console.error("Fetch memory error:", e);
    return res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

// Simple health check for uptime monitors and deployment platforms
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// DEPLOYMENT FIX: hosts like Render/Railway assign the port via process.env.PORT.
// Hardcoding 8888 (as before) breaks production deploys.
const PORT = process.env.PORT || 8888;
app.listen(PORT, () => console.log(`API is running on port ${PORT}`));


function findMatchingPreFetchedPlace(title, category, realPlaces) {
  if (!realPlaces) return null;
  const normalizedTitle = (title || "").toLowerCase();

  let list = [];
  if (category === 'food') {
    list = realPlaces.restaurants || [];
  } else if (category === 'hotel') {
    list = realPlaces.hotels || [];
  } else {
    list = realPlaces.attractions || [];
  }

  // Find exact or substring match
  const match = list.find(p =>
    normalizedTitle.includes(p.name.toLowerCase()) ||
    p.name.toLowerCase().includes(normalizedTitle)
  );

  return match;
}

async function enrichItineraryPlaces(itinerary, realPlaces) {
  if (!itinerary || !itinerary.days) return itinerary;

  const key = process.env.GOOGLE_MAPS_KEY;

  // 1. Resolve hotelRecommendation first so we can use its location as a fallback for rest/arrival activities
  if (itinerary.hotelRecommendation) {
    const hotelMatch = findMatchingPreFetchedPlace(itinerary.hotelRecommendation.name, 'hotel', realPlaces);
    if (hotelMatch) {
      itinerary.hotelRecommendation.name = hotelMatch.name;
      itinerary.hotelRecommendation.neighborhood = hotelMatch.address;
      itinerary.hotelRecommendation.place = {
        placeId: hotelMatch.placeId,
        address: hotelMatch.address,
        lat: hotelMatch.lat,
        lng: hotelMatch.lng,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotelMatch.name + " " + hotelMatch.address)}&query_place_id=${hotelMatch.placeId}`
      };
    } else if (key) {
      try {
        const resolved = await lookupPlace(itinerary.hotelRecommendation.name, itinerary.plan?.region || "");
        if (resolved) {
          itinerary.hotelRecommendation.place = resolved;
          itinerary.hotelRecommendation.neighborhood = resolved.address;
          itinerary.hotelRecommendation.name = resolved.name || itinerary.hotelRecommendation.name;
        }
      } catch (e) {
        console.warn(`Failed to resolve hotel:`, e.message);
      }
    }
  }

  for (const day of itinerary.days) {
    if (!day.activities) continue;
    for (const act of day.activities) {
      // If it's a rest activity and we have a hotel place, pre-populate it
      if (act.category === 'rest' && itinerary.hotelRecommendation?.place) {
        act.place = { ...itinerary.hotelRecommendation.place };
        act.location = itinerary.hotelRecommendation.name;
        if (!act.title || act.title.trim() === "") {
          act.title = "Rest at Hotel";
        }
      } else {
        // 2. Try to find a match in the pre-fetched places list
        let match = findMatchingPreFetchedPlace(act.title, act.category, realPlaces);

        if (match) {
          act.place = {
            placeId: match.placeId,
            address: match.address,
            lat: match.lat,
            lng: match.lng,
            rating: match.rating || undefined,
            mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.name + " " + match.address)}&query_place_id=${match.placeId}`
          };
          act.title = match.name;
          act.location = match.address;
        } else if (act.category !== 'rest' && key && act.title && act.title.trim() !== "") {
          // Fallback: Perform a real-time lookup using Google Maps Place API
          try {
            const resolved = await lookupPlace(act.title, itinerary.plan?.region || "");
            if (resolved) {
              act.place = resolved;
              act.location = resolved.address;
              act.title = resolved.name || act.title;
            }
          } catch (e) {
            console.warn(`Failed to resolve place for ${act.title}:`, e.message);
          }
        }
      }

      // Final fallback for any activity (including rest) if place/location is still empty
      if (!act.place && itinerary.hotelRecommendation?.place) {
        act.place = { ...itinerary.hotelRecommendation.place };
        act.location = itinerary.hotelRecommendation.name;
      }
      if (!act.title || act.title.trim() === "") {
        act.title = act.category === 'food' ? "Dining Stop" : act.category === 'rest' ? "Rest at Hotel" : "Activity Stop";
      }

      // Do the same for alternatives!
      if (act.alternatives) {
        for (const alt of act.alternatives) {
          let altMatch = findMatchingPreFetchedPlace(alt.title, act.category, realPlaces);
          if (altMatch) {
            alt.place = {
              placeId: altMatch.placeId,
              address: altMatch.address,
              lat: altMatch.lat,
              lng: altMatch.lng,
              rating: altMatch.rating || undefined,
              mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(altMatch.name + " " + altMatch.address)}&query_place_id=${altMatch.placeId}`
            };
            alt.title = altMatch.name;
            alt.location = altMatch.address;
          } else if (alt.category !== 'rest' && key && alt.title && alt.title.trim() !== "") {
            try {
              const resolved = await lookupPlace(alt.title, itinerary.plan?.region || "");
              if (resolved) {
                alt.place = resolved;
                alt.location = resolved.address;
                alt.title = resolved.name || alt.title;
              }
            } catch (e) {
              console.warn(`Failed to resolve place for alternative ${alt.title}:`, e.message);
            }
          }

          // Fallback for alternatives
          if (!alt.place && itinerary.hotelRecommendation?.place) {
            alt.place = { ...itinerary.hotelRecommendation.place };
            alt.location = itinerary.hotelRecommendation.name;
          }
          if (!alt.title || alt.title.trim() === "") {
            alt.title = alt.category === 'food' ? "Alternative Dining" : "Alternative Stop";
          }
        }
      }
    }
  }

  return itinerary;
}

async function lookupPlace(query, regionHint) {
  const key = process.env.GOOGLE_MAPS_KEY;
  if (!key) return null;

  // 1. Text Search to get the Place ID
  const searchUrl =
    "https://maps.googleapis.com/maps/api/place/textsearch/json" +
    `?query=${encodeURIComponent(query + " " + regionHint)}` +
    `&key=${key}`;

  const searchResp = await fetch(searchUrl);
  const searchData = await searchResp.json();

  const top = searchData.results?.[0];
  if (!top) return null;

  const placeId = top.place_id;

  // 2. Place Details to get Real-Time Opening Hours
  const detailsUrl =
    "https://maps.googleapis.com/maps/api/place/details/json" +
    `?place_id=${placeId}&fields=name,formatted_address,geometry,opening_hours,rating&key=${key}`;

  const detailsResp = await fetch(detailsUrl);
  const detailsData = await detailsResp.json();
  const details = detailsData.result || {};

  const address = details.formatted_address || top.formatted_address;
  const lat = details.geometry?.location?.lat || top.geometry?.location?.lat;
  const lng = details.geometry?.location?.lng || top.geometry?.location?.lng;
  const rating = details.rating || top.rating || undefined;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query + " " + address
  )}&query_place_id=${placeId}`;

  return {
    placeId,
    address,
    lat,
    lng,
    rating,
    mapsUrl,
    isOpenNow: details.opening_hours?.open_now,
    weekdayText: details.opening_hours?.weekday_text
  };
}