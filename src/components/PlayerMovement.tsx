import { useRef, useEffect, useCallback, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface PlayerMovementProps {
  playerRef: React.RefObject<THREE.Group>;
  targetPosition: React.MutableRefObject<THREE.Vector3 | null>;
  setAnimationState: React.Dispatch<React.SetStateAction<'idle' | 'walking' | 'attacking' | 'collecting'>>;
  setIsMoving: React.Dispatch<React.SetStateAction<boolean>>;
  actionQueue: React.MutableRefObject<{
    type: 'collect' | 'attack' | 'move';
    target?: THREE.Object3D;
    targetType?: string;
    position?: THREE.Vector3;
    progress?: number;
    onComplete?: () => void;
  } | null>;
  onResourceCollected?: (type: string) => void;
}

export function PlayerMovement({ playerRef, targetPosition, setIsMoving, setAnimationState, actionQueue }: PlayerMovementProps) {
  const { camera, raycaster, scene } = useThree();
  const mousePosition = useRef(new THREE.Vector2());
  const tempVector = useRef(new THREE.Vector3());
  const cameraOffset = useRef(new THREE.Vector3(-8, 12, 12));
  const movementInertia = useRef({
    speed: 0,
    maxSpeed: 0.3,
    acceleration: 0.01,
    deceleration: 0.02,
    proximity: 0,
    stopThreshold: 0.1
  });

  // Nouvelle référence pour suivre le temps de déplacement
  const movementStartTime = useRef<number | null>(null);
  const maxMovementDuration = 2000; // 2 secondes

  // State pour stocker les actions disponibles
  const [availableActions, setAvailableActions] = useState<
    { type: 'collect' | 'attack'; target: THREE.Object3D; targetType: string }[]
  >([]);

  const handleClick = useCallback((event: MouseEvent) => {
    if (!playerRef.current) return;

    mousePosition.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mousePosition.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mousePosition.current, camera);

    // Utiliser les actions disponibles si elles existent
    if (availableActions.length > 0) {
      // Pour simplifier, on prend la première action disponible
      const action = availableActions[0];

      if (!targetPosition.current) targetPosition.current = new THREE.Vector3();
      const playerPos = playerRef.current.position.clone();
      const dirToObject = new THREE.Vector3().subVectors(playerPos, action.target.position).normalize();
      const optimalDistance = action.type === 'collect' ? 3 : 2;
      targetPosition.current.copy(action.target.position).addScaledVector(dirToObject, optimalDistance);
      targetPosition.current.y = 0;

      actionQueue.current = {
        type: action.type,
        target: action.target,
        targetType: action.targetType,
        position: action.target.position.clone()
      };

      setIsMoving(true);
      setAnimationState('walking');
      movementStartTime.current = Date.now();
      setAvailableActions([]); // Effacer les actions disponibles
      return;
    }

    const groundObjects = scene.children.filter(child =>
      child.name === 'ground' ||
      (child.type === 'Mesh' && child.position.y < 1)
    );

    const groundIntersects = raycaster.intersectObjects(groundObjects, true);

    if (groundIntersects.length > 0) {
      const groundPoint = groundIntersects[0].point;
      if (!targetPosition.current) targetPosition.current = new THREE.Vector3();
      targetPosition.current.copy(groundPoint);
      targetPosition.current.y = 0;

      actionQueue.current = null;

      setIsMoving(true);
      setAnimationState('walking');
      movementStartTime.current = Date.now();
    }
  }, [camera, raycaster, scene, playerRef, targetPosition, setIsMoving, setAnimationState, actionQueue, availableActions]);

  useEffect(() => {
    let lastClick = 0;
    const throttledClick = (event: MouseEvent) => {
      const now = Date.now();
      if (now - lastClick > 100) {
        lastClick = now;
        handleClick(event);
      }
    };

    window.addEventListener('click', throttledClick);
    return () => window.removeEventListener('click', throttledClick);
  }, [handleClick]);

  useFrame(() => {
    if (!playerRef.current) return;

    const currentPos = playerRef.current.position;
    const interactableObjects = scene.children.filter(child =>
      child.name?.includes('palm') ||
      child.name?.includes('rock') ||
      child.name?.includes('enemy')
    );

    // Détecter les objets interactibles à proximité
    const detectedActions: { type: 'collect' | 'attack'; target: THREE.Object3D; targetType: string }[] = [];
    interactableObjects.forEach(object => {
      const distance = tempVector.current.copy(object.position).distanceTo(currentPos);
      if (distance < 5) {
        const isResource = object.name?.includes('palm') || object.name?.includes('rock');
        const isEnemy = object.name?.includes('enemy');
        const interactType = isResource ? (object.name?.includes('palm') ? 'wood' : 'stone') : 'enemy';

        if (isResource) {
          detectedActions.push({ type: 'collect', target: object, targetType: interactType });
        } else if (isEnemy) {
          detectedActions.push({ type: 'attack', target: object, targetType: 'enemy' });
        }
      }
    });

    // Mettre à jour les actions disponibles
    setAvailableActions(detectedActions);

    if (targetPosition.current) {
      tempVector.current.copy(targetPosition.current).sub(currentPos);
      const distanceToTarget = tempVector.current.length();

      // Vérifie si le temps de déplacement a dépassé la limite
      const elapsedTime = movementStartTime.current ? Date.now() - movementStartTime.current : 0;
      if (elapsedTime >= maxMovementDuration) {
        setIsMoving(false);
        setAnimationState('idle');
        targetPosition.current = null;
        movementStartTime.current = null;
        movementInertia.current.speed = 0;
        return; // Arrête le déplacement
      }

      movementInertia.current.proximity = Math.max(0, 1 - distanceToTarget / 10);

      if (distanceToTarget > movementInertia.current.stopThreshold) {
        tempVector.current.normalize();

        if (distanceToTarget > 5) {
          movementInertia.current.speed = Math.min(
            movementInertia.current.maxSpeed,
            movementInertia.current.speed + movementInertia.current.acceleration
          );
        } else {
          movementInertia.current.speed = Math.max(
            0.05,
            movementInertia.current.speed - movementInertia.current.deceleration * (1 - distanceToTarget / 5)
          );
        }

        const moveStep = movementInertia.current.speed;
        currentPos.addScaledVector(tempVector.current, moveStep);

        const angle = Math.atan2(tempVector.current.x, tempVector.current.z);
        playerRef.current.rotation.y = THREE.MathUtils.lerp(
          playerRef.current.rotation.y,
          -angle,
          0.1
        );

        const targetCameraPos = tempVector.current.set(
          currentPos.x + cameraOffset.current.x,
          currentPos.y + cameraOffset.current.y,
          currentPos.z + cameraOffset.current.z
        );

        camera.position.lerp(targetCameraPos, 0.05);
        camera.lookAt(currentPos);
      } else {
        setIsMoving(false);

        if (actionQueue.current) {
          const action = actionQueue.current;

          if (action.type === 'collect') {
            setAnimationState('collecting');
            // startCollectingResource(action.targetType || 'wood');
          } else if (action.type === 'attack') {
            setAnimationState('attacking');
            // startAttackingTarget(action.target);
          } else {
            setAnimationState('idle');
          }

          actionQueue.current = null;
        } else {
          setAnimationState('idle');
        }

        targetPosition.current = null;
        movementInertia.current.speed = 0;
        movementStartTime.current = null;
      }
    }
  });

  return null;
}
