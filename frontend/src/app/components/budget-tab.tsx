import { useState, useEffect } from 'react';
import { GeneratedItinerary } from '../types/travel';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  Coins,
  Plus,
  Trash2,
  TrendingUp,
  Utensils,
  Building2,
  Bus,
  Compass,
  AlertTriangle,
  PiggyBank,
  Check,
  DollarSign
} from 'lucide-react';

interface BudgetTabProps {
  itinerary: GeneratedItinerary;
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: 'Food' | 'Hotel' | 'Transportation' | 'Activities' | 'Other';
  date?: string;
  isCustom?: boolean;
}

export function BudgetTab({ itinerary }: BudgetTabProps) {
  const regionName = itinerary.plan?.region || 'Destination';
  const durationDays = itinerary.days?.length || 1;
  const storageKey = `jourzy-budget-${itinerary.plan?.region}-${itinerary.plan?.arrivalDate}`;

  // Initialize Budget Limit based on user profile tier
  const getInitialLimit = () => {
    const budgetTier = itinerary.plan?.budget?.toLowerCase();
    if (budgetTier === 'luxury' || budgetTier === 'expensive') return 3000;
    if (budgetTier === 'budget' || budgetTier === 'cheap') return 600;
    return 1500; // Moderate default
  };

  const [budgetLimit, setBudgetLimit] = useState<number>(getInitialLimit);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [tempLimit, setTempLimit] = useState(String(getInitialLimit()));

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState<'Food' | 'Hotel' | 'Transportation' | 'Activities' | 'Other'>('Food');

  // Load from session/local storage or generate initial expenses from itinerary
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const { limit, list } = JSON.parse(stored);
        setBudgetLimit(limit);
        setTempLimit(String(limit));
        setExpenses(list);
        return;
      } catch (e) {
        console.error("Error loading stored budget", e);
      }
    }

    // Generate initial expenses if nothing is stored
    const initialExpenses: Expense[] = [];

    // 1. Hotel Expense
    const hotel = itinerary.hotelRecommendation;
    if (hotel) {
      const rate = hotel.pricePerNight || 120;
      initialExpenses.push({
        id: 'hotel-main',
        title: `Hotel: ${hotel.name} (${durationDays} nights)`,
        amount: rate * durationDays,
        category: 'Hotel',
        isCustom: false
      });
    }

    // 2. Activities Expenses
    let actId = 0;
    itinerary.days?.forEach((day) => {
      day.activities?.forEach((act) => {
        if (act.category !== 'rest') {
          // If cost is generated, use it; otherwise assign mock average based on category
          let costVal = typeof act.cost === 'number' ? act.cost : 15;
          if (act.category === 'food') costVal = typeof act.cost === 'number' ? act.cost : 20;

          if (costVal > 0) {
            initialExpenses.push({
              id: `act-${actId++}`,
              title: act.title,
              amount: costVal,
              category: act.category === 'food' ? 'Food' : 'Activities',
              isCustom: false
            });
          }
        }
      });
    });

    // 3. Estimate flight / transit expense if not present
    initialExpenses.push({
      id: 'transit-est',
      title: 'Estimated Transit & Cards',
      amount: durationDays * 12,
      category: 'Transportation',
      isCustom: false
    });

    setExpenses(initialExpenses);
    localStorage.setItem(storageKey, JSON.stringify({ limit: budgetLimit, list: initialExpenses }));
  }, [itinerary, storageKey]);

  // Persist edits helper
  const saveBudget = (updatedLimit: number, updatedExpenses: Expense[]) => {
    localStorage.setItem(storageKey, JSON.stringify({ limit: updatedLimit, list: updatedExpenses }));
  };

  const handleUpdateLimit = () => {
    const parsed = parseFloat(tempLimit);
    if (!isNaN(parsed) && parsed > 0) {
      setBudgetLimit(parsed);
      setIsEditingLimit(false);
      saveBudget(parsed, expenses);
    }
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAmount.trim()) return;
    const parsedAmt = parseFloat(newAmount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) return;

    const newExpense: Expense = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      amount: parsedAmt,
      category: newCategory,
      isCustom: true
    };

    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    saveBudget(budgetLimit, updated);

    // Clear form
    setNewTitle('');
    setNewAmount('');
  };

  const handleDeleteExpense = (id: string) => {
    const updated = expenses.filter(exp => exp.id !== id);
    setExpenses(updated);
    saveBudget(budgetLimit, updated);
  };

  // Calculations
  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const remaining = budgetLimit - totalSpent;
  const percentSpent = budgetLimit > 0 ? (totalSpent / budgetLimit) * 100 : 0;

  // Category sums
  const categorySums = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const categories = [
    { name: 'Hotel', icon: Building2, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    { name: 'Food', icon: Utensils, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { name: 'Transportation', icon: Bus, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
    { name: 'Activities', icon: Compass, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { name: 'Other', icon: Coins, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-32">
      <div className="max-w-4xl mx-auto space-y-8 select-none">

        {/* Header */}
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Coins className="size-6 text-emerald-400" />
            Budget Intelligence — {regionName.split(',')[0]}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Visual tracking matrix, cost estimates, and real-time expense calculations for your {durationDays}-day adventure.
          </p>
        </div>

        {/* Top Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Budget Card */}
          <Card className="bg-zinc-900 border-zinc-800 relative overflow-hidden shadow-xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Total Budget Limit</span>
                  {isEditingLimit ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg text-zinc-400 font-extrabold">$</span>
                      <input
                        type="number"
                        value={tempLimit}
                        onChange={(e) => setTempLimit(e.target.value)}
                        className="bg-zinc-950 border border-zinc-700 text-white font-extrabold text-xl w-24 px-2 py-0.5 rounded focus:outline-none focus:border-emerald-500"
                        autoFocus
                      />
                      <button
                        onClick={handleUpdateLimit}
                        className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 p-1 rounded transition-colors"
                      >
                        <Check className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-black text-white">${budgetLimit.toFixed(0)}</span>
                      <button
                        onClick={() => {
                          setTempLimit(String(budgetLimit));
                          setIsEditingLimit(true);
                        }}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
                <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                  <PiggyBank className="size-5 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Spent Card */}
          <Card className="bg-zinc-900 border-zinc-800 relative overflow-hidden shadow-xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Total Expenses Logged</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-white">${totalSpent.toFixed(0)}</span>
                    <span className="text-xs text-zinc-500">USD</span>
                  </div>
                </div>
                <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                  <TrendingUp className="size-5 text-indigo-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remaining Balance Card */}
          <Card className={`bg-zinc-900 border transition-colors duration-300 shadow-xl ${remaining >= 0 ? 'border-zinc-800' : 'border-rose-900/40 bg-rose-950/5'
            }`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Remaining Balance</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-3xl font-black ${remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                      {remaining >= 0 ? `$${remaining.toFixed(0)}` : `-$${Math.abs(remaining).toFixed(0)}`}
                    </span>
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl border ${remaining >= 0 ? 'bg-zinc-950/60 border-zinc-800/80 text-emerald-400' : 'bg-rose-950/50 border-rose-800/30 text-rose-400'
                  }`}>
                  {remaining >= 0 ? <Coins className="size-5" /> : <AlertTriangle className="size-5" />}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visual Progress Bar Meter */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 shadow-md">
          <div className="flex justify-between text-xs text-zinc-400 mb-2">
            <span className="font-semibold">Budget Consumption</span>
            <span className={`font-bold ${percentSpent > 100 ? 'text-rose-400' : 'text-zinc-300'}`}>
              {percentSpent.toFixed(1)}%
            </span>
          </div>

          <div className="w-full bg-zinc-950 h-3.5 rounded-full overflow-hidden border border-zinc-800/60 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${percentSpent > 90
                ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                : percentSpent > 70
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                }`}
              style={{ width: `${Math.min(percentSpent, 100)}%` }}
            ></div>
          </div>

          {percentSpent > 100 && (
            <div className="mt-3 flex items-center gap-2 text-rose-400 bg-rose-950/20 border border-rose-900/30 px-3.5 py-2.5 rounded-xl text-xs">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Warning: Your current logged expenses exceed your plan's budget limit! Consider checking alternative free activities in the timeline.</span>
            </div>
          )}
        </div>

        {/* Spending Category Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Categories card */}
          <Card className="bg-zinc-900 border-zinc-800 shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-bold text-sm text-zinc-200 mb-4 uppercase tracking-wider">Breakdown by Category</h3>
              <div className="space-y-4">
                {categories.map((cat) => {
                  const amt = categorySums[cat.name] || 0;
                  const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
                  const Icon = cat.icon;

                  return (
                    <div key={cat.name} className="flex items-center justify-between p-3 bg-zinc-950/40 rounded-xl border border-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${cat.bg} border ${cat.border} ${cat.color}`}>
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-zinc-300">{cat.name}</p>
                          <div className="w-20 md:w-28 bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-1">
                            <div className={`h-full rounded-full ${cat.name === 'Hotel' ? 'bg-indigo-400' :
                              cat.name === 'Food' ? 'bg-amber-400' :
                                cat.name === 'Transportation' ? 'bg-sky-400' :
                                  cat.name === 'Activities' ? 'bg-emerald-400' : 'bg-pink-400'
                              }`} style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-white">${amt.toFixed(0)}</p>
                        <p className="text-[10px] text-zinc-500 font-semibold">{pct.toFixed(0)}% of spent</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Add custom expense form */}
          <Card className="bg-zinc-900 border-zinc-800 shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-bold text-sm text-zinc-200 mb-4 uppercase tracking-wider">Log New Expense</h3>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Expense Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Sushi Dinner, Uber to Shibuya"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Amount ($ USD)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 45"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="Food">Food</option>
                      <option value="Hotel">Hotel</option>
                      <option value="Transportation">Transportation</option>
                      <option value="Activities">Activities</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-zinc-950 font-bold text-xs py-2.5 rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-1"
                >
                  <Plus className="size-4 text-zinc-950" /> Add Expense
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Expenses List */}
        <div>
          <h3 className="font-bold text-sm text-zinc-200 mb-3 uppercase tracking-wider">Logged Ledger</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
            {expenses.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No expenses logged yet. Populate using the form above!
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/70 max-h-[400px] overflow-y-auto">
                {expenses.map((exp) => {
                  const catMatch = categories.find(c => c.name === exp.category);
                  const Icon = catMatch?.icon || Coins;
                  const colorClass = catMatch?.color || 'text-zinc-400';
                  const bgClass = catMatch?.bg || 'bg-zinc-500/10';

                  return (
                    <div key={exp.id} className="flex items-center justify-between p-4 bg-zinc-900/50 hover:bg-zinc-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${bgClass} ${colorClass}`}>
                          <Icon className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white leading-tight">{exp.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{exp.category}</span>
                            {!exp.isCustom && (
                              <span className="bg-zinc-950 border border-zinc-800 text-zinc-500 text-[8px] px-1.5 py-0.5 rounded font-semibold">
                                ITINERARY AUTO
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-extrabold text-white">${exp.amount.toFixed(2)}</span>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="text-zinc-600 hover:text-rose-400 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
