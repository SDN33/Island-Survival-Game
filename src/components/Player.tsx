import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlayerStore } from '../stores/playerStore';

export function Player() {
  const playerRef = useRef<THREE.Group>(null);
  const targetPosition = useRef<THREE.Vector3 | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const speed = 0.2;
  
  const { camera, raycaster, scene } = useThree();
  const { health, updateHealth } = usePlayerStore();

  const handleClick = useCallback((event: MouseEvent) => {
    if (!playerRef.current) return;

    // Get mouse position in normalized device coordinates (-1 to +1)
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Find the first ground intersection
    const groundIntersect = intersects.find(intersect => 
      intersect.object.name === 'ground' ||
      (intersect.object.geometry instanceof THREE.PlaneGeometry && intersect.point.y < 1)
    );

    if (groundIntersect) {
      targetPosition.current = groundIntersect.point.clone();
      targetPosition.current.y = 0; // Keep player at ground level
      setIsMoving(true);
    }
  }, [camera, raycaster, scene]);

  useEffect(() => {
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [handleClick]);

  // Initialize camera position
  useEffect(() => {
    if (playerRef.current) {
      const initialOffset = new THREE.Vector3(-8, 12, 12);
      camera.position.copy(playerRef.current.position).add(initialOffset);
      camera.lookAt(playerRef.current.position);
    }
  }, [camera]);

  useFrame(() => {
    if (!playerRef.current || !isMoving || !targetPosition.current) return;

    const currentPos = playerRef.current.position;
    const direction = targetPosition.current.clone().sub(currentPos);
    const distance = direction.length();

    if (distance > 0.1) {
      direction.normalize();
      const moveStep = Math.min(speed, distance);
      
      // Create the next position
      const nextPosition = currentPos.clone().add(direction.multiplyScalar(moveStep));

      // Update position
      playerRef.current.position.copy(nextPosition);

      // Rotate player to face movement direction
      const angle = Math.atan2(direction.x, direction.z);
      playerRef.current.rotation.y = -angle;

      // Calculate camera position
      const cameraOffset = new THREE.Vector3(-8, 12, 12);
      const targetCameraPos = nextPosition.clone().add(cameraOffset);
      
      // Smoothly move camera
      camera.position.lerp(targetCameraPos, 0.05);
      camera.lookAt(nextPosition);
    } else {
      setIsMoving(false);
      targetPosition.current = null;
    }
  });

  return (
    <group ref={playerRef} position={[0, 0, 0]} name="player">
      {/* Player body */}
      <mesh castShadow>
        <capsuleGeometry args={[0.5, 1, 32]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      {/* Player direction indicator */}
      <mesh position={[0, 0.5, 0.3]}>
        <boxGeometry args={[0.3, 0.1, 0.1]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      {/* Player shadow */}
      <mesh position={[0, -0.99, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}