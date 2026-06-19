import express from "express";
import cors from "cors";
import "dotenv/config";
import { supabase } from "./db.js";
import fetch from "node-fetch";
import { SYSTEM_CHAT_INSTRUCTION, getDeterministicGeneratorPrompt } from "./prompts.js";
import { REGIONAL_LOGISTICS } from "./logisticsData.js"; // Added Missing Import

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

function buildPrompt(plan, chatHistory, realPlaces = {}, memoryProfile = null) {
  const durationDays =
    Math.floor((new Date(plan.leaveDate) - new Date(plan.arrivalDate)) / (1000 * 60 * 60 * 24)) + 1;

  const chatContext = chatHistory && chatHistory.length > 0
    ? `Conversation history regarding user specifications:\n${chatHistory.filter(m => m).map(m => `${(m.role || 'user').toUpperCase()}: ${m.text || ''}`).join('\n')}`
    : `Hobbies: ${plan.hobbies?.join(', ')}`;

  return getDeterministicGeneratorPrompt(plan, durationDays, chatContext, realPlaces, memoryProfile);
}

async function getUserLocation() {
  try {
    const res = await fetch("http://ip-api.com/json");
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === "success") {
        return {
          city: data.city || "San Jose",
          country: data.country || "United States",
          timezone: data.timezone || "America/Los_Angeles"
        };
      }
    }
  } catch (err) {
    console.warn("Could not geolocate user via IP:", err.message);
  }
  return {
    city: "San Jose",
    country: "United States",
    timezone: "America/Los_Angeles"
  };
}

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
    return data.results ? data.results.slice(0, 3) : data;
  } catch (e) {
    return { error: String(e) };
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

  while (true) {
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
      return data.results.slice(0, 8).map(p => ({
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
    }).slice(0, 15);

    const attractionLists = await Promise.all(uniqueQueries.attractions.map(q => fetchAndFormat(q)));
    const rawAttractions = attractionLists.flat();
    const seenAttrIds = new Set();
    results.attractions = rawAttractions.filter(a => {
      if (seenAttrIds.has(a.placeId)) return false;
      seenAttrIds.add(a.placeId);
      return true;
    }).slice(0, 15);
  } catch (err) {
    console.error("Failed to pre-fetch places details:", err);
  }

  return results;
}

async function calculateTravelTime(origin, destination, key) {
  if (!origin || !origin.lat || !origin.lng || !destination || !destination.lat || !destination.lng) return null;

  const distEst = Math.sqrt(Math.pow(origin.lat - destination.lat, 2) + Math.pow(origin.lng - destination.lng, 2));
  const mode = distEst < 0.015 ? "walking" : "driving"; // roughly ~1.5km threshold

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&mode=${mode}&key=${key}`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    const element = data.rows?.[0]?.elements?.[0];
    if (element && element.status === "OK") {
      const durationText = element.duration?.text || "";
      return `${durationText} ${mode === "walking" ? "walk" : "drive"}`;
    }
  } catch (e) {
    console.warn("Distance Matrix API call failed:", e.message);
  }
  return null;
}

async function fetchTimezone(lat, lng, key) {
  const timestamp = Math.floor(Date.now() / 1000);
  const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${key}`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    if (data && data.status === "OK") {
      return {
        timezoneId: data.timeZoneId,
        timezoneName: data.timeZoneName,
      };
    }
  } catch (e) {
    console.warn("Time Zone API call failed:", e.message);
  }
  return null;
}
async function extractPlanFromChatHistory(chatHistory) {
  const currentDateTime = new Date();
  const defaultArrival = new Date(currentDateTime);
  defaultArrival.setDate(defaultArrival.getDate() + 30);
  const defaultLeave = new Date(defaultArrival);
  defaultLeave.setDate(defaultLeave.getDate() + 7);

  const prompt = `Analyze this travel planner conversation history and extract the core details:
1. Region/Destination (e.g. "Tokyo, Japan" or "Paris, France").
2. Arrival Date (format YYYY-MM-DD. If year is omitted, assume the next occurrence. Default to: ${defaultArrival.toISOString().split('T')[0]}).
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
    // 1. Try Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
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

app.post("/api/itinerary", async (req, res) => {
  const payload = req.body;
  let plan = payload.plan || payload || {};
  const chatHistory = payload.chatHistory || [];

  if (!plan?.region || !plan?.arrivalDate || !plan?.leaveDate) {
    console.log("Missing plan details, extracting from chat history...");
    const extractedPlan = await extractPlanFromChatHistory(chatHistory);
    plan = { ...plan, ...extractedPlan };
  }

  plan.region = capitalizeRegion(plan.region || "Tokyo, Japan");

  try {
    const durationDays =
      Math.floor((new Date(plan.leaveDate) - new Date(plan.arrivalDate)) / (1000 * 60 * 60 * 24)) + 1;

    const chatContext = chatHistory && chatHistory.length > 0
      ? `Here is the conversation history where the traveler discussed their preferences:\n${chatHistory.filter(m => m).map(m => `${(m.role || 'user').toUpperCase()}: ${m.text || ''}`).join('\n')}`
      : `Hobbies: ${plan.hobbies?.join(', ')}`;

    console.log(`Pre-fetching real locations in ${plan.region} from Places API...`);
    const realPlaces = await fetchRealPlaces(plan);

    // Fetch user memory profile to inject into AI prompt
    let memoryProfile = null;
    const userId = payload.userId;
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

    const prompt = getDeterministicGeneratorPrompt(plan, durationDays, chatContext, realPlaces, memoryProfile);

    let raw = "";
    let success = false;

    // 1. Fire generation pipelines (Ollama falling back to OpenRouter/Mock)
    try {
      const bestModel = await getBestOllamaModel("qwen3:8b");
      const ollamaRes = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: bestModel, prompt, stream: false, options: { temperature: 0.4 } }),
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
        console.log("Sending itinerary generation prompt to Gemini API...");
        const geminiKey = process.env.GEMINI_API_KEY;
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

        const geminiRes = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.4,
              responseMimeType: "application/json"
            }
          })
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
            max_tokens: 4000
          })
        });

        if (orRes.ok) {
          const orData = await orRes.json();
          if (orData.choices && orData.choices[0].message.content) {
            raw = orData.choices[0].message.content.trim();
            success = true;
            console.log("Successfully generated itinerary via OpenRouter API!");
          }
        }
      } catch (orError) {
        console.warn("OpenRouter API itinerary generation failed.", orError.message);
      }
    }

    let itinerary;
    if (success && raw) {
      try {
        const jsonText = extractJson(raw);
        itinerary = JSON.parse(jsonText);
      } catch (parseErr) {
        console.error("Model JSON parse failed:", parseErr);
        return res.status(500).json({ error: "Failed to parse itinerary generated by AI. Please try again.", details: String(parseErr) });
      }
    } else {
      console.error("All LLM pipelines failed or key was invalid.");
      return res.status(500).json({ error: "Failed to generate itinerary. No active LLM pipeline succeeded." });
    }

    // Enrich itinerary activities and alternatives with real Google Places coordinates/addresses
    console.log("Enriching itinerary with verified coordinates and locations...");
    itinerary = await enrichItineraryPlaces(itinerary, realPlaces);

    // Standardize baseline fallback insights configurations...
    const regionName = itinerary.plan?.region || plan.region;

    // 2. FEATURE INTEGRATION: Enforce Automated SIM and Transit Card Processing Mechanics
    const matchedCountryKey = Object.keys(REGIONAL_LOGISTICS).find(country =>
      regionName.toLowerCase().includes(country.toLowerCase())
    );

    if (!itinerary.insights) {
      itinerary.insights = { weatherOverview: "", culturalTips: [], safetyTips: [], customsRestrictions: [] };
    }

    // Safety Assistant enrichment
    if (!itinerary.insights.emergencyNumbers) {
      if (regionName.toLowerCase().includes("japan") || regionName.toLowerCase().includes("tokyo")) {
        itinerary.insights.emergencyNumbers = { police: "110", ambulance: "119", fire: "119", touristPolice: "03-3501-0110 (Met Police)" };
      } else if (regionName.toLowerCase().includes("korea") || regionName.toLowerCase().includes("seoul")) {
        itinerary.insights.emergencyNumbers = { police: "112", ambulance: "119", fire: "119", touristPolice: "1330 (Tourist Hotline)" };
      } else if (regionName.toLowerCase().includes("singapore")) {
        itinerary.insights.emergencyNumbers = { police: "999", ambulance: "995", fire: "995", touristPolice: "1800 255 0000" };
      } else if (regionName.toLowerCase().includes("france") || regionName.toLowerCase().includes("paris")) {
        itinerary.insights.emergencyNumbers = { police: "17", ambulance: "15", fire: "18", touristPolice: "112 (European Emergency)" };
      } else {
        itinerary.insights.emergencyNumbers = { police: "112", ambulance: "112", fire: "112", touristPolice: "Check Local Directory" };
      }
    }

    if (!itinerary.insights.safeNeighborhoods || itinerary.insights.safeNeighborhoods.length === 0) {
      if (regionName.toLowerCase().includes("japan") || regionName.toLowerCase().includes("tokyo")) {
        itinerary.insights.safeNeighborhoods = ["Chiyoda", "Minato", "Meguro", "Setagaya", "Shibuya (most areas)"];
      } else if (regionName.toLowerCase().includes("korea") || regionName.toLowerCase().includes("seoul")) {
        itinerary.insights.safeNeighborhoods = ["Mapo-gu", "Jongno-gu", "Seocho-gu", "Gangnam-gu", "Songpa-gu"];
      } else if (regionName.toLowerCase().includes("singapore")) {
        itinerary.insights.safeNeighborhoods = ["Marina Bay", "Orchard", "Tiong Bahru", "Tampines", "Queenstown"];
      } else if (regionName.toLowerCase().includes("france") || regionName.toLowerCase().includes("paris")) {
        itinerary.insights.safeNeighborhoods = ["1st Arr. (Louvre)", "4th Arr. (Marais)", "5th Arr. (Latin Quarter)", "6th Arr. (St. Germain)", "7th Arr. (Eiffel Tower)"];
      } else {
        itinerary.insights.safeNeighborhoods = ["City Center", "Tourist Safe Zones", "Central Business District"];
      }
    }

    if (!itinerary.insights.commonScams || itinerary.insights.commonScams.length === 0) {
      if (regionName.toLowerCase().includes("japan") || regionName.toLowerCase().includes("tokyo")) {
        itinerary.insights.commonScams = ["Nightclub cover charge tricks in Kabukicho", "Fake charity petition signing", "Overpriced bar recommendations from street touts"];
      } else if (regionName.toLowerCase().includes("korea") || regionName.toLowerCase().includes("seoul")) {
        itinerary.insights.commonScams = ["Traditional tea ceremony invitation scam (cult-run)", "Overcharging by unregistered orange airport taxis", "High-pressure sales at unauthorized herbal shops"];
      } else if (regionName.toLowerCase().includes("singapore")) {
        itinerary.insights.commonScams = ["Sim card overcharging at unlicensed retail shops", "Rental deposit scams on social media", "Pre-payment demand for unregistered private sightseeing tours"];
      } else if (regionName.toLowerCase().includes("france") || regionName.toLowerCase().includes("paris")) {
        itinerary.insights.commonScams = ["The gold ring scam around Jardin des Tuileries", "Friendship bracelet scams around Sacré-Cœur steps", "Distraction pickpocketing near major subway gates"];
      } else {
        itinerary.insights.commonScams = ["Unlicensed airport taxi overcharging", "High-pressure local souvenir pricing", "Pickpocketing in crowded markets"];
      }
    }

    if (matchedCountryKey) {
      const logisticsData = REGIONAL_LOGISTICS[matchedCountryKey];

      // Inject safety instructions and connectivity tips straight into our runtime payload
      itinerary.insights.culturalTips.unshift(`Logistics Tip: ${logisticsData.connectivity}`);
      itinerary.insights.safetyTips.unshift(`Transit Notice: ${logisticsData.transit}`);

      itinerary.logisticsGuide = {
        connectivity: logisticsData.connectivity,
        transitCards: logisticsData.transit
      };
    } else if (!itinerary.logisticsGuide) {
      itinerary.logisticsGuide = {
        connectivity: "Pre-book a local eSIM (like Airalo) or pick up a data SIM at the airport arrival terminal counters.",
        transitCards: "Look up standard regional tap-and-go cards or contactless mobile payment turnstiles."
      };
    }

    // ... Keep your final pipeline components: coordinate validation matrix, timezone resolution logic, and final returns intact ...
    return res.json(itinerary);
  } catch (e) {
    console.error("Critical failure in itinerary route:", e);
    return res.status(500).json({ error: "Server failed", details: String(e) });
  }
});

app.post("/api/chat", async (req, res) => {
  const { messages, text, sessionId, userId } = req.body;
  let chatHistory = messages || [];
  let dbAvailable = false;

  // If frontend is sending the new DB payload format:
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

  try {
    const currentDateTime = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
    let replyText = "";
    let success = false;

    // 1. Try Local Ollama first (prioritizing qwen3:8b)
    try {
      const bestModel = await getBestOllamaModel("qwen3:8b");
      const prompt = `${SYSTEM_CHAT_INSTRUCTION}

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

    // 1.5 Try OpenRouter API if Ollama fails
    if (!success && process.env.OPENROUTER_API_KEY) {
      try {
        console.log("Sending chat prompt to OpenRouter API (Qwen)...");
        const openRouterKey = process.env.OPENROUTER_API_KEY;
        const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

        const orMessages = [
          { role: 'system', content: `${SYSTEM_CHAT_INSTRUCTION}\nCurrent Date: ${currentDateTime}` },
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
            "HTTP-Referer": "https://jourzy-travel.vercel.app",
            "X-Title": "JourZy Travel"
          },
          body: JSON.stringify({
            model: "qwen/qwen-2.5-72b-instruct",
            messages: orMessages,
            temperature: 0.7,
            max_tokens: 150
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

    // 1.7 Try Gemini API if OpenRouter and Ollama fail
    if (!success && process.env.GEMINI_API_KEY) {
      try {
        console.log("Sending chat prompt to Gemini API...");
        const geminiKey = process.env.GEMINI_API_KEY;
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;

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
              parts: [{ text: `${SYSTEM_CHAT_INSTRUCTION}\nCurrent Date: ${currentDateTime}` }]
            },
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 250
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

    // 2. Fallback: Canned response matching
    if (!success) {
      console.warn("Using canned response fallback for chat.");
      const lastUserText = (chatHistory[chatHistory.length - 1]?.text || "").toLowerCase();
      replyText = "Got it! What other activities, hobbies, or food preferences do you have? Or just type 'good to go' when you're ready to generate the schedule!";

      if (lastUserText.includes("yes") || lastUserText.includes("flight") || lastUserText.includes("arrive") || lastUserText.includes("leave") || /\b\d{1,2}(:\d{2})?\s*(am|pm)?\b/i.test(lastUserText)) {
        replyText = "Awesome, noted! Let me know if there are any specific activities, restaurants, or sights you'd like to include, or say 'good to go' to build your schedule!";
      } else if (lastUserText.includes("no") || lastUserText.includes("haven't") || lastUserText.includes("not yet")) {
        replyText = "No problem! You can check the flights page using the menu on the left. Once you're ready to plan your activities, what other hobbies or preferences do you have? Or say 'good to go' to build the itinerary!";
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

    return res.json({ text: replyText });
  } catch (e) {
    console.error("Chat route critical failure:", e);
    return res.status(500).json({ error: String(e) });
  }
});

app.get("/api/chat/history", async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

  try {
    const { data, error } = await supabase
      .from('chat_histories')
      .select('role, text, id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ messages: data });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

app.get("/api/weather", async (req, res) => {
  const { lat, lng, q } = req.query;
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return res.status(400).json({ error: "Missing OPENWEATHER_API_KEY" });

  let url;
  if (lat && lng) {
    url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&appid=${key}`;
  } else if (q) {
    url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(q)}&units=metric&appid=${key}`;
  } else {
    return res.status(400).json({ error: "Missing coordinates or location query" });
  }

  try {
    const resp = await fetch(url);
    const data = await resp.json();
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
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
    return res.status(500).json({ error: String(e) });
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
    return res.status(500).send(String(e));
  }
});

app.get("/api/place-lookup", async (req, res) => {
  const { query, region } = req.query;
  try {
    const place = await lookupPlace(query, region || "");
    return res.json({ place });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

app.post("/api/trips", async (req, res) => {
  const { userId, region, arrivalDate, leaveDate, budget, whoTraveling, itinerary } = req.body;

  if (!userId || !region || !arrivalDate || !leaveDate || !itinerary) {
    return res.status(400).json({ error: "Missing required fields for saving trip" });
  }

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
    const tripId = tripData[0].id;

    const { error: itineraryError } = await supabase
      .from("itineraries")
      .insert([
        {
          trip_id: tripId,
          hotel_recommendation: itinerary.hotelRecommendation || itinerary.hotel_recommendation || null,
          days: itinerary.days || [],
          packing_list: itinerary.packingList || itinerary.packing_list || null,
          insights: itinerary.insights || null
        }
      ]);

    if (itineraryError) throw itineraryError;

    return res.json({ success: true, tripId });
  } catch (e) {
    console.error("Error saving trip:", e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

app.get("/api/trips", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const { data, error } = await supabase
      .from("trips")
      .select("*, itineraries(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json({ trips: data });
  } catch (e) {
    console.error("Error fetching trips:", e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

app.get("/api/trips/:tripId", async (req, res) => {
  const { tripId } = req.params;

  try {
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .single();

    if (tripError) throw tripError;

    const { data: itinerary, error: itineraryError } = await supabase
      .from("itineraries")
      .select("*")
      .eq("trip_id", tripId)
      .single();

    if (itineraryError && itineraryError.code !== "PGRST116") throw itineraryError;

    return res.json({ trip, itinerary });
  } catch (e) {
    console.error("Error fetching trip details:", e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

app.delete("/api/trips/:tripId", async (req, res) => {
  const { tripId } = req.params;

  try {
    const { error } = await supabase
      .from("trips")
      .delete()
      .eq("id", tripId);

    if (error) throw error;
    return res.json({ success: true });
  } catch (e) {
    console.error("Error deleting trip:", e);
    return res.status(500).json({ error: e.message || String(e) });
  }
});

// ─── MILESTONE 7: EVENT DISCOVERY ─────────────────────────────────────────────
app.get("/api/events", async (req, res) => {
  const { region, arrivalDate, leaveDate } = req.query;
  const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

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
app.post("/api/memory", async (req, res) => {
  const { userId, preferences } = req.body;
  if (!userId || !preferences) return res.status(400).json({ error: "userId and preferences required" });
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
    return res.status(500).json({ error: e.message });
  }
});

app.get("/api/memory", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId required" });
  try {
    const { data, error } = await supabase
      .from("user_memory")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return res.json({ memory: data || null });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.listen(8888, () => console.log("API running at http://localhost:8888"));


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
    `?place_id=${placeId}&fields=name,formatted_address,geometry,opening_hours&key=${key}`;

  const detailsResp = await fetch(detailsUrl);
  const detailsData = await detailsResp.json();
  const details = detailsData.result || {};

  const address = details.formatted_address || top.formatted_address;
  const lat = details.geometry?.location?.lat || top.geometry?.location?.lat;
  const lng = details.geometry?.location?.lng || top.geometry?.location?.lng;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query + " " + address
  )}&query_place_id=${placeId}`;

  return {
    placeId,
    address,
    lat,
    lng,
    mapsUrl,
    isOpenNow: details.opening_hours?.open_now,
    weekdayText: details.opening_hours?.weekday_text
  };
}


