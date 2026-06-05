import { useState, useEffect } from 'react';
import { GeneratedItinerary } from '../types/travel';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Brain,
  History,
  MapPin,
  Calendar,
  Coins,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  Sparkles,
  Users,
  Building2,
  Train,
  Utensils,
  Loader2
} from 'lucide-react';

interface MemoryTabProps {
  itinerary: GeneratedItinerary;
}

interface UserMemory {
  loves: string[];
  dislikes: string[];
  transportPreferences: string[];
  accommodationStyle: string;
  notes: string;
}

const DEFAULT_MEMORY: UserMemory = {
  loves: [],
  dislikes: [],
  transportPreferences: [],
  accommodationStyle: '',
  notes: '',
};

const QUICK_LOVES = ['Museums', 'Street food', 'Nature hikes', 'Local markets', 'Historical sites', 'Art galleries', 'Night life', 'Beach days', 'Temples', 'Hidden cafes'];
const QUICK_DISLIKES = ['Nightlife', 'Tourist traps', 'Crowded spots', 'Guided tours', 'Fast food', 'Shopping malls'];
const TRANSPORT_OPTIONS = ['Trains', 'Metro', 'Bicycle', 'Walking', 'Buses', 'Taxis', 'Rental car'];

export function MemoryTab({ itinerary }: MemoryTabProps) {
  const [memory, setMemory] = useState<UserMemory>(DEFAULT_MEMORY);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [newLove, setNewLove] = useState('');
  const [newDislike, setNewDislike] = useState('');

  const userId = localStorage.getItem('userId') || 'demo-user';
  const API_BASE = import.meta.env.VITE_API_URL || '';

  // Load existing memory from backend
  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/api/memory?userId=${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data.memory?.preferences) {
          setMemory({ ...DEFAULT_MEMORY, ...data.memory.preferences });
          setNoteDraft(data.memory.preferences.notes || '');
        }
      })
      .catch(() => {});
  }, [userId, API_BASE]);

  const saveMemory = async (updated: UserMemory) => {
    setIsSaving(true);
    try {
      await fetch(`${API_BASE}/api/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, preferences: updated }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Save memory failed:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleLove = (item: string) => {
    const updated = memory.loves.includes(item)
      ? { ...memory, loves: memory.loves.filter(l => l !== item) }
      : { ...memory, loves: [...memory.loves, item] };
    setMemory(updated);
    saveMemory(updated);
  };

  const toggleDislike = (item: string) => {
    const updated = memory.dislikes.includes(item)
      ? { ...memory, dislikes: memory.dislikes.filter(d => d !== item) }
      : { ...memory, dislikes: [...memory.dislikes, item] };
    setMemory(updated);
    saveMemory(updated);
  };

  const toggleTransport = (item: string) => {
    const updated = memory.transportPreferences.includes(item)
      ? { ...memory, transportPreferences: memory.transportPreferences.filter(t => t !== item) }
      : { ...memory, transportPreferences: [...memory.transportPreferences, item] };
    setMemory(updated);
    saveMemory(updated);
  };

  const addCustomLove = () => {
    if (!newLove.trim() || memory.loves.includes(newLove.trim())) { setNewLove(''); return; }
    const updated = { ...memory, loves: [...memory.loves, newLove.trim()] };
    setMemory(updated);
    saveMemory(updated);
    setNewLove('');
  };

  const addCustomDislike = () => {
    if (!newDislike.trim() || memory.dislikes.includes(newDislike.trim())) { setNewDislike(''); return; }
    const updated = { ...memory, dislikes: [...memory.dislikes, newDislike.trim()] };
    setMemory(updated);
    saveMemory(updated);
    setNewDislike('');
  };

  const saveNotes = () => {
    const updated = { ...memory, notes: noteDraft };
    setMemory(updated);
    saveMemory(updated);
    setEditingNotes(false);
  };

  // Build a summary of this trip for history display
  const tripActivities = itinerary.days.flatMap(d => d.activities);
  const activityCategories = [...new Set(tripActivities.map(a => a.category))];
  const totalActivities = tripActivities.length;
  const durationDays = itinerary.days.length;
  const region = itinerary.plan.region;

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-32">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Brain className="size-6 text-indigo-400" />
            Memory & Travel History
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            JourZy remembers your preferences to craft smarter itineraries for future trips.
          </p>
        </div>

        {/* Save success */}
        {saveSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 animate-in fade-in duration-300">
            <Check className="size-4 text-emerald-400" /> Preferences saved to your memory profile!
          </div>
        )}

        {/* Current Trip Summary Card */}
        <Card className="bg-gradient-to-r from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 shadow-xl">
          <CardHeader className="pb-3 border-b border-indigo-500/10">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <History className="size-4 text-indigo-400" /> Current Trip Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/60 text-center">
                <MapPin className="size-4 text-indigo-400 mx-auto mb-1" />
                <p className="text-xs font-extrabold text-white truncate">{region.split(',')[0]}</p>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Destination</p>
              </div>
              <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/60 text-center">
                <Calendar className="size-4 text-purple-400 mx-auto mb-1" />
                <p className="text-xs font-extrabold text-white">{durationDays} Days</p>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Duration</p>
              </div>
              <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/60 text-center">
                <Sparkles className="size-4 text-amber-400 mx-auto mb-1" />
                <p className="text-xs font-extrabold text-white">{totalActivities} Activities</p>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Planned</p>
              </div>
              <div className="bg-zinc-950/50 rounded-xl p-3 border border-zinc-800/60 text-center">
                <Users className="size-4 text-emerald-400 mx-auto mb-1" />
                <p className="text-xs font-extrabold text-white capitalize">{itinerary.plan.whoTraveling || 'Solo'}</p>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Traveler</p>
              </div>
            </div>

            {/* Activity categories visited */}
            <div className="mt-4 flex flex-wrap gap-2">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider w-full">Activities explored:</p>
              {activityCategories.map(cat => (
                <span key={cat} className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded capitalize text-zinc-300 font-semibold">
                  {cat}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Memory Profile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Things I Love */}
          <Card className="bg-zinc-900 border-zinc-800 shadow-lg">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <ThumbsUp className="size-4 text-emerald-400" /> What I Love
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <p className="text-[10px] text-zinc-500">JourZy will prioritize these in future itineraries.</p>

              {/* Quick toggles */}
              <div className="flex flex-wrap gap-2">
                {QUICK_LOVES.map(item => (
                  <button
                    key={item}
                    onClick={() => toggleLove(item)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border transition-all ${
                      memory.loves.includes(item)
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
                  >
                    {memory.loves.includes(item) ? '✓ ' : '+ '}{item}
                  </button>
                ))}
              </div>

              {/* Custom love */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newLove}
                  onChange={e => setNewLove(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomLove()}
                  placeholder="Add custom (e.g. Jazz bars)..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 text-white text-[10px] px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-500 placeholder-zinc-600"
                />
                <Button size="sm" onClick={addCustomLove} className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 h-8 px-3 font-bold text-[10px]">
                  <Plus className="size-3.5" />
                </Button>
              </div>

              {/* Custom loves list */}
              {memory.loves.filter(l => !QUICK_LOVES.includes(l)).map(item => (
                <div key={item} className="flex items-center justify-between bg-zinc-950/60 border border-emerald-500/20 rounded-xl px-3 py-2">
                  <span className="text-[10px] text-emerald-300 font-bold">{item}</span>
                  <button onClick={() => toggleLove(item)} className="text-zinc-600 hover:text-rose-400 transition-colors">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Things I Dislike */}
          <Card className="bg-zinc-900 border-zinc-800 shadow-lg">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <ThumbsDown className="size-4 text-rose-400" /> What I Dislike
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <p className="text-[10px] text-zinc-500">JourZy will avoid these when generating your trip.</p>

              <div className="flex flex-wrap gap-2">
                {QUICK_DISLIKES.map(item => (
                  <button
                    key={item}
                    onClick={() => toggleDislike(item)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border transition-all ${
                      memory.dislikes.includes(item)
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
                  >
                    {memory.dislikes.includes(item) ? '✗ ' : '+ '}{item}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newDislike}
                  onChange={e => setNewDislike(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomDislike()}
                  placeholder="Add custom (e.g. Guided tours)..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 text-white text-[10px] px-3 py-2 rounded-xl focus:outline-none focus:border-rose-500 placeholder-zinc-600"
                />
                <Button size="sm" onClick={addCustomDislike} className="bg-rose-500 hover:bg-rose-600 text-white h-8 px-3 font-bold text-[10px]">
                  <Plus className="size-3.5" />
                </Button>
              </div>

              {memory.dislikes.filter(d => !QUICK_DISLIKES.includes(d)).map(item => (
                <div key={item} className="flex items-center justify-between bg-zinc-950/60 border border-rose-500/20 rounded-xl px-3 py-2">
                  <span className="text-[10px] text-rose-300 font-bold">{item}</span>
                  <button onClick={() => toggleDislike(item)} className="text-zinc-600 hover:text-rose-400 transition-colors">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Transport Preferences */}
          <Card className="bg-zinc-900 border-zinc-800 shadow-lg">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Train className="size-4 text-sky-400" /> Transport Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-3">
              <p className="text-[10px] text-zinc-500">Select how you prefer to get around.</p>
              <div className="flex flex-wrap gap-2">
                {TRANSPORT_OPTIONS.map(item => (
                  <button
                    key={item}
                    onClick={() => toggleTransport(item)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border transition-all ${
                      memory.transportPreferences.includes(item)
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                        : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
                  >
                    {memory.transportPreferences.includes(item) ? '✓ ' : ''}{item}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Personal Notes */}
          <Card className="bg-zinc-900 border-zinc-800 shadow-lg">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Pencil className="size-4 text-amber-400" /> Personal Travel Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-3">
              <p className="text-[10px] text-zinc-500">Any extra context for JourZy (e.g. "I have a nut allergy" or "I prefer early starts").</p>
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={noteDraft}
                    onChange={e => setNoteDraft(e.target.value)}
                    rows={4}
                    placeholder="Write anything you want JourZy to remember..."
                    className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 placeholder-zinc-600 resize-none"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveNotes} className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-[10px] flex items-center gap-1 h-8">
                      {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingNotes(false)} className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-[10px] h-8">
                      <X className="size-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="min-h-[80px] bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-3 text-xs text-zinc-400 cursor-pointer hover:border-zinc-700 transition-colors"
                  onClick={() => setEditingNotes(true)}
                >
                  {memory.notes || <span className="text-zinc-600 italic">Click to add a note...</span>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Memory Summary for AI */}
        {(memory.loves.length > 0 || memory.dislikes.length > 0 || memory.transportPreferences.length > 0) && (
          <Card className="bg-indigo-500/5 border border-indigo-500/20 shadow-md">
            <CardContent className="p-5">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Brain className="size-4 text-indigo-400" /> JourZy's Memory Summary
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {memory.loves.length > 0 && <>Loves: <span className="text-emerald-300 font-semibold">{memory.loves.join(', ')}</span>. </>}
                {memory.dislikes.length > 0 && <>Avoids: <span className="text-rose-300 font-semibold">{memory.dislikes.join(', ')}</span>. </>}
                {memory.transportPreferences.length > 0 && <>Prefers: <span className="text-sky-300 font-semibold">{memory.transportPreferences.join(', ')}</span>. </>}
                {memory.notes && <>Notes: <span className="text-amber-300 font-semibold">"{memory.notes}"</span></>}
              </p>
              <p className="text-[10px] text-indigo-400/70 mt-2">This profile is passed to the AI when generating your next itinerary.</p>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
