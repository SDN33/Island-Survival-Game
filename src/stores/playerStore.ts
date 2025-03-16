import create from 'zustand';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  type: 'tool' | 'weapon' | 'resource' | 'food' | 'consumable';
  consumable?: {
    healthRestored: number;
  };
}

interface PlayerState {
  health: number;
  level: number;
  experience: number;
  inventory: InventoryItem[];
  addItem: (item: InventoryItem) => void;
  removeItem: (itemId: string, quantity: number) => void;
  updateHealth: (amount: number) => void;
  addExperience: (amount: number) => void;
  craftableItems: { id: string; name: string; canCraft: boolean; requirements: { itemId: string; quantity: number }[] }[];
  craftItem: (itemId: string) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  health: 100,
  level: 1,
  experience: 0,
  inventory: [],
  addItem: (item) => set((state) => {
    const existingItem = state.inventory.find(i => i.id === item.id);
    if (existingItem) {
      return {
        inventory: state.inventory.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i)
      };
    } else {
      return { inventory: [...state.inventory, item] };
    }
  }),
  removeItem: (itemId, quantity) => set((state) => {
    const existingItem = state.inventory.find(i => i.id === itemId);
    if (existingItem) {
      if (existingItem.quantity > quantity) {
        return {
          inventory: state.inventory.map(i => i.id === itemId ? { ...i, quantity: i.quantity - quantity } : i)
        };
      } else {
        return {
          inventory: state.inventory.filter(i => i.id !== itemId)
        };
      }
    }
    return state;
  }),
  updateHealth: (amount) => set((state) => ({ health: Math.max(0, Math.min(100, state.health + amount)) })),
  addExperience: (amount) => set((state) => {
    const newExperience = state.experience + amount;
    const newLevel = Math.floor(newExperience / 100) + 1;
    return { experience: newExperience, level: newLevel };
  }),
  craftableItems: [
    {
      id: 'stone_axe',
      name: 'Stone Axe',
      canCraft: false,
      requirements: [
        { itemId: 'wood', quantity: 3 },
        { itemId: 'stone', quantity: 2 }
      ]
    }
  ],
  craftItem: (itemId) => set((state) => {
    const item = state.craftableItems.find(i => i.id === itemId);
    if (item && item.canCraft) {
      item.requirements.forEach(req => {
        get().removeItem(req.itemId, req.quantity);
      });
      get().addItem({ id: itemId, name: item.name, quantity: 1, type: 'tool' });
    }
    return {}; // Return an empty partial state object
  })
}));
