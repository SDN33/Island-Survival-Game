import { useRef, useState, useMemo, useEffect } from 'react';
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
  isAggressive: boolean;
  onCollision: () => void;
}

export function Enemy({ position, level, type, health, maxHealth, isAggressive, onCollision }: EnemyProps) {
  const enemyRef = useRef<THREE.Group>(null);
  const directionVector = useRef(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize());
  const [isPlayerNearby, setIsPlayerNearby] = useState(false);
  const [distanceToPlayer, setDistanceToPlayer] = useState(Infinity);
  const [animationState, setAnimationState] = useState<'idle' | 'walk' | 'attack'>('idle');
  const playerLevel = usePlayerStore(state => state.level);
  const speed = isAggressive ? 0.2 : 0.1;

  // Animation
  const animationTime = useRef(0);
  const attackCooldown = useRef(0);

  // Vector3 réutilisables
  const tempVector = useMemo(() => new THREE.Vector3(), []);
  const nextPositionVector = useMemo(() => new THREE.Vector3(), []);

  // Memoize enemy appearance based on type
  const enemyColor = useMemo(() => {
    switch(type) {
      case 'wolf': return '#8B4513';
      case 'snake': return '#2e8b57';
      case 'scorpion': return '#8B0000';
      default: return '#ff0000';
    }
  }, [type]);

  const enemyShape = useMemo(() => {
    switch(type) {
      case 'wolf':
        return {
          body: new THREE.CapsuleGeometry(0.5, 1, 8),
          head: new THREE.SphereGeometry(0.4, 8, 8),
          tail: new THREE.ConeGeometry(0.2, 0.8, 8)
        };
      case 'snake':
        return {
          body: new THREE.CapsuleGeometry(0.3, 1.3, 8),
          head: new THREE.SphereGeometry(0.3, 8, 8),
          tail: new THREE.ConeGeometry(0.1, 0.6, 8)
        };
      case 'scorpion':
        return {
          body: new THREE.BoxGeometry(0.8, 0.4, 1),
          head: new THREE.BoxGeometry(0.3, 0.3, 0.3),
          tail: new THREE.CapsuleGeometry(0.1, 1, 8)
        };
      default:
        return {
          body: new THREE.CapsuleGeometry(0.5, 1, 8),
          head: new THREE.SphereGeometry(0.4, 8, 8),
          tail: new THREE.ConeGeometry(0.2, 0.8, 8)
        };
    }
  }, [type]);

  // Memoize materials
  const materials = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({ color: enemyColor }),
    head: new THREE.MeshStandardMaterial({ color: enemyColor }),
    eyes: new THREE.MeshStandardMaterial({ color: '#000000' }),
    tail: new THREE.MeshStandardMaterial({ color: enemyColor }),
    glow: new THREE.MeshBasicMaterial({
      color: isAggressive ? '#ff0000' : '#ffffff',
      transparent: true,
      opacity: 0.3
    })
  }), [enemyColor, isAggressive]);

  // Level indicator color
  const levelColor = useMemo(() => {
    if (level >= playerLevel + 3) return 'text-red-500';
    if (level <= playerLevel - 3) return 'text-green-500';
    return 'text-yellow-500';
  }, [level, playerLevel]);

  // Skip more frames for better performance
  const frameCount = useRef(0);

  // Ajouter un effet de hit
  const [showHitEffect, setShowHitEffect] = useState(false);
  const prevHealth = useRef(health);

  useEffect(() => {
    // Si la santé a diminué, montrer l'effet de hit
    if (health < prevHealth.current) {
      setShowHitEffect(true);
      setTimeout(() => setShowHitEffect(false), 300);
    }
    prevHealth.current = health;
  }, [health]);

  // Animation effect
  useFrame(({ scene, clock }) => {
    if (!enemyRef.current) return;

    frameCount.current++;
    // Process only every 3rd frame for optimization
    if (frameCount.current % 3 !== 0) return;

    const delta = clock.getDelta();
    const player = scene.getObjectByName('player');
    if (!player) return;

    const currentPos = enemyRef.current.position;
    const distance = tempVector.copy(player.position).distanceTo(currentPos);

    // Update distance state (only when significant changes to reduce renders)
    if (Math.abs(distance - distanceToPlayer) > 0.5) {
      setDistanceToPlayer(distance);
      setIsPlayerNearby(distance < 15);
    }

    // Update animation state
    animationTime.current += delta * 2;

    // Enemy is active only if within reasonable distance
    if (distanceToPlayer < 30) {
      // Attack behavior
      if (distanceToPlayer < 2 && isAggressive) {
        setAnimationState('attack');
        attackCooldown.current -= delta;

        if (attackCooldown.current <= 0) {
          onCollision();
          attackCooldown.current = 1; // 1 second cooldown
        }
      }
      // Chase behavior based on aggression and distance
      else if (distanceToPlayer < 15 && (isAggressive || level <= playerLevel)) {
        setAnimationState('walk');

        // Chase player if aggressive or if player is higher level
        tempVector.copy(player.position).sub(currentPos).normalize();
        directionVector.current.copy(tempVector);

        // Move toward player
        nextPositionVector.copy(currentPos)
          .add(tempVector.copy(directionVector.current).multiplyScalar(speed));

        // Apply terrain height
        const x = nextPositionVector.x;
        const z = nextPositionVector.z;
        const height = -5 + Math.sin(x * 0.02) * Math.cos(z * 0.02) * 5;

        if (Math.abs(x) < 1500 && Math.abs(z) < 1500) {
          nextPositionVector.y = height; // Apply terrain height
          enemyRef.current.position.copy(nextPositionVector);

          // Rotate enemy to face movement direction
          const angle = Math.atan2(directionVector.current.x, directionVector.current.z);
          enemyRef.current.rotation.y = -angle;
        }
      }
      // Random movement
      else if (Math.random() < 0.01) {
        setAnimationState('idle');
        directionVector.current.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
      }

      // Apply animations based on state
      if (animationState === 'walk') {
        // Walk animation - bob up and down slightly
        if (enemyRef.current.children[0]) {
          enemyRef.current.children[0].position.y = Math.sin(animationTime.current * 5) * 0.1;
        }
        if (enemyRef.current.children[1]) {
          enemyRef.current.children[1].rotation.x = Math.sin(animationTime.current * 5) * 0.1;
        }
      }
      else if (animationState === 'attack') {
        // Attack animation - lunge forward
        if (enemyRef.current.children[1]) {
          enemyRef.current.children[1].position.z = Math.sin(animationTime.current * 10) * 0.2 + 0.4;
        }
        // Rotate tail/stinger for scorpions
        if (type === 'scorpion' && enemyRef.current.children[2]) {
          enemyRef.current.children[2].rotation.x = Math.sin(animationTime.current * 10) * 0.5 - 0.5;
        }
      }
      else {
        // Idle animation - gentle breathing effect
        if (enemyRef.current.children[0]) {
          enemyRef.current.children[0].scale.y = 1 + Math.sin(animationTime.current * 2) * 0.04;
        }
      }
    }
  });

  return (
    <group ref={enemyRef} position={position}>
      {/* Body */}
      <mesh geometry={enemyShape.body} material={materials.body} castShadow />

      {/* Head */}
      <mesh
        position={[0, 0.4, 0.4]}
        geometry={enemyShape.head}
        material={materials.head}
        castShadow
      />

      {/* Tail */}
      <mesh
        position={[0, 0.2, -0.6]}
        rotation={[type === 'scorpion' ? -0.5 : 0, 0, 0]}
        geometry={enemyShape.tail}
        material={materials.tail}
        castShadow
      />

      {/* Eyes */}
      <mesh
        position={[0.1, 0.5, 0.5]}
        geometry={new THREE.SphereGeometry(0.05, 8, 8)}
        material={materials.eyes}
      />
      <mesh
        position={[-0.1, 0.5, 0.5]}
        geometry={new THREE.SphereGeometry(0.05, 8, 8)}
        material={materials.eyes}
      />

      {/* Glow */}
      <mesh
        geometry={new THREE.SphereGeometry(1, 8, 8)}
        material={materials.glow}
        scale={[1, 1, 1]}
      />

      {/* Effet de hit */}
      {showHitEffect && (
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[1.5, 8, 8]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.3} />
        </mesh>
      )}

      {/* Indication de dégâts au-dessus de l'ennemi */}
      {showHitEffect && (
        <Html position={[0, 2, 0]} center>
          <div className="damage-number" style={{
            color: 'red',
            fontWeight: 'bold',
            animation: 'fadeUp 0.5s forwards'
          }}>
            -10
          </div>
        </Html>
      )}

      {/* N'affichez l'HTML que si le joueur est vraiment proche */}
      {isPlayerNearby && distanceToPlayer < 5 && (
        <Html position={[0, 2, 0]} center>
          <div className="bg-black/75 text-white px-2 py-1 rounded text-sm whitespace-nowrap">
            <div className={`text-center ${levelColor}`}>Lvl {level} {type}</div>
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
