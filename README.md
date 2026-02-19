# AI Travel Itinerary Planner (Ollama + Google Map)

A lightweight travel itinerary generator with a modern React UI.  
You enter a destination, dates, and preferences (hobbies, food, places). The backend calls **Ollama (gemma3:latest)** to generate a day-by-day itinerary and (optionally) uses **Google Places** to attach map-ready location details (lat/lng + Google Maps link) for each activity.

## Features

- ✅ Clean React + Vite UI (Tailwind + UI components)
- ✅ Generates a multi-day itinerary based on your preferences
- ✅ Clickable activities → popup with Google Maps link
- ✅ Backend integrates:
  - **Ollama** for local LLM generation (`gemma3:latest`)
  - **Google Places Text Search** to enrich locations (optional)

---

## Project Structure

Typical layout (yours may vary slightly):


---

## Prerequisites

- Node.js (recommended **v18+**)
- npm
- Ollama installed

---

## 1. Run Ollama (LLM)

If you have not had the model: Pull it

```bash 
ollama pull llama3 
```

Start Ollama:

```bash
ollama serve
``` 

Ollama should be available at: http://localhost:11434 

## 2. Backend Setup

Install dependencies

```bash 
cd backend
npm install 
``` 

### Environment variables

Create a file backend/.env, and store your google map API key 

```bash
GOOGLE_MAPS_KEY=YOUR_GOOGLE_MAPS_API_KEY
```

Run backend
```bash
node server.js
```

Backend runs at:
http://localhost:8000

API endpoint:

```
POST http://localhost:8000/api/itinerary 
``` 

## 3. Frontend Setup (Vite + React) 

From the project root:

```bash 
npm install 
npm run dev
``` 

Frontend runs at:
http://localhost:5173



## License 
MIT
