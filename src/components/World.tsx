import { useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { Island } from './Island';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { UI } from './UI';
import { usePlayerStore } from '../stores/playerStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { Enemy as EnemyType } from '../types/game';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  type: "tool" | "weapon" | "resource" | "food" | "consumable";
  consumable?: {
    healthRestored: number;
  };
}

export function World() {
  const [enemies, setEnemies] = useState<EnemyType[]>([]);
  const [questNotification, setQuestNotification] = useState("");
  const { updateHealth, addExperience, addItem } = usePlayerStore();
  const qualitySettings = useSettingsStore(state => state.getQualitySettings());

  // Génération procédurale d'ennemis selon des zones

  // Définir des zones pour les ennemis avec différentes densités
  const enemyZones = useMemo(() => {
    return [
      { name: "safe", range: 300, density: 0.2 },
      { name: "forest", range: 800, density: 0.6 },
      { name: "danger", range: 1500, density: 1 }
    ];
  }, []);

  // Augmenter le nombre de positions de spawn
  const spawnPositions = useMemo(() => {
    // Générer 50 positions au lieu de 20
    return Array.from({ length: 50 }).map(() => {
      // Utiliser une distribution plus intelligente basée sur les zones
      const angle = Math.random() * Math.PI * 2;
      let radius;

      const zoneRoll = Math.random();
      if (zoneRoll < 0.3) { // 30% dans la zone sûre
        radius = Math.random() * enemyZones[0].range;
      } else if (zoneRoll < 0.7) { // 40% dans la forêt
        radius = enemyZones[0].range + Math.random() * (enemyZones[1].range - enemyZones[0].range);
      } else { // 30% dans la zone de danger
        radius = enemyZones[1].range + Math.random() * (enemyZones[2].range - enemyZones[1].range);
      }

      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        zone: radius < enemyZones[0].range ? "safe" :
              radius < enemyZones[1].range ? "forest" : "danger"
      };
    });
  }, [enemyZones]);

  // Système de quêtes amélioré
  const [dailyQuests, setDailyQuests] = useState<Array<{
    id: string;
    title: string;
    description: string;
    completed: boolean;
    target: number;
    current: number;
    type: "kill" | "collect" | "explore";
    reward: { exp: number; item?: InventoryItem } // Utilisez directement InventoryItem
  }>>([
    {
      id: "quest1",
      title: "Éliminer des ennemis",
      description: "Chassez 5 créatures hostiles pour sécuriser votre territoire",
      completed: false,
      target: 5,
      current: 0,
      type: "kill",
      reward: {
        exp: 100,
        item: {
          id: "healing_potion",
          name: "Potion de Soin",
          quantity: 1,
          type: "consumable" as const
        }
      }
    },
    {
      id: "quest2",
      title: "Survivaliste",
      description: "Collectez 10 morceaux de bois pour renforcer votre campement",
      completed: false,
      target: 10,
      current: 0,
      type: "collect",
      reward: { exp: 50 }
    },
    {
      id: "quest3",
      title: "Collecteur de pierres",
      description: "Trouvez 8 pierres pour fabriquer des outils",
      completed: false,
      target: 8,
      current: 0,
      type: "collect",
      reward: {
        exp: 75,
        item: {
          id: "stone_axe",
          name: "Hache en pierre",
          quantity: 1,
          type: "tool" as const
        }
      }
    }
  ]);

  // Mise à jour des quêtes
  const updateQuest = useCallback((questId: string, progress: number) => {
    setDailyQuests(prev =>
      prev.map(quest => {
        if (quest.id === questId && !quest.completed) {
          const newCurrent = quest.current + progress;
          const completed = newCurrent >= quest.target;

          if (completed && !quest.completed) {
            // Quête complétée !
            setQuestNotification(`Quête complétée: ${quest.title}`);
            addExperience(quest.reward.exp);
            if (quest.reward.item) {
              // Convertir l'item de quête en item d'inventaire compatible
              const inventoryItem: InventoryItem = {
                ...quest.reward.item,
                // Ajouter les propriétés requises pour InventoryItem si nécessaires
                consumable: quest.reward.item.type === 'consumable'
                  ? { healthRestored: 20 } // Valeur par défaut pour les consommables
                  : undefined
              };
              addItem(inventoryItem);
            }

            // Notification disparaît après 3 secondes
            setTimeout(() => setQuestNotification(""), 3000);
          }

          return {
            ...quest,
            current: newCurrent,
            completed: completed
          };
        }
        return quest;
      })
    );
  }, [addExperience, addItem]);

  // Réinitialisation des quêtes quotidiennes
  useEffect(() => {
    // Reset quests every 24h
    const resetQuests = () => {
      setDailyQuests(prev =>
        prev.map(quest => ({
          ...quest,
          completed: false,
          current: 0
        }))
      );
      setQuestNotification("Nouvelles quêtes disponibles !");
      setTimeout(() => setQuestNotification(""), 3000);
    };

    const interval = setInterval(resetQuests, 24 * 60 * 60 * 1000); // 24h
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Objets réutilisables pour éviter les allocations mémoire
    const tempQuaternion = new THREE.Quaternion();
    const tempScale = new THREE.Vector3();
    const playerPosition = new THREE.Vector3();

    // Utiliser une fonction pour créer un ennemi une seule fois
    const createEnemy = (pos: {x: number, z: number, zone: string}, id: number) => ({
      id,
      position: [pos.x, 0, pos.z] as [number, number, number],
      level: pos.zone === "safe" ? Math.floor(Math.random() * 3) + 1 :
             pos.zone === "forest" ? Math.floor(Math.random() * 5) + 3 :
             Math.floor(Math.random() * 8) + 5,
      health: 100,
      maxHealth: 100,
      type: (pos.zone === "safe" ? "snake" :
            pos.zone === "forest" ? (Math.random() > 0.5 ? "wolf" : "snake") :
            (Math.random() > 0.7 ? "scorpion" : "wolf")) as EnemyType['type'],
      isAggressive: pos.zone !== "safe" || Math.random() > 0.7
    });

    // Réduire le nombre initial d'ennemis
    const maxInitialEnemies = Math.min(10, Math.floor(qualitySettings.maxEnemies * 0.4));

    // Préparer un batch d'ennemis initiaux
    const initialEnemies = spawnPositions
      .slice(0, maxInitialEnemies)
      .map((pos, i) => createEnemy(pos, i));

    setEnemies(initialEnemies);

    // Utiliser un système de spawn plus efficace
    let spawnIndex = maxInitialEnemies;
    let spawnCooldown = 200; // Cooldown plus long au démarrage
    let lastSpawnTime = 0;

    const spawnManager = () => {
      const now = performance.now();
      // Limiter la fréquence des vérifications
      if (now - lastSpawnTime < 500) {
        requestAnimationFrame(spawnManager);
        return;
      }

      lastSpawnTime = now;
      spawnCooldown--;

      // Récupérer position du joueur si disponible
      const player = document.querySelector("[name='player']");
      if (player instanceof Element && 'matrixWorld' in player) {
        (player as unknown as THREE.Object3D).matrixWorld.decompose(playerPosition, tempQuaternion, tempScale);
      }

      if (spawnCooldown <= 0) {
        // Ajouter des ennemis par lots pour réduire les rerenders
        setEnemies(prev => {
          // Ne pas créer plus d'ennemis que nécessaire
          if (prev.length >= qualitySettings.maxEnemies) {
            spawnCooldown = 300; // Attendre plus longtemps
            return prev;
          }

          // Créer un petit lot d'ennemis (1-3) à la fois
          const batchSize = Math.min(
            3,
            qualitySettings.maxEnemies - prev.length
          );

          const newEnemies = [];
          for (let i = 0; i < batchSize; i++) {
            // Trouver une position viable
            let selectedPos = null;
            let attempts = 0;

            while (!selectedPos && attempts < 5) {
              if (spawnIndex >= spawnPositions.length) spawnIndex = 0;
              const pos = spawnPositions[spawnIndex++];
              const distance = Math.hypot(playerPosition.x - pos.x, playerPosition.z - pos.z);

              if (distance > 120) { // Plus loin du joueur
                selectedPos = pos;
                break;
              }
              attempts++;
            }

            if (selectedPos) {
              newEnemies.push(createEnemy(selectedPos, Date.now() + i));
            }
          }

          // Cooldown adaptatif basé sur le nombre total d'ennemis
          spawnCooldown = 150 + prev.length * 30;

          return newEnemies.length > 0 ? [...prev, ...newEnemies] : prev;
        });
      }

      requestAnimationFrame(spawnManager);
    };

    // Démarrer après un délai pour éviter les problèmes au chargement
    const timerId = setTimeout(() => {
      requestAnimationFrame(spawnManager);
    }, 2000);

    // Cleanup
    return () => {
      clearTimeout(timerId);
    };
  }, [spawnPositions, qualitySettings]);

  const playerLevel = usePlayerStore(state => state.level);

  // Mémorisez la fonction handleEnemyCollision
  const handleEnemyCollision = useCallback((enemy: EnemyType) => {
    const levelDiff = enemy.level - playerLevel;
    const damage = Math.max(5, 10 + levelDiff * 2);

    // Appliquer les dégâts au joueur
    updateHealth(-damage);

    // Mettre à jour l'ennemi et supprimer si nécessaire
    setEnemies(prev => {
      const damageTaken = Math.max(10, playerLevel * 5);
      const newHealth = Math.max(0, enemy.health - damageTaken);

      if (newHealth <= 0) {
        // Mise à jour de la quête d'élimination d'ennemis
        updateQuest("quest1", 1);

        // XP basée sur le niveau
        const expGain = Math.max(10, enemy.level * 15);
        addExperience(expGain);

        // Chance de drop améliorée
        if (Math.random() < 0.4) { // Augmenté de 30% à 40%
          const lootTable: InventoryItem[] = [
            {id: "fiber", name: "Fibre", type: "resource", quantity: Math.floor(Math.random() * 2) + 1},
            {id: "stone", name: "Pierre", type: "resource", quantity: Math.floor(Math.random() * 2) + 1},
            {id: "claw", name: "Griffe", type: "resource", quantity: 1},
            {id: "wood", name: "Bois", type: "resource", quantity: Math.floor(Math.random() * 3) + 1}
          ];

          // Pondération pour plus de diversité
          const weights = [0.3, 0.3, 0.2, 0.2];
          const roll = Math.random();
          let index = 0;
          let sum = weights[0];

          while(roll > sum && index < weights.length - 1) {
            index++;
            sum += weights[index];
          }

          const randomLoot = lootTable[index];
          addItem(randomLoot);
        }

        // Filtrer pour retirer l'ennemi mort
        return prev.filter(e => e.id !== enemy.id);
      }

      // Mettre à jour la santé de l'ennemi touché
      return prev.map(e =>
        e.id === enemy.id ? { ...e, health: newHealth } : e
      );
    });
  }, [updateHealth, addExperience, addItem, updateQuest]);

  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{
          position: [0, 12, 12],
          fov: 75,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          gl.setPixelRatio(window.devicePixelRatio > 1 ? 1 : window.devicePixelRatio);

          // Voici la correction - qualitySettings doit être utilisé à la place
          const performanceLevel = qualitySettings.terrainDetail > 50 ? 'high' : qualitySettings.terrainDetail > 25 ? 'medium' : 'low';
          let scaleFactor = 1;

          if (performanceLevel === 'low') {
            scaleFactor = 0.6;
          } else if (performanceLevel === 'medium') {
            scaleFactor = 0.8;
          }

          gl.setSize(
            window.innerWidth * scaleFactor,
            window.innerHeight * scaleFactor,
            false
          );

          // Désactiver certaines fonctionnalités sur les appareils à faible performance
          if (performanceLevel === 'low') {
            gl.shadowMap.enabled = false;
          }
        }}
        frameloop="demand"
        performance={{
          min: 0.4,
          debounce: 200
        }}
      >
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[10, 10, 10]}
          intensity={1}
          castShadow
          shadow-mapSize-width={512} // Réduire la taille des shadow maps
          shadow-mapSize-height={512}
          shadow-camera-far={50} // Limiter la distance des ombres
          shadow-camera-near={0.5}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <Island />
        <Player onResourceCollected={(type: string) => {
          // Mise à jour de la quête de collecte de bois
          if (type === "wood") {
            updateQuest("quest2", 1);
          }
        }}/>

        {/* Afficher plus d'ennemis */}
        {enemies.map(enemy => (
          <Enemy
            key={enemy.id}
            position={enemy.position}
            level={enemy.level}
            type={enemy.type}
            health={enemy.health}
            maxHealth={enemy.maxHealth}
            isAggressive={enemy.isAggressive}
            onCollision={() => handleEnemyCollision(enemy)}
          />
        ))}
      </Canvas>

      {/* Remplacer la partie UI existante par l'UI unifiée */}
      <UI
        quests={dailyQuests}
        notification={questNotification}
        dayCount={usePlayerStore(state => state.level)} // Juste un exemple, remplacez par votre état actuel
        gameTime={12} // Remplacez par votre état actuel du temps de jeu
        weather="clear" // Remplacez par votre état actuel de la météo
      />
    </div>
  );
}
