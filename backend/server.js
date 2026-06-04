import express from "express";
import cors from "cors";
import "dotenv/config";
// Only needed if Node < 18. If Node 18+, remove this import and uninstall node-fetch.
import fetch from "node-fetch";
import { SYSTEM_CHAT_INSTRUCTION, getGeneratorPrompt } from "./prompts.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

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

function buildPrompt(plan, chatHistory) {
  const durationDays =
    Math.floor((new Date(plan.leaveDate) - new Date(plan.arrivalDate)) / (1000 * 60 * 60 * 24)) + 1;

  const chatContext = chatHistory && chatHistory.length > 0
    ? `Here is the conversation history where the traveler discussed their preferences:\n${chatHistory.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}`
    : `Hobbies: ${plan.hobbies?.join(', ')}`;

  return getGeneratorPrompt(plan, durationDays, chatContext);
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

  plan.region = capitalizeRegion(plan.region);

  try {
    let raw = "";
    let success = false;

    if (process.env.GEMINI_API_KEY) {
      try {
        raw = await runAgent(plan, chatHistory);
        success = true;
      } catch (geminiError) {
        console.warn("Gemini agent failed/quota exceeded, trying Ollama...", geminiError.message);
      }
    }

    if (!success) {
      try {
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

        if (ollamaRes.ok) {
          const data = await ollamaRes.json();
          raw = (data.response || "").trim();
          success = true;
        } else {
          console.warn("Ollama API failed to respond successfully.");
        }
      } catch (ollamaError) {
        console.warn("Local Ollama fallback failed or not running:", ollamaError.message);
      }
    }

    if (!success) {
      // Ultimate mock fallback so the application never breaks
      console.warn("Using ultimate mock fallback itinerary generator.");
      const start = new Date(plan.arrivalDate);
      const end = new Date(plan.leaveDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

      const mockDays = [];
      const activitiesPool = [
        { time: "09:00 AM", category: "nature", title: "Local Park & Morning Stroll", desc: "Enjoy a peaceful walk around the most scenic local park and experience the morning breeze." },
        { time: "11:30 AM", category: "food", title: "Famous Local Bistro", desc: "Savor a delicious lunch featuring regional specialties and fresh ingredients." },
        { time: "02:00 PM", category: "museum", title: "City Cultural Museum", desc: "Explore local heritage, arts, and historic artifacts highlighting the region's rich culture." },
        { time: "05:00 PM", category: "shopping", title: "Downtown Shopping District", desc: "Stroll through vibrant local boutiques, souvenir shops, and street markets." },
        { time: "07:30 PM", category: "food", title: "Chef's Table Dinner", desc: "Experience a highly-rated dining spot known for its amazing hospitality and gourmet dishes." }
      ];

      for (let i = 0; i < Math.min(diffDays, 14); i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);

        mockDays.push({
          dayNumber: i + 1,
          date: currentDate.toISOString(),
          activities: activitiesPool.map(act => ({
            time: act.time,
            location: `${act.title} in ${plan.region}`,
            description: act.desc,
            category: act.category,
            cost: "$10 - $45",
            duration: "2 hours"
          }))
        });
      }

      const mockItinerary = {
        plan: {
          region: plan.region,
          arrivalDate: plan.arrivalDate,
          leaveDate: plan.leaveDate
        },
        days: mockDays
      };

      raw = JSON.stringify(mockItinerary);
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
    const currentDateTime = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });

    if (key) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
        const contents = messages
          .filter(m => m && typeof m.text === 'string' && m.text.trim())
          .map(m => ({
            role: m.role === 'ai' ? 'model' : 'user',
            parts: [{ text: m.text }]
          }));

        const systemInstruction = {
          parts: [{
            text: `${SYSTEM_CHAT_INSTRUCTION}\n\n[Current Date and Time: ${currentDateTime}]`
          }]
        };

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents, systemInstruction })
        });

        if (response.ok) {
          const data = await response.json();
          const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            return res.json({ text: replyText });
          }
        } else {
          console.warn(`Gemini API quota or call failed: ${await response.text()}. Attempting fallback...`);
        }
      } catch (geminiError) {
        console.error("Gemini API call failed:", geminiError);
      }
    }

    // Fallback 1: Local Ollama
    try {
      const prompt = `${SYSTEM_CHAT_INSTRUCTION}

[Current Date and Time: ${currentDateTime}]

Conversation history:
${messages.map(m => `${m.role === 'ai' ? 'model' : 'user'}: ${m.text}`).join('\n')}

Model reply:`;

      const ollamaRes = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemma3:latest",
          prompt,
          stream: false,
          options: { temperature: 0.7 },
        }),
      });

      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        const replyText = (data.response || "").trim();
        if (replyText) {
          return res.json({ text: replyText });
        }
      }
    } catch (ollamaError) {
      console.warn("Local Ollama fallback failed or not running:", ollamaError.message);
    }

    // Fallback 2: Canned response matching
    const lastUserText = (messages[messages.length - 1]?.text || "").toLowerCase();
    let replyText = "Got it! What other activities, hobbies, or food preferences do you have? Or just type 'good to go' when you're ready to generate the schedule!";

    if (lastUserText.includes("yes") || lastUserText.includes("flight") || lastUserText.includes("arrive") || lastUserText.includes("leave") || /\b\d{1,2}(:\d{2})?\s*(am|pm)?\b/i.test(lastUserText)) {
      replyText = "Awesome, noted! Let me know if there are any specific activities, restaurants, or sights you'd like to include, or say 'good to go' to build your schedule!";
    } else if (lastUserText.includes("no") || lastUserText.includes("haven't") || lastUserText.includes("not yet")) {
      replyText = "No problem! You can check the flights page using the menu on the left. Once you're ready to plan your activities, what other hobbies or preferences do you have? Or say 'good to go' to build the itinerary!";
    }

    return res.json({ text: replyText });
  } catch (e) {
    console.error("Chat route critical failure:", e);
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
