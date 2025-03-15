import React from 'react';
import { Heart, Droplets, Hammer, Shield } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';

export function UI() {
  const { health, inventory, craftableItems, craftItem } = usePlayerStore();

  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Stats */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          <div className="w-32 h-2 bg-gray-700 rounded-full">
            <div 
              className="h-full bg-red-500 rounded-full transition-all"
              style={{ width: `${health}%` }}
            />
          </div>
        </div>
      </div>

      {/* Inventory */}
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
        <h3 className="text-sm font-semibold mb-2">Inventory</h3>
        <div className="grid grid-cols-4 gap-2">
          {inventory.map((item, index) => (
            <div key={index} className="w-12 h-12 bg-gray-800/50 rounded flex items-center justify-center">
              {item.type === 'tool' && <Hammer className="w-6 h-6" />}
              {item.type === 'weapon' && <Shield className="w-6 h-6" />}
              {item.quantity > 1 && (
                <span className="absolute bottom-0 right-0 text-xs bg-black/50 px-1 rounded">
                  {item.quantity}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Crafting */}
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white">
        <h3 className="text-sm font-semibold mb-2">Crafting</h3>
        <div className="space-y-2">
          {craftableItems.map((item, index) => (
            <button
              key={index}
              className="w-full px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded flex items-center gap-2 pointer-events-auto"
              onClick={() => craftItem(item.id)}
            >
              <span>{item.name}</span>
              {item.canCraft && (
                <span className="text-xs bg-green-500/20 px-2 py-1 rounded">
                  Ready
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Controls help */}
      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white text-sm">
        <p>Click to move</p>
        <p>Avoid enemies</p>
        <p>Collect resources to craft</p>
      </div>
    </div>
  );
}