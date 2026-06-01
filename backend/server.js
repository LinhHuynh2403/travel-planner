import express from "express";
import cors from "cors";
import "dotenv/config";
// Only needed if Node < 18. If Node 18+, remove this import and uninstall node-fetch.
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

function buildPrompt(plan) {
  const durationDays =
    Math.floor((new Date(plan.leaveDate) - new Date(plan.arrivalDate)) / (1000 * 60 * 60 * 24)) + 1;

  return `
You are an expert travel agent. Create a ${durationDays}-day itinerary.

Return ONLY valid JSON (no markdown, no extra text) that matches EXACTLY:

{
  "hotelRecommendation": {
    "name": "string",
    "neighborhood": "string",
    "reasoning": "string"
  },
  "plan": {
    "region": string,
    "arrivalDate": "YYYY-MM-DD",
    "leaveDate": "YYYY-MM-DD",
    "hobbies": string[],
    "favoriteFood": string[],
    "restaurantPreferences": string[],
    "placePreferences": string[]
  },
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dayNumber": number,
      "activities": [
        {
          "time": "h:mm AM/PM",
          "title": string,
          "description": string,
          "category": "food|museum|exhibition|nature|activity|shopping|rest",
          "location": string,
          "deepDiveRationale": "string (Explain why based on user's hobbies/food)"
        }
      ]
    }
  ]
}

Rules:
- Use the user's preferences heavily (checkboxes + hobbies + favoriteFood).
- Make each day realistic (4–7 activities).
- Arrival day is lighter; departure day ends with "Departure".
- Do not invent impossible things (e.g., “Eiffel Tower” if region is not Paris).
- Keep categories only from allowed list.

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

app.post("/api/itinerary", async (req, res) => {
  const plan = req.body;

  if (!plan?.region || !plan?.arrivalDate || !plan?.leaveDate) {
    return res.status(400).json({ error: "Missing required fields: region, arrivalDate, leaveDate" });
  }

  const prompt = buildPrompt(plan);

  try {
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
    const raw = (data.response || "").trim();
    const jsonText = extractJson(raw);

    let itinerary;
    try {
      itinerary = JSON.parse(jsonText);
    } catch {
      return res.status(500).json({ error: "Failed to parse JSON from model", raw });
    }

    // ✅ Sanitize categories (prevents UI crash)
    const allowed = new Set(["food", "museum", "exhibition", "nature", "activity", "shopping", "rest"]);
    for (const day of itinerary.days || []) {
      for (const a of day.activities || []) {
        const c = String(a.category || "").toLowerCase();
        a.category = allowed.has(c) ? c : "activity";
      }
    }

    // ✅ Attach lat/lng for Google Maps pins
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
