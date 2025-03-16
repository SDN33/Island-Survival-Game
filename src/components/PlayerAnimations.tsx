import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PlayerAnimationsProps {
  playerRef: React.RefObject<THREE.Group>;
  animationState: 'idle' | 'walking' | 'attacking' | 'collecting';
  animationSpeed: React.RefObject<{
    idle: number;
    walking: number;
    attacking: number;
    collecting: number;
  }>;
}

export function PlayerAnimations({ playerRef, animationState, animationSpeed }: PlayerAnimationsProps) {
  const animationTimer = useRef<number>(0);
  const animationFrame = useRef<number>(0);

  useFrame(() => {
    if (!playerRef.current) return;

    if (animationState === 'walking') {
      const walkCycle = Math.sin(animationTimer.current * Math.PI * 2);
      const walkIntensity = animationSpeed.current?.walking || 1;

      playerRef.current.children[0].position.y = Math.abs(walkCycle) * 0.15 * walkIntensity;
      playerRef.current.children[0].rotation.z = walkCycle * 0.05 * walkIntensity;
      playerRef.current.children[0].rotation.x = Math.abs(walkCycle) * 0.03 * walkIntensity;

      if (playerRef.current.children.length > 1) {
        playerRef.current.children[1].position.y = 0.5 + walkCycle * 0.1 * walkIntensity;
        playerRef.current.children[1].position.z = 0.3 + walkCycle * 0.05 * walkIntensity;
      }
    } else if (animationState === 'attacking') {
      const attackPhase = (animationTimer.current % 1);

      if (playerRef.current && playerRef.current.children.length > 1) {
        if (attackPhase < 0.3) {
          playerRef.current.children[0].rotation.x = -0.1 - attackPhase * 0.5;
          playerRef.current.children[1].rotation.x = -0.5 - attackPhase * 3;
          playerRef.current.children[1].position.z = 0.2 - attackPhase * 0.3;
        } else if (attackPhase < 0.5) {
          playerRef.current.children[0].rotation.x = -0.25 + (attackPhase - 0.3) * 1.5;
          playerRef.current.children[1].rotation.x = -1.4 + (attackPhase - 0.3) * 10;
          playerRef.current.children[1].position.z = 0.1 + (attackPhase - 0.3) * 1.5;
        } else {
          playerRef.current.children[0].rotation.x = 0.2 - (attackPhase - 0.5) * 0.4;
          playerRef.current.children[1].rotation.x = 0.6 - (attackPhase - 0.5) * 1.1;
          playerRef.current.children[1].position.z = 0.5 - (attackPhase - 0.5) * 0.8;
        }
      }
    } else if (animationState === 'collecting') {
      const collectPhase = (animationTimer.current % 1);

      if (playerRef.current && playerRef.current.children.length > 1) {
        if (collectPhase < 0.3) {
          playerRef.current.rotation.x = collectPhase * 0.2;
          playerRef.current.children[0].rotation.x = collectPhase * 0.2;
          playerRef.current.children[1].rotation.x = collectPhase * 0.8;
        } else if (collectPhase < 0.6) {
          const collectionProgress = (collectPhase - 0.3) / 0.3;
          playerRef.current.rotation.x = 0.2 + Math.sin(collectionProgress * Math.PI) * 0.15;
          playerRef.current.children[0].rotation.x = 0.2 + Math.cos(collectionProgress * Math.PI * 3) * 0.1;
          playerRef.current.children[1].rotation.x = 0.8 + Math.sin(collectionProgress * Math.PI * 2) * 0.6;
        } else {
          const returnProgress = (collectPhase - 0.6) / 0.4;
          playerRef.current.rotation.x = 0.15 - returnProgress * 0.15;
          playerRef.current.children[0].rotation.x = 0.1 - returnProgress * 0.1;
          playerRef.current.children[1].rotation.x = 0.6 - returnProgress * 0.6;
        }
      }
    } else if (animationState === 'idle') {
      const breathe = Math.sin(animationTimer.current * 0.5);
      const smallMovement = Math.sin(animationTimer.current * 0.2) * Math.cos(animationTimer.current * 0.3);

      if (playerRef.current) {
        playerRef.current.children[0].position.y = breathe * 0.05;
        playerRef.current.children[0].scale.y = 1 + breathe * 0.03;
        playerRef.current.children[0].rotation.z = smallMovement * 0.01;

        if (playerRef.current.children.length > 1) {
          playerRef.current.children[1].rotation.x = smallMovement * 0.03;
        }
      }
    }

    const stateSpeed = animationSpeed.current?.[animationState] || 1;
    animationTimer.current += 0.05 * stateSpeed;
    if (animationTimer.current > 1) {
      animationFrame.current = (animationFrame.current + 1) % 4;
      if (animationFrame.current === 0) animationTimer.current = 0;
    }
  });

  return null;
}
