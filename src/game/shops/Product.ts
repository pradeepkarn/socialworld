import { IProduct } from '@/types/game';

/**
 * =========================================================================
 * CYBERMART CATALOG
 * =========================================================================
 * High-tech hardware, cybernetic gear, and wearable apparel sold at CyberMart.
 * Each item has:
 * - id: Unique catalog identifier.
 * - name: Display title in the shop UI.
 * - description: Flavor text explaining what the item does in the cyberpunk world.
 * - price: Cost in player credits ($).
 * - category: 'tech' or 'apparel'.
 * - icon: Lucide icon component name to render in React.
 * - stock: Inventory count available for purchase.
 */
export const CYBERMART_PRODUCTS: IProduct[] = [
  {
    id: 'prod_cyberdeck',
    name: 'Cyber Deck MK-IV',
    description: 'Portable neural computer with overclocked sub-processors.',
    price: 120,
    category: 'tech',
    icon: 'Cpu',
    stock: 12,
  },
  {
    id: 'prod_holo_visor',
    name: 'Holo Visor AR',
    description: 'Heads-up tactical display with real-time waypoint streaming.',
    price: 55,
    category: 'tech',
    icon: 'Eye',
    stock: 24,
  },
  {
    id: 'prod_sneakers',
    name: 'Anti-Grav Sneakers',
    description: 'Magnetic suspension soles engineered for smooth city running.',
    price: 90,
    category: 'apparel',
    icon: 'Footprints',
    stock: 15,
  },
  {
    id: 'prod_jacket',
    name: 'Neon Windbreaker',
    description: 'Water-resistant holographic jacket with dynamic LED trims.',
    price: 65,
    category: 'apparel',
    icon: 'Shirt',
    stock: 18,
  },
  {
    id: 'prod_backpack',
    name: 'Tactical Courier Bag',
    description: 'Reinforced carbon-weave gear bag with magnetic clasps.',
    price: 45,
    category: 'apparel',
    icon: 'Briefcase',
    stock: 30,
  },
];

/**
 * =========================================================================
 * NEON CAFE CATALOG
 * =========================================================================
 * Consumable refreshments, energizing beverages, and first-aid stims sold at Neon Cafe.
 */
export const NEONCAFE_PRODUCTS: IProduct[] = [
  {
    id: 'prod_quantum_energy',
    name: 'Quantum Energy Drink',
    description: 'Hyper-caffeinated electrolyte infusion for high endurance.',
    price: 8,
    category: 'consumable',
    icon: 'Zap',
    stock: 50,
  },
  {
    id: 'prod_synth_coffee',
    name: 'Synth-Coffee Nitro',
    description: 'Rich dark roast brewed with molecular nitrogen bubbles.',
    price: 5,
    category: 'consumable',
    icon: 'Coffee',
    stock: 80,
  },
  {
    id: 'prod_nanokit',
    name: 'Nano Med-Kit',
    description: 'Cellular regeneration dermal gel for immediate fatigue recovery.',
    price: 25,
    category: 'consumable',
    icon: 'HeartPulse',
    stock: 20,
  },
];
