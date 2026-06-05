// backend/logisticsData.js

export const REGIONAL_LOGISTICS = {
    "South Korea": {
        connectivity: "Pick up a physical SIM card at Incheon Airport (KT/SK Telecom) or load an eSIM via Airalo before flying.",
        transit: "Buy a T-Money card at an airport convenience store (GS25/CU) for 4,000 KRW. Deposit physical cash at subway kiosks to use trains and buses."
    },
    "Singapore": {
        connectivity: "Grab a Singtel Tourist SIM card at Changi Airport or load an international eSIM.",
        transit: "No specialized transit card required. You can tap directly through MRT subway gates and on buses using any contactless Visa/Mastercard, Apple Pay, or Google Pay."
    },
    "Japan": {
        connectivity: "Rent a pocket Wi-Fi router at the airport terminal or set up an eSIM plan before leaving.",
        transit: "Add a digital Suica or Pasmo card directly into your Apple/Google Wallet before arriving. Load funds using your mobile wallet credit card to tap through train gates instantly."
    },
    "France": {
        connectivity: "Get an Orange Holiday eSIM online or buy a physical local SIM at a Tabac shop.",
        transit: "Buy a Navigo Easy Pass at any Metro station window or ticket machine for €2, then load single tickets or a day pass directly onto it."
    }
};

export const UNIVERSAL_PACKING_CATEGORIES = [
    "Documents & ID", "Clothing", "Footwear", "Toiletries",
    "Electronics", "Health & Medication", "Money & Finance",
    "Comfort & In-Flight", "Activity-Specific Items",
    "Cultural Considerations", "Safety & Security",
    "Customs & Restrictions", "Optional Items"
];