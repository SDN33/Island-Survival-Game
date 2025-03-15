import React, { useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { Island } from './Island';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { UI } from './UI';
import { usePlayerStore } from '../stores/playerStore';
import type { Enemy as EnemyType } from '../types/game';

export function World() {
  const [enemies, setEnemies] = useState<EnemyType[]>([]);
  const { updateHealth, addExperience } = usePlayerStore();

  // Memoize enemy spawn positions
  const spawnPositions = useMemo(() => {
    return Array.from({ length: 30 }).map(() => ({
      x: Math.random() * 2000 - 1000,
      z: Math.random() * 2000 - 1000
    }));
  }, []);

  useEffect(() => {
    // Spawn initial enemies using pre-calculated positions
    const initialEnemies = spawnPositions.slice(0, 20).map((pos, i) => ({
      id: i,
      position: [pos.x, 0, pos.z] as [number, number, number],
      level: Math.floor(Math.random() * 10) + 1,
      health: 100,
      maxHealth: 100,
      type: ['wolf', 'snake', 'scorpion'][Math.floor(Math.random() * 3)] as EnemyType['type'],
      isAggressive: Math.random() > 0.5
    }));
    setEnemies(initialEnemies);

    let spawnIndex = 20;
    const spawnInterval = setInterval(() => {
      if (spawnIndex >= spawnPositions.length) return;
      
      setEnemies(prev => {
        if (prev.length >= 30) return prev;
        const pos = spawnPositions[spawnIndex++];
        return [...prev, {
          id: Date.now(),
          position: [pos.x, 0, pos.z] as [number, number, number],
          level: Math.floor(Math.random() * 10) + 1,
          health: 100,
          maxHealth: 100,
          type: ['wolf', 'snake', 'scorpion'][Math.floor(Math.random() * 3)] as EnemyType['type'],
          isAggressive: Math.random() > 0.5
        }];
      });
    }, 10000);

    return () => clearInterval(spawnInterval);
  }, [spawnPositions]);

  const handleEnemyCollision = (enemy: EnemyType) => {
    const playerLevel = usePlayerStore.getState().level;
    const levelDiff = enemy.level - playerLevel;
    const damage = Math.max(5, 10 + levelDiff * 2);
    
    updateHealth(-damage);
    
    setEnemies(prev => prev.map(e => 
      e.id === enemy.id 
        ? { ...e, health: Math.max(0, e.health - (playerLevel * 5)) }
        : e
    ).filter(e => e.health > 0));

    if (enemy.health <= 0) {
      const expGain = Math.max(10, enemy.level * 15);
      addExperience(expGain);
    }
  };

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
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for better performance
        }}
        frameloop="demand" // Only render when needed
      >
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[10, 10, 10]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024} // Reduced shadow map size for better performance
          shadow-mapSize-height={1024}
        />
        <Island />
        <Player />
        {enemies.map(enemy => (
          <Enemy
            key={enemy.id}
            position={enemy.position}
            level={enemy.level}
            type={enemy.type}
            health={enemy.health}
            maxHealth={enemy.maxHealth}
            onCollision={() => handleEnemyCollision(enemy)}
          />
        ))}
      </Canvas>
      <UI />
    </div>
  );
}