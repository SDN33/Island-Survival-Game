export interface PlayerStats {
  health: number;
  stamina: number;
  level: number;
  experience: number;
}



export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  type: "tool" | "weapon" | "resource" | "food" | "consumable";
  consumable?: {
    healthRestored: number;
  };
}
export interface GameState {
  time: number; // 0-24 hours
  weather: 'clear' | 'rain' | 'storm';
  dayCount: number;
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  reward: InventoryItem;
  completed: boolean;
  requirements: {
    type: string;
    quantity: number;
    current: number;
  };
}

export interface Enemy {
  id: number;
  position: [number, number, number];
  level: number;
  health: number;
  maxHealth: number;
  type: 'wolf' | 'snake' | 'scorpion';
  isAggressive: boolean;
}
