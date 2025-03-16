import { create } from 'zustand';

interface SettingsStore {
  quality: 'low' | 'medium' | 'high';
  setQuality: (quality: 'low' | 'medium' | 'high') => void;
  getQualitySettings: () => {
    shadowMapSize: number;
    maxEnemies: number;
    terrainDetail: number;
    drawDistance: number;
  };
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  quality: 'medium',

  setQuality: (quality) => set({ quality }),

  getQualitySettings: () => {
    const quality = get().quality;

    const settings = {
      quality, // Ajouter cette propriété pour la rendre accessible
      shadowMapSize: 512,
      maxEnemies: 15,
      terrainDetail: 100,
      drawDistance: 30
    };

    // Ajuster les paramètres selon la qualité
    switch (quality) {
      case 'low':
        settings.shadowMapSize = 256;
        settings.maxEnemies = 8;
        settings.terrainDetail = 50;
        settings.drawDistance = 20;
        break;
      case 'high':
        settings.shadowMapSize = 1024;
        settings.maxEnemies = 25;
        settings.terrainDetail = 150;
        settings.drawDistance = 50;
        break;
    }

    return settings;
  }
}));

/* Example usage in World.tsx:

import { useSettingsStore } from '../stores/settingsStore';

function World() {
  // Get quality settings from the store
  const qualitySettings = useSettingsStore(state => state.getQualitySettings());

  // Use these settings:
  useEffect(() => {
    const initialEnemies = spawnPositions.slice(0, qualitySettings.maxEnemies / 2).map((pos, i) => ({
      // initialization code
    }));

    // Additional code

    setEnemies(prev => {
      if (prev.length >= qualitySettings.maxEnemies) return prev;
      // Additional code
    });
  }, [qualitySettings]);
}
*/
