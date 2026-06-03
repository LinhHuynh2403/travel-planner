import { useState } from 'react';
import { PackingItem } from '../types/travel';
import { Briefcase } from 'lucide-react';

interface PackingTabProps {
  packingList?: PackingItem[];
  region: string;
}

export function PackingTab({ packingList, region }: PackingTabProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const toggleItem = (item: string) => {
    const next = new Set(checkedItems);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    setCheckedItems(next);
  };

  // Base essentials that are ALWAYS required regardless of destination or AI output
  const essentials = [
    {
      category: "Travel Essentials & Docs",
      items: ["Passport & travel insurance", "Credit cards & some local cash", "Universal travel adapter", "Phone, charger & cables"]
    }
  ];

  const defaultList = [
    {
      category: "Clothing",
      items: ["Light breathable shirts (5)", "Walking shorts (3)", "Comfortable sneakers", "Light jacket", "Swimwear"]
    },
    {
      category: "Tech & Accessories",
      items: ["Portable charger / power bank", "Pocket WiFi or local eSIM details"]
    },
    {
      category: "Health & Care",
      items: ["Sunscreen SPF 50+", "Compact umbrella", "Hand sanitizer", "Blister plasters"]
    }
  ];

  // Merge the AI packing list with the base essentials
  // If the AI list is empty, we fall back to defaults merged with essentials
  const aiListClean = packingList && packingList.length > 0
    ? packingList.filter(group => {
      return (
        group &&
        typeof group.category === 'string' &&
        Array.isArray(group.items) &&
        !group.category.toLowerCase().includes('essential') &&
        !group.category.toLowerCase().includes('doc')
      );
    })
    : defaultList;

  const listToRender = [
    ...essentials,
    ...aiListClean
  ];

  return (
    <div className="flex-1 overflow-y-auto p-8 pb-32">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Briefcase className="size-5 text-emerald-400" />
          Packing list — {region.split(',')[0]}
        </h2>

        <div className="space-y-8">
          {listToRender.map((group, i) => (
            <div key={i}>
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2 mb-3">
                <svg className="size-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                {group.category}
              </h3>
              <ul className="space-y-2">
                {group.items.map((item, j) => {
                  const id = `${i}-${j}`;
                  const isChecked = checkedItems.has(id);
                  return (
                    <li key={j} className="flex items-center gap-3 py-1 border-b border-zinc-800/50">
                      <button
                        onClick={() => toggleItem(id)}
                        className={`size-4 rounded flex items-center justify-center border transition-colors ${isChecked
                          ? 'bg-emerald-500 border-emerald-500 text-zinc-950'
                          : 'border-zinc-600 hover:border-emerald-500'
                          }`}
                      >
                        {isChecked && (
                          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span className={`text-sm select-none cursor-pointer ${isChecked ? 'text-zinc-500 line-through' : 'text-zinc-300'}`} onClick={() => toggleItem(id)}>
                        {item}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
