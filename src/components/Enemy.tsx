import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { usePlayerStore } from '../stores/playerStore';

interface EnemyProps {
  position: [number, number, number];
  level: number;
  type: 'wolf' | 'snake' | 'scorpion';
  health: number;
  maxHealth: number;
  onCollision: () => void;
}

export function Enemy({ position, level, type, health, maxHealth, onCollision }: EnemyProps) {
  const enemyRef = useRef<THREE.Group>(null);
  const [direction, setDirection] = useState(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize());
  const [isPlayerNearby, setIsPlayerNearby] = useState(false);
  const playerLevel = usePlayerStore(state => state.level);
  const speed = 0.1;

  // Memoize enemy color to prevent recalculation
  const enemyColor = useMemo(() => {
    if (level >= playerLevel + 3) return '#ff0000';
    if (level <= playerLevel - 3) return '#00ff00';
    return '#ffff00';
  }, [level, playerLevel]);

  // Memoize geometries and materials
  const geometries = useMemo(() => ({
    body: new THREE.CapsuleGeometry(0.5, 1, 32),
    face: new THREE.BoxGeometry(0.3, 0.1, 0.1)
  }), []);

  const materials = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({ color: enemyColor }),
    face: new THREE.MeshStandardMaterial({ color: '#000000' })
  }), [enemyColor]);

  // Optimization: Only update position every other frame
  const frameCount = useRef(0);

  useFrame(({ scene }) => {
    if (!enemyRef.current) return;

    frameCount.current++;
    if (frameCount.current % 2 !== 0) return;

    const player = scene.getObjectByName('player');
    if (!player) return;

    const currentPos = enemyRef.current.position;
    const distanceToPlayer = currentPos.distanceTo(player.position);
    
    // Only update player nearby state if it changes
    if ((distanceToPlayer < 10) !== isPlayerNearby) {
      setIsPlayerNearby(distanceToPlayer < 10);
    }

    // Only update movement if player is within range
    if (distanceToPlayer < 50) {
      if (distanceToPlayer < 20 && level >= playerLevel - 2) {
        const newDirection = player.position.clone()
          .sub(currentPos)
          .normalize();
        setDirection(newDirection);
      } else if (Math.random() < 0.01) {
        setDirection(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize());
      }

      const nextPosition = currentPos.clone().add(direction.clone().multiplyScalar(speed));
      
      // Simplified collision check
      const height = -5 + Math.sin(nextPosition.x * 0.02) * Math.cos(nextPosition.z * 0.02) * 5;
      
      if (Math.abs(nextPosition.x) < 1500 && Math.abs(nextPosition.z) < 1500) {
        enemyRef.current.position.copy(nextPosition);
        enemyRef.current.position.y = height;

        const angle = Math.atan2(direction.x, direction.z);
        enemyRef.current.rotation.y = -angle;
      }

      if (distanceToPlayer < 2) {
        onCollision();
      }
    }
  });

  return (
    <group ref={enemyRef} position={position}>
      <mesh geometry={geometries.body} material={materials.body} castShadow />
      <mesh position={[0, 0.5, 0.3]} geometry={geometries.face} material={materials.face} />
      
      {isPlayerNearby && (
        <Html position={[0, 2, 0]} center>
          <div className="bg-black/75 text-white px-2 py-1 rounded text-sm whitespace-nowrap">
            <div className="text-center">Lvl {level} {type}</div>
            <div className="w-20 h-1 bg-gray-700 rounded-full mt-1">
              <div 
                className="h-full bg-red-500 rounded-full"
                style={{ width: `${(health / maxHealth) * 100}%` }}
              />
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}