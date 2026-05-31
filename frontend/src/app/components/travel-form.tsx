import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, MapPin, Utensils, Heart, Map, Sparkles } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { TravelPlan } from '../types/travel';

const placeOptions = [
  { id: 'museum', label: 'Museums' },
  { id: 'exhibition', label: 'Exhibitions' },
  { id: 'nature', label: 'Nature & Parks' },
  { id: 'historical', label: 'Historical Sites' },
  { id: 'shopping', label: 'Shopping Districts' },
  { id: 'entertainment', label: 'Entertainment' },
];

const restaurantOptions = [
  { id: 'fine-dining', label: 'Fine Dining' },
  { id: 'local', label: 'Local Cuisine' },
  { id: 'street-food', label: 'Street Food' },
  { id: 'vegetarian', label: 'Vegetarian/Vegan' },
  { id: 'seafood', label: 'Seafood' },
  { id: 'casual', label: 'Casual Dining' },
];

export function TravelForm() {
  const navigate = useNavigate();
  const [region, setRegion] = useState('');
  const [arrivalDate, setArrivalDate] = useState<Date>();
  const [leaveDate, setLeaveDate] = useState<Date>();
  const [hobbies, setHobbies] = useState('');
  const [favoriteFood, setFavoriteFood] = useState('');
  const [restaurantPreferences, setRestaurantPreferences] = useState<string[]>([]);
  const [placePreferences, setPlacePreferences] = useState<string[]>([]);

  const handleRestaurantToggle = (id: string) => {
    setRestaurantPreferences(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handlePlaceToggle = (id: string) => {
    setPlacePreferences(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!region || !arrivalDate || !leaveDate) {
      alert('Please fill in all required fields');
      return;
    }

    const plan: TravelPlan = {
      region,
      arrivalDate,
      leaveDate,
      hobbies: hobbies.split(',').map(h => h.trim()).filter(h => h),
      favoriteFood: favoriteFood.split(",").map((f) => f.trim()).filter(Boolean),
      restaurantPreferences,
      placePreferences,
    };

    // Store in sessionStorage to pass to itinerary page
    sessionStorage.setItem('travelPlan', JSON.stringify(plan));
    navigate('/itinerary');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="size-6 text-blue-600" />
            <CardTitle>Trip Details</CardTitle>
          </div>
          <CardDescription>Where and when are you planning to travel?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="region">Destination Region *</Label>
            <Input
              id="region"
              placeholder="e.g., Paris, Tokyo, New York"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Arrival Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {arrivalDate ? format(arrivalDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={arrivalDate}
                    onSelect={setArrivalDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Leave Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {leaveDate ? format(leaveDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={leaveDate}
                    onSelect={setLeaveDate}
                    initialFocus
                    disabled={(date) => arrivalDate ? date < arrivalDate : false}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Heart className="size-6 text-pink-600" />
            <CardTitle>Your Preferences</CardTitle>
          </div>
          <CardDescription>Tell us about your interests and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hobbies">Hobbies & Interests</Label>
            <Textarea
              id="hobbies"
              placeholder="e.g., photography, hiking, music, art, reading (comma-separated)"
              value={hobbies}
              onChange={(e) => setHobbies(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="favoriteFood">Favorite Food/Cuisine (comma-separated)</Label>
            <Input
              id="favoriteFood"
              placeholder="e.g., Sushi, Vietnamese, Korean BBQ"
              value={favoriteFood}
              onChange={(e) => setFavoriteFood(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Utensils className="size-6 text-orange-600" />
            <CardTitle>Restaurant Preferences</CardTitle>
          </div>
          <CardDescription>What type of dining experiences do you prefer?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {restaurantOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  checked={restaurantPreferences.includes(option.id)}
                  onCheckedChange={() => handleRestaurantToggle(option.id)}
                />
                <Label
                  htmlFor={option.id}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Map className="size-6 text-green-600" />
            <CardTitle>Places to Visit</CardTitle>
          </div>
          <CardDescription>What types of attractions interest you?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {placeOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  checked={placePreferences.includes(option.id)}
                  onCheckedChange={() => handlePlaceToggle(option.id)}
                />
                <Label
                  htmlFor={option.id}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full">
        <Sparkles className="mr-2 size-5" />
        Generate My AI-Powered Itinerary
      </Button>
    </form>
  );
}
