# JourZy: AI Travel Itinerary Planner & Agent 🗺️✨

JourZy is a modern, premium travel assistant and itinerary planner. It helps you design highly customized, detail-rich travel schedules, map routes, live weather analyses, and personalized packing lists.

Built with **React (Vite) + TypeScript** on the frontend, and a **Node.js Express** server in the backend, it utilizes **Gemini 2.5 Flash** for LLM orchestration and **Google Places & OpenWeather** APIs for real-time location/environment integration.

---

## 🌐 Live Demo

Check out the live deployment of the app here:
**[JourZy Travel Planner on Vercel](https://travel-planner-theta-teal.vercel.app/)**

---

## 🌟 Key Features

1. **Interactive Conversational Onboarding**:
   - Speak directly with **JourZy**, your AI travel concierge, to discuss your interests, hobbies, culinary tastes, and pace preference.
   - The onboarding assistant will dynamically explore your profile until you are satisfied and ready to generate.

2. **Weather styled Live Forecast**:
   - Access live 5-day weather forecast information for your destination.
   - Click on any day card to slide open an **Weather styled overlay dialog** detailing feels-like temperatures, cloud cover percentage, barometric air pressure, wind speeds, humidity metrics, and a dynamic safety/packing advisory.
   - Includes a smooth **hourly temperature trend curve** with linear SVG gradient styling.

3. **Google Maps Interactive Routing**:
   - Embedded Google Maps showing geocoded pins for all schedule events.
   - Live route tracing between stops for easy day navigation.
   - One-click redirects to the official Google Maps Place panel (for hours, reviews, and photos).

4. **AI Packing Checklist**:
   - Automatically compiles destination-aware, weather-appropriate checklist groups (Clothing, Footwear, Toiletries, Tech, Health, and Cultural considerations).

5. **Local Tips & Flight Discovery**:
   - **Tips Tab**: Dynamically renders AI-curated safety alerts, greeting etiquettes, and cultural taboos.
   - **Flights Tab**: Live deep-link booking card searching flight portals like Google Flights, Skyscanner, and Expedia.

---

## 🛠️ Prerequisites

* **Node.js** (v18+ recommended)
* **npm** or **yarn**
* External API Keys:
  * [Google Gemini API Key](https://ai.google.dev/) (For AI generation & conversational chat)
  * [Google Maps API Key](https://console.cloud.google.com/) (For Geocoding, Place details, and Maps embed)
  * [OpenWeather API Key](https://openweathermap.org/api) (For live 5-day weather data)

---

## 🚀 Getting Started

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install server dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` configuration file inside `/backend`:
   ```env
   PORT=8888
   GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_MAPS_KEY=your_google_maps_key
   OPENWEATHER_API_KEY=your_openweather_api_key
   ```
4. Fire up the API server:
   ```bash
   node server.js
   ```
   *The server runs locally at: `http://localhost:8888`*

---

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite hot-reloading development server:
   ```bash
   npm run dev
   ```
   *The client dashboard loads locally at: `http://localhost:5173`*

---

## 🧠 Optional Local Fallback (Ollama)

If no `GEMINI_API_KEY` environment variable is defined in your `.env` file, the server automatically attempts to fall back to a local Ollama instance running the `gemma3` model:

1. Serve Ollama locally:
   ```bash
   ollama serve
   ```
2. Pull the latest model:
   ```bash
   ollama pull gemma3
   ```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
