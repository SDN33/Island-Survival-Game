import { create } from 'zustand';
import { InventoryItem } from '../types/game';

interface PlayerStore {
  health: number;
  level: number;
  experience: number;
  inventory: InventoryItem[];
  craftableItems: {
    id: string;
    name: string;
    type: 'tool' | 'weapon';
    canCraft: boolean;
    requirements: {
      itemId: string;
      quantity: number;
    }[];
  }[];
  updateHealth: (amount: number) => void;
  addExperience: (amount: number) => void;
  addItem: (item: InventoryItem) => void;
  removeItem: (itemId: string, quantity: number) => void;
  craftItem: (itemId: string) => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  health: 100,
  level: 1,
  experience: 0,
  inventory: [],
  craftableItems: [
    {
      id: 'fishing-rod',
      name: 'Fishing Rod',
      type: 'tool',
      canCraft: true,
      requirements: [
        { itemId: 'wood', quantity: 3 },
        { itemId: 'fiber', quantity: 2 }
      ]
    },
    {
      id: 'spear',
      name: 'Wooden Spear',
      type: 'weapon',
      canCraft: true,
      requirements: [
        { itemId: 'wood', quantity: 2 },
        { itemId: 'stone', quantity: 1 }
      ]
    }
  ],
  updateHealth: (amount) => set((state) => ({
    health: Math.max(0, Math.min(100, state.health + amount))
  })),
  addExperience: (amount) => set((state) => {
    const newExperience = state.experience + amount;
    const experienceToLevel = state.level * 100;
    
    if (newExperience >= experienceToLevel) {
      return {
        experience: newExperience - experienceToLevel,
        level: state.level + 1,
        health: 100 // Heal on level up
      };
    }
    
    return { experience: newExperience };
  }),
  addItem: (item) => set((state) => {
    const existingItem = state.inventory.find((i) => i.id === item.id);
    if (existingItem) {
      return {
        inventory: state.inventory.map((i) =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      };
    }
    return { inventory: [...state.inventory, item] };
  }),
  removeItem: (itemId, quantity) => set((state) => ({
    inventory: state.inventory
      .map((item) =>
        item.id === itemId
          ? { ...item, quantity: item.quantity - quantity }
          : item
      )
      .filter((item) => item.quantity > 0)
  })),
  craftItem: (itemId) => set((state) => {
    const item = state.craftableItems.find((i) => i.id === itemId);
    if (!item || !item.canCraft) return state;

    const canCraft = item.requirements.every((req) => {
      const inventoryItem = state.inventory.find((i) => i.id === req.itemId);
      return inventoryItem && inventoryItem.quantity >= req.quantity;
    });

    if (!canCraft) return state;

    const newInventory = [...state.inventory];
    item.requirements.forEach((req) => {
      const index = newInventory.findIndex((i) => i.id === req.itemId);
      if (index >= 0) {
        newInventory[index] = {
          ...newInventory[index],
          quantity: newInventory[index].quantity - req.quantity
        };
      }
    });

    const craftedItem: InventoryItem = {
      id: itemId,
      name: item.name,
      type: item.type,
      quantity: 1
    };

    return {
      inventory: [...newInventory.filter((i) => i.quantity > 0), craftedItem]
    };
  })
}));