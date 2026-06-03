import express from "express";
import cors from "cors";
import "dotenv/config";
// Only needed if Node < 18. If Node 18+, remove this import and uninstall node-fetch.
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

function buildPrompt(plan, chatHistory) {
  const durationDays =
    Math.floor((new Date(plan.leaveDate) - new Date(plan.arrivalDate)) / (1000 * 60 * 60 * 24)) + 1;

  const chatContext = chatHistory && chatHistory.length > 0
    ? `Here is the conversation history where the traveler discussed their preferences:\n${chatHistory.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}`
    : `Hobbies: ${plan.hobbies?.join(', ')}`;

  return `
You are Wandr, an expert AI travel assistant specializing in creating highly personalized, detail-heavy itineraries and organized packing lists.
Your goal is to generate a practical, organized, and destination-aware travel schedule and packing checklist based on the traveler's details.

When planning this trip, you must:
1. Build a detailed day-by-day schedule with exact times (e.g., 09:00–11:00) that aligns with their hobbies and interests.
2. Formulate a personalized packing list (under the "packingList" key) considering:
   - Destination country and city (${plan.region})
   - Dates of travel (${plan.arrivalDate} to ${plan.leaveDate}, total ${durationDays} days)
   - Expected weather and season (Analyze the forecast to suggest clothing layers, rain gear, sun protection, or winter gear)
   - Planned activities (Suggest items needed for specific outings like hiking, swimming, dining, etc.)
   - Local culture, customs, and religious expectations (Temples, mosques, churches, or sacred sites requiring modest clothing)
   - Traveler Preferences & Conversation Context:
     ${chatContext}
3. Organize the packing items into distinct categories under the "packingList" JSON array:
   - "Clothing"
   - "Footwear"
   - "Toiletries"
   - "Electronics"
   - "Health & Medication"
   - "Activity-Specific Items"
   - "Cultural Considerations"
   - "Optional Items"
4. Explain why unusual or destination-specific items are recommended within their item descriptions (e.g., "Modest clothing (covering knees/shoulders) for temples", "Umbrella for sudden July rain").
5. Avoid recommending unnecessary items. Keep the list concise and relevant.

CRITICAL: Return ONLY valid JSON (no markdown, no extra text) that matches EXACTLY:

{
  "hotelRecommendation": {
    "name": "string",
    "neighborhood": "string",
    "reasoning": "string"
  },
  "plan": {
    "region": "${plan.region}",
    "arrivalDate": "${plan.arrivalDate}",
    "leaveDate": "${plan.leaveDate}",
    "hobbies": [],
    "favoriteFood": [],
    "restaurantPreferences": [],
    "placePreferences": []
  },
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dayNumber": 1,
      "activities": [
        {
          "time": "h:mm AM/PM",
          "title": "string",
          "description": "string",
          "category": "food|museum|exhibition|nature|activity|shopping|rest",
          "location": "string",
          "deepDiveRationale": "string (Explain why based on user's hobbies/food)"
        }
      ]
    }
  ],
  "packingList": [
    {
      "category": "string (e.g. Clothing, Tech, Health)",
      "items": ["string"]
    }
  ],
  "flights": [
    {
      "id": 1,
      "airline": "string (name of airline operating this route, e.g. Air France, ANA)",
      "price": 100,
      "departureTime": "h:mm AM/PM",
      "arrivalTime": "h:mm AM/PM",
      "duration": "e.g. 10h 30m",
      "stops": "e.g. Non-stop or 1 stop",
      "tags": ["string (e.g. budget, comfort, morning departure)"],
      "aiReasoning": "string (why this flight fits the user's travel schedule/dates)"
    }
  ],
  "insights": {
    "weatherOverview": "string (brief summary of what weather to expect in this region during these dates)",
    "culturalTips": ["string (etiquette, tipping customs, greetings, dress codes, etc.)"],
    "safetyTips": ["string (safety warnings, scan avoidance, local emergency info)"]
  }
}

User input:
${JSON.stringify(plan, null, 2)}
  `.trim();
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

  const prompt = buildPrompt(plan, chatHistory);

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

app.post("/api/itinerary", async (req, res) => {
  const payload = req.body;
  const plan = payload.plan || payload;
  const chatHistory = payload.chatHistory || [];

  if (!plan?.region || !plan?.arrivalDate || !plan?.leaveDate) {
    return res.status(400).json({ error: "Missing required fields: region, arrivalDate, leaveDate" });
  }

  try {
    let raw = "";
    if (process.env.GEMINI_API_KEY) {
      raw = await runAgent(plan, chatHistory);
    } else {
      // Fallback to local Ollama if no Gemini key
      const prompt = buildPrompt(plan, chatHistory);
      const ollamaRes = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemma3:latest",
          prompt,
          stream: false,
          options: { temperature: 0.4 },
        }),
      });

      if (!ollamaRes.ok) {
        const t = await ollamaRes.text();
        return res.status(500).json({ error: "Ollama error", details: t });
      }

      const data = await ollamaRes.json();
      raw = (data.response || "").trim();
    }

    const jsonText = extractJson(raw);

    let itinerary;
    try {
      itinerary = JSON.parse(jsonText);
    } catch {
      return res.status(500).json({ error: "Failed to parse JSON from model", raw });
    }

    // Sanitize categories
    const allowed = new Set(["food", "museum", "exhibition", "nature", "activity", "shopping", "rest"]);
    for (const day of itinerary.days || []) {
      for (const a of day.activities || []) {
        const c = String(a.category || "").toLowerCase();
        a.category = allowed.has(c) ? c : "activity";
      }
    }

    // Attach lat/lng for Google Maps pins
    for (const day of itinerary.days || []) {
      for (const a of day.activities || []) {
        if (!a.location) continue;
        const place = await lookupPlace(a.location, itinerary.plan?.region || plan.region);
        if (place) a.place = place;
      }
    }

    return res.json(itinerary);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server failed", details: String(e) });
  }
});

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing messages array" });
  }

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return res.json({ text: "Got it! Are you ready to generate the itinerary? Type 'good to go' to start." });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const contents = messages
      .filter(m => m && typeof m.text === 'string' && m.text.trim())
      .map(m => ({
        role: m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }));

    const systemInstruction = {
      parts: [{
        text: `You are Wandr, a conversational travel assistant helping the traveler plan a custom itinerary.
Your primary directive is to keep the conversation going to discover their interests, hobbies, food preferences, and planned activities.
Do not output any JSON or final itineraries. Just converse like a friendly travel agent.
Keep asking questions, exploring what they want to do.
Ask if they are finished with their plan or if they are ready to generate the schedule.
Tell them: "Let me know when you are finished or type 'good to go' when you're ready to generate your schedule!"
Keep your replies brief, engaging, and clear (no more than 2-3 sentences).`
      }]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents, systemInstruction })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${await response.text()}`);
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Excellent details! Are you ready to generate the plan? Type 'good to go' when you are!";
    return res.json({ text: replyText });
  } catch (e) {
    console.error("Chat error:", e);
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
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photos[0].photo_reference}&key=${key}`
        : null
    }));
    return res.json({ places });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

app.listen(8888, () => console.log("API running at http://localhost:8888"));

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
