# JourZy — AI Travel Planning Agent 🗺️✨

> A conversational AI agent that turns a natural-language chat into a complete, personalized travel itinerary — lodging, attractions, routing, live weather, and packing lists — grounded in real-time data.

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="Node.js" src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white">
  <img alt="Gemini" src="https://img.shields.io/badge/LLM-Gemini%202.5%20Flash-8E75B2?logo=google&logoColor=white">
  <img alt="Ollama" src="https://img.shields.io/badge/Local%20Fallback-Ollama%20gemma3-000000?logo=ollama&logoColor=white">
  <img alt="Supabase" src="https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase&logoColor=white">
  <img alt="Deploy" src="https://img.shields.io/badge/Deployed-Vercel-000000?logo=vercel&logoColor=white">
</p>

**🌐 Live demo:** [travel-planner-ai-five-peach.vercel.app](https://travel-planner-ai-five-peach.vercel.app/)

---

## 💡 Why I built this

My parents live in Vietnam and love to travel, but planning a trip in a country they've never visited — booking flights, finding hotels, figuring out how to get around — is genuinely hard for them. My sister and I live abroad, so they'd constantly call us to plan every detail over FaceTime.

So I built JourZy: an AI travel concierge that acts as a personal tour guide in their pocket. You have a conversation with it, and it produces a full, day-by-day plan grounded in real maps, live weather, and local context — the way a knowledgeable friend would, available any time.

What started as a tool for my parents is now used by 5+ friends and family, and I've kept iterating it based on how they actually use it (a voice interface is the next feature, driven directly by user requests).

---

## 🎬 Demo

<table>
<tr>
<td width="33%">

**Conversational onboarding**
<img src="docs/demo-onboarding.png" alt="Onboarding conversation with JourZy" width="100%">

</td>
<td width="33%">

**Personalized itinerary**
<img src="docs/demo-itinerary.png" alt="Generated day-by-day itinerary" width="100%">

</td>
<td width="33%">

**Live weather, day by day**
<img src="docs/demo-weather.png" alt="Live weather forecast with hourly detail and high/low markers" width="100%">

</td>
</tr>
</table>

---

## 🧠 How it works

JourZy is an **agentic pipeline**: a conversation drives a structured planning workflow that fans out to multiple real-time data sources, then composes everything into a single itinerary.

```
User chat ──▶ Conversational onboarding (LLM)
                     │  builds a structured traveler profile
                     ▼
              Itinerary generation (LLM)
                     │  emits deterministic, schema-checked JSON
        ┌────────────┼───────────────┬──────────────┐
        ▼            ▼               ▼              ▼
   Google Places  OpenWeather   Google Maps     Flight
   (geocode,      (5-day live    (routing,      deep-links
    place data)    forecast)      geocoded pins)
        └────────────┴───────────────┴──────────────┘
                     ▼
        Composed itinerary UI (React + TS)
   schedule · map routes · weather · packing · local tips
```

---

## 🗄️ Database & auth (Supabase)

JourZy uses **Supabase** as its backend-as-a-service: Postgres, auth, and file storage in one, with a schema defined in [`schema.sql`](schema.sql).

- **Postgres + Row Level Security** — `trips`, `itineraries`, `user_memory`, `chat_histories`, and `trip_memories` (the trip scrapbook: visited flags, photos, captions) tables, each with **RLS enabled**. The Express backend authenticates with the **service role key** (which bypasses RLS) and enforces per-user ownership on every endpoint by verifying the caller's JWT — so the RLS layer is the last line of defense if the public anon key is ever queried directly against Supabase's REST API, not the primary access control.
- **Supabase Auth** — email/password sign-up, sign-in, and session management on the frontend (`supabase.auth.signUp`/`signInWithPassword`/`getSession`), with the resulting JWT sent to the backend on every request and verified server-side (`supabase.auth.getUser(token)`) before touching any user data.
- **Supabase Storage** — a public `trip-memories` bucket holds scrapbook photos; uploads happen server-side only (service role key), while unguessable UUID-based object paths let shared-trip links serve photos without requiring the viewer to be logged in.
- **Two clients, two trust levels** — the frontend (`frontend/src/app/utils/supabaseClient.ts`) uses the public anon key purely for auth; the backend (`backend/db.js`) uses the service role key and is the only thing that ever reads or writes trip data.

---

## 🔧 Engineering highlights

The interesting problems in this project weren't the UI — they were making an LLM **reliable enough to build a product on top of**:

- **Deterministic structured output.** The planner prompts are engineered to emit strict, schema-conformant JSON with inline rationales, so the frontend can parse and render itineraries reliably instead of babysitting free-form text.
- **Multi-provider LLM with graceful fallback.** Primary generation runs on **Gemini 2.5 Flash**; if no API key is configured, the server automatically falls back to a **local Ollama `gemma3`** instance — the same pipeline runs online or fully offline.
- **Real-time grounding.** Every itinerary is grounded in live data — Google Places for geocoding/place details, OpenWeather for a 5-day forecast, and Google Maps for routing between stops — so recommendations reflect actual conditions, not just the model's training data.
- **Weather-aware reasoning.** The packing list and safety advisories are generated from the live forecast (feels-like temperature, wind, humidity, cloud cover), so the output adapts to the real destination and dates.
- **Shipped end-to-end, solo.** Designed, built, and deployed independently — from prompt design and API integration through the React/TypeScript frontend to production deployment on Vercel.

---

## ✨ Key features

- **Conversational onboarding** — chat with JourZy about your interests, food tastes, and pace; it explores your profile until you're ready to generate.
- **Live 5-day weather** — tap any day for a detailed overlay (feels-like temp, cloud cover, pressure, wind, humidity) plus an hourly temperature trend curve and a dynamic safety/packing advisory.
- **Interactive routing** — embedded Google Maps with geocoded pins for every stop, route tracing between them, and one-click deep-links to the official Place panel.
- **AI packing checklist** — destination- and weather-aware lists grouped by Clothing, Footwear, Toiletries, Tech, Health, and Cultural considerations.
- **Local tips & flights** — AI-curated safety alerts, greeting etiquette, and cultural notes, plus deep-link booking cards across Google Flights, Skyscanner, and Expedia.

---

## 🧰 Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), TypeScript |
| Backend | Node.js, Express |
| Database & auth | Supabase (Postgres, Row Level Security, Auth, Storage) |
| LLM | Gemini 2.5 Flash (primary), Ollama `gemma3` (local fallback) |
| Data APIs | Google Places, Google Maps, OpenWeather |
| Deployment | Vercel |

---

## 🚀 Getting started

### Prerequisites

- **Node.js** v18+
- **npm** or **yarn**
- A [Supabase](https://supabase.com/) project — Postgres database, auth, and storage
- API keys:
  - [Google Gemini API key](https://ai.google.dev/) — AI generation & conversational chat
  - [Google Maps API key](https://console.cloud.google.com/) — geocoding, place details, maps embed
  - [OpenWeather API key](https://openweathermap.org/api) — live 5-day weather

### 1. Supabase

Create a project at [supabase.com](https://supabase.com/), then run [`schema.sql`](schema.sql) in the Supabase SQL Editor to create the tables (with RLS enabled) and the `trip-memories` storage bucket. From Settings → API, grab:

- the **Project URL**
- the **anon/public key** (frontend)
- the **service_role key** (backend — never expose this client-side)

### 2. Backend

```bash
cd backend
npm install
```

Create a `.env` file inside `/backend`:

```env
PORT=8888
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_MAPS_KEY=your_google_maps_key
OPENWEATHER_API_KEY=your_openweather_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Start the API server:

```bash
node server.js
# runs at http://localhost:8888
```

### 3. Frontend

Create a `.env` file inside `/frontend`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
cd frontend
npm install
npm run dev
# loads at http://localhost:5173
```

### Optional: local LLM fallback (Ollama)

If `GEMINI_API_KEY` isn't set, the server falls back to a local Ollama instance:

```bash
ollama serve
ollama pull gemma3
```

---

## 🗺️ Roadmap

- [ ] Voice interface (top user-requested feature)
- [ ] Native mobile app for easier on-the-go use
- [ ] Direct flight / hotel booking integrations

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.