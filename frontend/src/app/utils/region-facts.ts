// Static per-region quick-facts for the Tips tab (currency + survival phrases).
// This is hand-curated, not AI-generated — it covers the regions JourZy's
// backend already special-cases (see backend/logisticsData.js). Unmatched
// regions get an honest generic fallback rather than fabricated details.

export interface Phrase {
  en: string;
  local: string;
  say: string;
}

export interface CurrencyFact {
  name: string;
  why: string;
}

interface RegionFacts {
  currency: CurrencyFact;
  phrases: Phrase[];
}

const REGION_FACTS: Record<string, RegionFacts> = {
  Japan: {
    currency: {
      name: 'Japan uses the yen (¥)',
      why: '¥1,000 is about $6.70. Cash is still king at small shops and temples — a 7-Eleven ATM takes US cards and is the easiest place to withdraw.',
    },
    phrases: [
      { en: 'Hello', local: 'Konnichiwa', say: 'kon-nee-chee-wah' },
      { en: 'Thank you', local: 'Arigatou gozaimasu', say: 'ah-ree-gah-toh go-zai-mass' },
      { en: 'Excuse me / sorry', local: 'Sumimasen', say: 'soo-mee-mah-sen' },
      { en: 'Do you speak English?', local: 'Eigo o hanasemasu ka?', say: 'ay-go oh ha-nah-seh-mass ka' },
      { en: 'Delicious!', local: 'Oishii!', say: 'oy-shee' },
    ],
  },
  'South Korea': {
    currency: {
      name: 'Korea uses the won (₩)',
      why: '₩1,000 is about $0.75. Cards are widely accepted, but keep some cash for street food and small markets.',
    },
    phrases: [
      { en: 'Hello', local: 'Annyeonghaseyo', say: 'ahn-nyoung-ha-seh-yo' },
      { en: 'Thank you', local: 'Gamsahamnida', say: 'gam-sa-ham-nee-da' },
      { en: 'Excuse me / sorry', local: 'Joesonghamnida', say: 'jwe-song-ham-nee-da' },
      { en: 'Do you speak English?', local: 'Yeongeo halsu isseoyo?', say: 'young-uh hal-soo iss-uh-yo' },
      { en: 'Delicious!', local: 'Masisseoyo!', say: 'ma-shi-suh-yo' },
    ],
  },
  Singapore: {
    currency: {
      name: 'Singapore uses the dollar (S$)',
      why: 'S$1 is about $0.75. Tap-to-pay is standard everywhere, so you rarely need cash at all.',
    },
    phrases: [
      { en: 'Hello', local: 'Hello (English is official)', say: 'heh-loh' },
      { en: 'Thank you', local: 'Xie xie / Terima kasih', say: 'shyeh-shyeh / teh-ree-mah kah-see' },
      { en: 'Excuse me', local: 'Excuse me', say: 'ex-kyooz mee' },
    ],
  },
  France: {
    currency: {
      name: 'France uses the euro (€)',
      why: '€1 is about $1.08. Cards are widely accepted; small cafes may prefer cash for orders under €10.',
    },
    phrases: [
      { en: 'Hello', local: 'Bonjour', say: 'bohn-zhoor' },
      { en: 'Thank you', local: 'Merci', say: 'mehr-see' },
      { en: 'Excuse me / sorry', local: 'Pardon', say: 'par-dohn' },
      { en: 'Do you speak English?', local: 'Parlez-vous anglais?', say: 'par-lay voo ahn-glay' },
      { en: 'Delicious!', local: "C'est délicieux!", say: 'say day-lee-syuh' },
    ],
  },
};

const GENERIC_FACTS: RegionFacts = {
  currency: {
    name: 'Check the local currency before you go',
    why: "JourZy doesn't have curated currency details for this destination yet — a quick search or your bank's app will show the current exchange rate.",
  },
  phrases: [],
};

export function getRegionFacts(region: string): RegionFacts {
  const key = Object.keys(REGION_FACTS).find(k => region.toLowerCase().includes(k.toLowerCase()));
  return key ? REGION_FACTS[key] : GENERIC_FACTS;
}
