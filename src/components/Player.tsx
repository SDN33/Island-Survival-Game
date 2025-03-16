import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { PlayerMovement } from './PlayerMovement';
import { PlayerAnimations } from './PlayerAnimations';

interface PlayerProps {
  onResourceCollected?: (type: string) => void;
}

export function Player({ onResourceCollected }: PlayerProps) {
  const playerRef = useRef<THREE.Group>(null);
  const targetPosition = useRef<THREE.Vector3 | null>(null);
  const [animationState, setAnimationState] = useState<'idle' | 'walking' | 'attacking' | 'collecting'>('idle');
  const [isMoving, setIsMoving] = useState(false);
  const actionQueue = useRef<{
    type: 'collect' | 'attack' | 'move';
    target?: THREE.Object3D;
    targetType?: string;
    position?: THREE.Vector3;
    progress?: number;
    onComplete?: () => void;
  } | null>(null);

  const animationSpeed = useRef({
    idle: 0.5,
    walking: 1.0,
    attacking: 1.5,
    collecting: 1.2
  });

  // Utilisation de isMoving pour des logiques supplémentaires
  useEffect(() => {
    if (isMoving) {
      console.log("Player is moving");
    } else {
      console.log("Player stopped moving");
    }
  }, [isMoving]);

  return (
    <group ref={playerRef} position={[0, 0, 0]} name="player">
      <mesh castShadow geometry={new THREE.CapsuleGeometry(0.5, 1, 16)} material={new THREE.MeshStandardMaterial({ color: "#3b82f6" })} />
      <PlayerMovement
        playerRef={playerRef}
        targetPosition={targetPosition}
        setAnimationState={setAnimationState}
        onResourceCollected={onResourceCollected}
        actionQueue={actionQueue}
        setIsMoving={setIsMoving}
      />
      <PlayerAnimations
        playerRef={playerRef}
        animationState={animationState}
        animationSpeed={animationSpeed}
      />
    </group>
  );
}
