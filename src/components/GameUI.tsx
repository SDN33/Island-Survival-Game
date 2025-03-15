import React from 'react';
import { Sun, Moon, Cloud, CloudRain, Droplets, Heart, Timer } from 'lucide-react';
import { PlayerStats, GameState } from '../types/game';

interface GameUIProps {
  playerStats: PlayerStats;
  gameState: GameState;
}

export function GameUI({ playerStats, gameState }: GameUIProps) {
  const getWeatherIcon = () => {
    switch (gameState.weather) {
      case 'rain':
        return <CloudRain className="w-6 h-6 text-blue-400" />;
      case 'storm':
        return <Cloud className="w-6 h-6 text-gray-600" />;
      default:
        return gameState.time >= 6 && gameState.time <= 18 
          ? <Sun className="w-6 h-6 text-yellow-400" />
          : <Moon className="w-6 h-6 text-gray-300" />;
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 p-4 flex justify-between items-start">
      <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          <div className="w-32 h-2 bg-gray-700 rounded-full">
            <div 
              className="h-full bg-red-500 rounded-full"
              style={{ width: `${playerStats.health}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Droplets className="w-5 h-5 text-blue-500" />
          <div className="w-32 h-2 bg-gray-700 rounded-full">
            <div 
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${playerStats.thirst}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white flex items-center gap-4">
        {getWeatherIcon()}
        <Timer className="w-5 h-5" />
        <span>Day {gameState.dayCount}</span>
      </div>
    </div>
  );
}