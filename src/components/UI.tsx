import React, { useState, useEffect } from 'react';
import { Heart, Hammer, Shield, Settings, MapPin, Database, Award, ChevronRight, Sun, Moon, CloudRain } from 'lucide-react';
import { usePlayerStore } from '../stores/playerStore';
import { useSettingsStore } from '../stores/settingsStore';

interface Quest {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  target: number;
  current: number;
  type: "kill" | "collect" | "explore";
  claimed?: boolean;
  reward: {
    exp: number;
    item?: {
      id: string;
      name: string;
      quantity: number;
      type: string;
    }
  };
}

interface UIProps {
  quests?: Quest[];
  gameTime?: number;
  weather?: 'clear' | 'rain' | 'storm';
  dayCount?: number;
  notification?: string;
}

export function UI({ quests = [], gameTime = 12, weather = 'clear', dayCount = 1, notification = '' }: UIProps) {
  const { health, inventory, craftableItems, craftItem, level, experience } = usePlayerStore();
  const { quality, setQuality } = useSettingsStore();
  const [activeTab, setActiveTab] = useState("inventory");
  const [showNotification, setShowNotification] = useState(false);
  const [notificationText, setNotificationText] = useState('');

  // Calcul pour la barre d'XP
  const expToNextLevel = level * 100;
  const expPercentage = (experience / expToNextLevel) * 100;

  // Gestion des notifications
  useEffect(() => {
    if (notification) {
      setNotificationText(notification);
      setShowNotification(true);
      const timer = setTimeout(() => setShowNotification(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Icône de météo
  const getWeatherIcon = () => {
    switch (weather) {
      case 'rain':
        return <CloudRain className="w-5 h-5 text-blue-400" />;
      case 'storm':
        return <CloudRain className="w-5 h-5 text-gray-600" />;
      default:
        return gameTime >= 6 && gameTime <= 18
          ? <Sun className="w-5 h-5 text-yellow-400" />
          : <Moon className="w-5 h-5 text-gray-300" />;
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* HUD principal en haut avec statistiques vitales */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-sm rounded-full px-6 py-2 text-white">
        {/* Santé */}
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500" />
          <div className="w-28 h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-700 to-red-500 rounded-full transition-all duration-300"
              style={{ width: `${health}%` }}
            />
          </div>
        </div>

        {/* Séparateur vertical */}
        <div className="h-8 w-px bg-white/20" />

        {/* Niveau et XP */}
        <div className="flex flex-col">
          <div className="flex items-center">
            <Award className="w-4 h-4 text-yellow-500 mr-1" />
            <span className="font-bold">{level}</span>
          </div>
          <div className="w-24 h-1 bg-gray-800 rounded-full mt-1">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full"
              style={{ width: `${expPercentage}%` }}
            />
          </div>
        </div>

        {/* Séparateur vertical */}
        <div className="h-8 w-px bg-white/20" />

        {/* Informations de jeu (jour/heure/météo) */}
        <div className="flex items-center gap-2">
          {getWeatherIcon()}
          <span>Jour {dayCount}</span>
          <span className="text-sm text-gray-300">
            {Math.floor(gameTime)}:00
          </span>
        </div>
      </div>

      {/* Notification (s'affiche uniquement quand nécessaire) */}
      {showNotification && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-yellow-500/90 text-white px-4 py-2 rounded-md z-50 animate-bounce">
          {notificationText}
        </div>
      )}

      {/* Mini-carte en haut à droite */}
      <div className="absolute top-20 right-4 w-32 h-32 rounded-full bg-black/70 backdrop-blur-md border border-gray-700/50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <MapPin className="w-3 h-3 text-blue-500 z-10 animate-pulse" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/30 to-blue-900/40" />
        <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/80">Zone sûre</div>
      </div>

      {/* Panneau principal - repositionné à gauche pour plus de clarté */}
      <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md rounded-lg border border-gray-700/50 overflow-hidden pointer-events-auto">
        {/* Onglets */}
        <div className="flex border-b border-gray-700/50">
          <button
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'inventory' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/30'}`}
            onClick={() => setActiveTab('inventory')}
          >
            Inventaire
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'crafting' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/30'}`}
            onClick={() => setActiveTab('crafting')}
          >
            Fabrication
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'quests' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/30'}`}
            onClick={() => setActiveTab('quests')}
          >
            Quêtes
            {quests.some(q => q.completed && !q.claimed) && (
              <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full ml-2"></span>
            )}
          </button>
        </div>

        {/* Contenu de l'onglet actif */}
        <div className="p-4">
          {activeTab === 'inventory' && (
            <>
              <h3 className="text-sm font-semibold mb-2 text-gray-200">Équipement & Ressources</h3>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {inventory.map((item, index) => (
                  <div key={index} className="w-12 h-12 bg-gray-800/70 rounded flex items-center justify-center relative group">
                    {item.type === 'tool' && <Hammer className="w-6 h-6 text-gray-300" />}
                    {item.type === 'weapon' && <Shield className="w-6 h-6 text-gray-300" />}
                    {item.type === 'resource' && <Database className="w-6 h-6 text-gray-300" />}

                    {item.quantity > 1 && (
                      <span className="absolute bottom-0 right-0 text-xs bg-black/80 px-1 rounded">
                        {item.quantity}
                      </span>
                    )}

                    {/* Tooltip au survol */}
                    <div className="absolute bottom-full left-0 w-32 bg-gray-900 text-xs p-1 rounded mb-1 hidden group-hover:block z-10">
                      {item.name}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'crafting' && (
            <>
              <h3 className="text-sm font-semibold mb-2 text-gray-200">Fabrication</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {craftableItems.map((item, index) => (
                  <button
                    key={index}
                    className={`w-full px-3 py-2 rounded text-left flex justify-between items-center transition-colors ${
                      item.canCraft ? 'bg-blue-900/30 hover:bg-blue-900/50' : 'bg-gray-800/50'
                    }`}
                    onClick={() => craftItem(item.id)}
                    disabled={!item.canCraft}
                  >
                    <div>
                      <span className="text-sm">{item.name}</span>
                      <div className="flex gap-1 mt-1">
                        {item.requirements.map((req, i) => (
                          <div key={i} className="flex items-center text-xs">
                            <span className={`${inventory.find(inv => inv.id === req.itemId && inv.quantity >= req.quantity) ? 'text-green-400' : 'text-red-400'}`}>
                              {req.quantity}x
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${item.canCraft ? 'text-blue-400' : 'text-gray-600'}`} />
                  </button>
                ))}
              </div>
            </>
          )}

          {activeTab === 'quests' && (
            <>
              <h3 className="text-sm font-semibold mb-2 text-gray-200">Quêtes actives</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {quests.map((quest) => (
                  <div
                    key={quest.id}
                    className={`p-2 rounded border ${
                      quest.completed ? 'border-green-500/50 bg-green-900/20' : 'border-gray-700/50 bg-gray-800/30'
                    }`}
                  >
                    <div className="flex justify-between">
                      <p className="font-medium text-sm text-gray-200">{quest.title}</p>
                      <span className="text-xs text-gray-400">{quest.current}/{quest.target}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{quest.description}</p>
                    <div className="w-full h-1 bg-gray-700 rounded-full mt-2">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (quest.current / quest.target) * 100)}%` }}
                      />
                    </div>
                    {quest.completed && (
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-green-400">Terminée !</p>
                        <button className="text-xs bg-green-600 hover:bg-green-700 py-1 px-2 rounded-sm">
                          Réclamer {quest.reward.exp} XP
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Paramètres de qualité */}
        <div className="border-t border-gray-700/50 p-2">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Settings className="w-3 h-3" />
            <span>Qualité:</span>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as 'low' | 'medium' | 'high')}
              className="bg-gray-800 text-white border border-gray-700 rounded px-1 py-0 text-xs ml-2"
            >
              <option value="low">Basse</option>
              <option value="medium">Moyenne</option>
              <option value="high">Haute</option>
            </select>
          </div>
        </div>
      </div>

      {/* Conseils de jeu en bas à droite */}
      <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-xs text-white max-w-xs">
        <div className="font-medium mb-1">Conseils:</div>
        <ul className="list-disc list-inside text-gray-300 space-y-1">
          <li>Cliquez pour vous déplacer</li>
          <li>Approchez-vous des arbres pour récolter du bois</li>
          <li>Évitez les ennemis de niveau supérieur</li>
          <li>Fabriquez des outils pour augmenter vos chances de survie</li>
        </ul>
      </div>
    </div>
  );
}
