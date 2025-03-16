import { useState, useEffect } from 'react';
import { GameUI } from './components/GameUI';
import { World } from './components/World';
import { PlayerStats, GameState } from './types/game';

function App() {
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    health: 100,
    stamina: 100,
    level: 1,
    experience: 0,
  });

  const [gameState, setGameState] = useState<GameState>({
    time: 12,
    weather: 'clear',
    dayCount: 1,
  });

  useEffect(() => {
    const gameLoop = setInterval(() => {
      // Update game time (1 real second = 1 game minute)
      setGameState(prev => {
        const newTime = (prev.time + 0.25) % 24;
        const newDay = newTime < prev.time ? prev.dayCount + 1 : prev.dayCount;

        // Random weather changes
        const weatherChange = Math.random() < 0.01;
        const weathers: GameState['weather'][] = ['clear', 'rain', 'storm'];
        const newWeather = weatherChange
          ? weathers[Math.floor(Math.random() * weathers.length)]
          : prev.weather;

        return {
          ...prev,
          time: newTime,
          dayCount: newDay,
          weather: newWeather,
        };
      });

      // Decrease player stats over time
      setPlayerStats(prev => ({
        ...prev,
        stamina: Math.min(100, prev.stamina + 0.2),
      }));
    }, 1000);

    return () => clearInterval(gameLoop);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <World />
      <GameUI
        playerStats={playerStats}
        gameState={gameState}
      />
    </div>
  );
}

export default App;
