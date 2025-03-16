import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlayerStore } from '../stores/playerStore';

interface PlayerProps {
  onResourceCollected?: (type: string) => void;
}

export function Player({ onResourceCollected }: PlayerProps) {
  const playerRef = useRef<THREE.Group>(null);
  const targetPosition = useRef<THREE.Vector3 | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [animationState, setAnimationState] = useState<'idle' | 'walking' | 'attacking' | 'collecting'>('idle');
  const { addItem } = usePlayerStore();

  const { camera, raycaster, scene } = useThree();

  // Objets réutilisables pour éviter de créer des instances en boucle
  const mousePosition = useRef(new THREE.Vector2());
  const tempVector = useRef(new THREE.Vector3());
  const cameraOffset = useRef(new THREE.Vector3(-8, 12, 12));

  // Animation system
  const animationTimer = useRef<number>(0);
  const animationFrame = useRef<number>(0);
  const animationSpeed = useRef({
    idle: 0.5,
    walking: 1.0,
    attacking: 1.5,
    collecting: 1.2
  });

  // Système de file d'actions
  const actionQueue = useRef<{
    type: 'collect' | 'attack' | 'move';
    target?: THREE.Object3D;
    targetType?: string;
    position?: THREE.Vector3;
    progress?: number;
  } | null>(null);

  // Système d'arrivée avec inertie
  const movementInertia = useRef({
    speed: 0,
    maxSpeed: 0.3,
    acceleration: 0.01,
    deceleration: 0.02,
    proximity: 0 // Pour mesurer à quel point on est proche de la cible
  });

  // Système de détection d'objets à proximité
  const nearbyObjects = useRef<{
    type: string;
    object: THREE.Object3D;
    distance: number;
  }[]>([]);

  // Optimisez le traitement des clics
  const handleClick = useCallback((event: MouseEvent) => {
    if (!playerRef.current) return;

    // Limiter le nombre de raycasts lors de mouvements rapides de souris
    mousePosition.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mousePosition.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Mise à jour du raycaster
    raycaster.setFromCamera(mousePosition.current, camera);

    // Créer un indicateur de clic plus visible et attrayant
    const createClickIndicator = (x: number, y: number, isResourceClick = false) => {
      const indicator = document.createElement('div');
      indicator.className = 'click-indicator';
      indicator.style.position = 'absolute';
      indicator.style.top = `${y}px`;
      indicator.style.left = `${x}px`;
      indicator.style.width = '30px';
      indicator.style.height = '30px';
      indicator.style.borderRadius = '50%';
      indicator.style.transform = 'translate(-50%, -50%)';
      indicator.style.pointerEvents = 'none';
      indicator.style.zIndex = '999';

      // Style selon le type de clic
      if (isResourceClick) {
        // Indicateur pour ressource
        indicator.innerHTML = `
          <div style="position:absolute; width:30px; height:30px; border-radius:50%;
                      border:2px solid #4CAF50; animation: pulse-green 1s infinite;">
          </div>
          <div style="position:absolute; left:10px; top:10px; width:10px; height:10px;
                      background-color:#4CAF50; border-radius:50%;">
          </div>
        `;
      } else {
        // Indicateur pour déplacement
        indicator.innerHTML = `
          <div style="position:absolute; width:30px; height:30px; border-radius:50%;
                      border:2px solid white; animation: pulse-white 1s infinite;">
          </div>
          <div style="position:absolute; left:13px; top:13px; width:4px; height:4px;
                      background-color:white; border-radius:50%;">
          </div>
        `;
      }

      // Injecter les styles d'animation si nécessaire
      if (!document.getElementById('click-indicator-style')) {
        const style = document.createElement('style');
        style.id = 'click-indicator-style';
        style.textContent = `
          @keyframes pulse-white {
            0% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.2); opacity: 0.5; }
            100% { transform: scale(1); opacity: 0.7; }
          }
          @keyframes pulse-green {
            0% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.2); opacity: 0.5; }
            100% { transform: scale(1); opacity: 0.7; }
          }
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      document.body.appendChild(indicator);

      // Supprimer après animation
      setTimeout(() => {
        indicator.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => {
          if (indicator.parentNode) {
            document.body.removeChild(indicator);
          }
        }, 500);
      }, 1500);

      return indicator;
    };

    // Vérifier d'abord les interactions avec les ressources et ennemis
    const interactableObjects = scene.children.filter(child =>
      child.name?.includes('palm') ||
      child.name?.includes('rock') ||
      child.name?.includes('enemy')
    );

    const interactionIntersects = raycaster.intersectObjects(interactableObjects, true);

    // Lorsqu'une ressource ou ennemi est détecté
    if (interactionIntersects.length > 0) {
      const interactObject = interactionIntersects[0].object;
      const interactPoint = interactionIntersects[0].point;

      // Déterminer type d'interaction
      const isResource = interactObject.name?.includes('palm') || interactObject.name?.includes('rock');
      const isEnemy = interactObject.name?.includes('enemy');
      const interactType = isResource ? (interactObject.name?.includes('palm') ? 'wood' : 'stone') : 'enemy';

      // Créer un indicateur visuel amélioré au point de clic
      createClickIndicator(event.clientX, event.clientY, true);

      // Définir le point de destination - légèrement décalé vers le joueur pour éviter de traverser l'objet
      if (!targetPosition.current) targetPosition.current = new THREE.Vector3();

      // Calculer un point d'approche optimal
      const playerPos = playerRef.current.position.clone();
      const dirToObject = new THREE.Vector3().subVectors(playerPos, interactPoint).normalize();

      // Positionner le joueur à une distance optimale pour l'interaction
      const optimalDistance = isResource ? 3 : (isEnemy ? 2 : 0);
      targetPosition.current.copy(interactPoint).addScaledVector(dirToObject, optimalDistance);
      targetPosition.current.y = 0; // Maintenir le joueur au niveau du sol

      // Définir l'action à effectuer à l'arrivée
      actionQueue.current = {
        type: isResource ? 'collect' : 'attack',
        target: interactObject,
        targetType: interactType,
        position: interactPoint.clone()
      };

      setIsMoving(true);
      setAnimationState('walking');
      return;
    }

    // Si pas d'interaction avec une ressource/ennemi, traitement normal de déplacement
    const groundObjects = scene.children.filter(child =>
      child.name === 'ground' ||
      (child.type === 'Mesh' && child.position.y < 1)
    );

    const groundIntersects = raycaster.intersectObjects(groundObjects, true);

    if (groundIntersects.length > 0) {
      const groundPoint = groundIntersects[0].point;

      // Créer l'indicateur de clic
      createClickIndicator(event.clientX, event.clientY);

      // Définir la nouvelle destination
      if (!targetPosition.current) targetPosition.current = new THREE.Vector3();
      targetPosition.current.copy(groundPoint);
      targetPosition.current.y = 0;

      // Vider la file d'action car c'est juste un déplacement
      actionQueue.current = null;

      setIsMoving(true);
      setAnimationState('walking');
    }
  }, [camera, raycaster, scene, addItem, onResourceCollected]);

  useEffect(() => {
    // Utiliser une version throttle du gestionnaire de clic
    let lastClick = 0;
    const throttledClick = (event: MouseEvent) => {
      const now = Date.now();
      if (now - lastClick > 100) { // Limite à un clic tous les 100ms
        lastClick = now;
        handleClick(event);
      }
    };

    window.addEventListener('click', throttledClick);
    return () => window.removeEventListener('click', throttledClick);
  }, [handleClick]);

  // Réduire la fréquence des mises à jour de position
  const frameCounter = useRef(0);

  useFrame(() => {
    frameCounter.current++;
    if (frameCounter.current % 2 !== 0) return; // Optimisation: traiter un frame sur deux

    if (!playerRef.current) return;

    // Scan périodique des objets à proximité (toutes les 30 frames)
    if (frameCounter.current % 30 === 0) {
      scanNearbyObjects();
    }

    // 1. Gestion du mouvement avec inertie
    if (isMoving && targetPosition.current) {
      const currentPos = playerRef.current.position;
      tempVector.current.copy(targetPosition.current).sub(currentPos);
      const distanceToTarget = tempVector.current.length();

      // Calculer la proximité en pourcentage (0 = loin, 1 = arrivé)
      movementInertia.current.proximity = Math.max(0, 1 - distanceToTarget / 10);

      if (distanceToTarget > 0.1) {
        // Normaliser le vecteur de direction
        tempVector.current.normalize();

        // Accélérer/décélérer selon la distance à la cible
        if (distanceToTarget > 5) {
          // Accélération
          movementInertia.current.speed = Math.min(
            movementInertia.current.maxSpeed,
            movementInertia.current.speed + movementInertia.current.acceleration
          );
        } else {
          // Décélération à l'approche
          movementInertia.current.speed = Math.max(
            0.05, // vitesse minimale
            movementInertia.current.speed - movementInertia.current.deceleration *
            (1 - distanceToTarget / 5)
          );
        }

        // Appliquer le mouvement avec l'inertie
        const moveStep = movementInertia.current.speed;
        currentPos.addScaledVector(tempVector.current, moveStep);

        // Rotation du joueur avec lissage
        const angle = Math.atan2(tempVector.current.x, tempVector.current.z);
        playerRef.current.rotation.y = THREE.MathUtils.lerp(
          playerRef.current.rotation.y,
          -angle,
          0.1
        );

        // Déplacement progressif de la caméra
        const targetCameraPos = tempVector.current.set(
          currentPos.x + cameraOffset.current.x,
          currentPos.y + cameraOffset.current.y,
          currentPos.z + cameraOffset.current.z
        );

        camera.position.lerp(targetCameraPos, 0.05);
        camera.lookAt(currentPos);

        // Animation de marche selon la vitesse
        if (animationState === 'walking') {
          // Vitesse d'animation proportionnelle à la vitesse de mouvement
          animationSpeed.current.walking = 0.5 + movementInertia.current.speed * 2;
        }
      } else {
        // Arrivée à destination
        setIsMoving(false);

        // Exécuter l'action en file d'attente s'il y en a une
        if (actionQueue.current) {
          const action = actionQueue.current;

          if (action.type === 'collect') {
            setAnimationState('collecting');
            startCollectingResource(action.targetType || 'wood');
          }
          else if (action.type === 'attack') {
            setAnimationState('attacking');
            startAttackingTarget(action.target);
          }
          else {
            // Simple mouvement, retour à idle
            setAnimationState('idle');
          }

          // Réinitialiser la file
          actionQueue.current = null;
        } else {
          setAnimationState('idle');
        }

        targetPosition.current = null;
        movementInertia.current.speed = 0;
      }
    }

    // 2. Gestion des animations améliorées
    updatePlayerAnimations();

    // 3. Mise à jour du timer d'animation en fonction de l'état
    const stateSpeed = animationSpeed.current[animationState];
    animationTimer.current += 0.05 * stateSpeed;
    if (animationTimer.current > 1) {
      animationFrame.current = (animationFrame.current + 1) % 4;
      if (animationFrame.current === 0) animationTimer.current = 0;
    }
  });

  // Nouvelle fonction de scan des objets à proximité
  const scanNearbyObjects = useCallback(() => {
    if (!playerRef.current) return;

    const playerPosition = playerRef.current.position;
    const interactableObjects = scene.children.filter(child =>
      child.name?.includes('palm') ||
      child.name?.includes('rock') ||
      child.name?.includes('enemy')
    );

    // Vider la liste précédente
    nearbyObjects.current = [];

    // Rechercher les objets dans un rayon
    interactableObjects.forEach(obj => {
      const objectWorldPos = new THREE.Vector3();

      // Récupérer la position mondiale de l'objet ou utiliser sa position directe
      if (obj.getWorldPosition) {
        obj.getWorldPosition(objectWorldPos);
      } else {
        objectWorldPos.copy(obj.position);
      }

      const distance = playerPosition.distanceTo(objectWorldPos);
      const interactionRadius = 5; // Rayon d'interaction

      if (distance < interactionRadius) {
        let type: string = 'unknown'; // Default value to ensure type is always a string
        if (obj.name?.includes('palm')) type = 'wood';
        else if (obj.name?.includes('rock')) type = 'stone';
        else if (obj.name?.includes('enemy')) type = 'enemy';

        nearbyObjects.current.push({
          type,
          object: obj,
          distance
        });
      }
    });

    // Afficher un indicateur UI si un objet est à proximité
    if (nearbyObjects.current.length > 0) {
      showNearbyObjectIndicator(nearbyObjects.current[0]);
    } else {
      hideNearbyObjectIndicator();
    }
  }, [scene]);

  // Fonction pour les animations améliorées du joueur
  const updatePlayerAnimations = () => {
    if (!playerRef.current) return;

    if (animationState === 'walking') {
      // Animation de marche plus fluide et réaliste
      const walkCycle = Math.sin(animationTimer.current * Math.PI * 2);
      const walkIntensity = movementInertia.current.speed / movementInertia.current.maxSpeed;

      // Corps qui bouge de haut en bas
      playerRef.current.children[0].position.y = Math.abs(walkCycle) * 0.15 * walkIntensity;

      // Léger balancement lors de la marche
      playerRef.current.children[0].rotation.z = walkCycle * 0.05 * walkIntensity;
      playerRef.current.children[0].rotation.x = Math.abs(walkCycle) * 0.03 * walkIntensity;

      // Bras qui se balancent
      if (playerRef.current.children.length > 1) {
        playerRef.current.children[1].position.y = 0.5 + walkCycle * 0.1 * walkIntensity;
        playerRef.current.children[1].position.z = 0.3 + walkCycle * 0.05 * walkIntensity;
      }
    }
    else if (animationState === 'attacking') {
      // Animation d'attaque plus dynamique avec phases distinctes
      const attackPhase = (animationTimer.current % 1);

      if (playerRef.current && playerRef.current.children.length > 1) {
        // Phase de préparation - recul
        if (attackPhase < 0.3) {
          playerRef.current.children[0].rotation.x = -0.1 - attackPhase * 0.5;
          playerRef.current.children[1].rotation.x = -0.5 - attackPhase * 3;
          playerRef.current.children[1].position.z = 0.2 - attackPhase * 0.3;
        }
        // Phase d'attaque - mouvement rapide vers l'avant
        else if (attackPhase < 0.5) {
          playerRef.current.children[0].rotation.x = -0.25 + (attackPhase - 0.3) * 1.5;
          playerRef.current.children[1].rotation.x = -1.4 + (attackPhase - 0.3) * 10;
          playerRef.current.children[1].position.z = 0.1 + (attackPhase - 0.3) * 1.5;
        }
        // Phase de récupération - retour à la position normale
        else {
          playerRef.current.children[0].rotation.x = 0.2 - (attackPhase - 0.5) * 0.4;
          playerRef.current.children[1].rotation.x = 0.6 - (attackPhase - 0.5) * 1.1;
          playerRef.current.children[1].position.z = 0.5 - (attackPhase - 0.5) * 0.8;
        }
      }
    }
    else if (animationState === 'collecting') {
      // Animation de récolte avec plusieurs phases distinctes
      const collectPhase = (animationTimer.current % 1);

      if (playerRef.current && playerRef.current.children.length > 1) {
        // Phase de préparation
        if (collectPhase < 0.3) {
          playerRef.current.rotation.x = collectPhase * 0.2;
          playerRef.current.children[0].rotation.x = collectPhase * 0.2;
          playerRef.current.children[1].rotation.x = collectPhase * 0.8;
        }
        // Phase active - mouvement de collecte
        else if (collectPhase < 0.6) {
          const collectionProgress = (collectPhase - 0.3) / 0.3;
          playerRef.current.rotation.x = 0.2 + Math.sin(collectionProgress * Math.PI) * 0.15;
          playerRef.current.children[0].rotation.x = 0.2 + Math.cos(collectionProgress * Math.PI * 3) * 0.1;
          playerRef.current.children[1].rotation.x = 0.8 + Math.sin(collectionProgress * Math.PI * 2) * 0.6;
        }
        // Phase de retour
        else {
          const returnProgress = (collectPhase - 0.6) / 0.4;
          playerRef.current.rotation.x = 0.15 - returnProgress * 0.15;
          playerRef.current.children[0].rotation.x = 0.1 - returnProgress * 0.1;
          playerRef.current.children[1].rotation.x = 0.6 - returnProgress * 0.6;
        }
      }
    }
    else if (animationState === 'idle') {
      // Animation idle plus détaillée et naturelle
      const breathe = Math.sin(animationTimer.current * 0.5);
      const smallMovement = Math.sin(animationTimer.current * 0.2) * Math.cos(animationTimer.current * 0.3);

      if (playerRef.current) {
        // Respiration légère
        playerRef.current.children[0].position.y = breathe * 0.05;
        playerRef.current.children[0].scale.y = 1 + breathe * 0.03;

        // Légers mouvements aléatoires pour donner vie
        playerRef.current.children[0].rotation.z = smallMovement * 0.01;

        // Petits mouvements d'équilibre
        if (playerRef.current.children.length > 1) {
          playerRef.current.children[1].rotation.x = smallMovement * 0.03;
        }
      }
    }
  };

  // Fonction pour démarrer la collecte de ressources
  const startCollectingResource = (resourceType: string) => {
    // Création de la barre de progression
    const progressContainer = document.createElement('div');
    progressContainer.className = 'resource-progress';
    progressContainer.style.position = 'fixed';
    progressContainer.style.bottom = '20%';
    progressContainer.style.left = '50%';
    progressContainer.style.transform = 'translateX(-50%)';
    progressContainer.style.width = '200px';
    progressContainer.style.height = '20px';
    progressContainer.style.backgroundColor = 'rgba(0,0,0,0.5)';
    progressContainer.style.borderRadius = '10px';
    progressContainer.style.overflow = 'hidden';
    progressContainer.style.zIndex = '1000';

    const progressBar = document.createElement('div');
    progressBar.style.height = '100%';
    progressBar.style.width = '0%';
    progressBar.style.backgroundColor = resourceType === 'wood' ? '#8B4513' : '#808080';
    progressBar.style.transition = 'width 0.1s linear';

    const progressText = document.createElement('div');
    progressText.style.position = 'absolute';
    progressText.style.top = '0';
    progressText.style.left = '0';
    progressText.style.width = '100%';
    progressText.style.height = '100%';
    progressText.style.display = 'flex';
    progressText.style.alignItems = 'center';
    progressText.style.justifyContent = 'center';
    progressText.style.color = 'white';
    progressText.style.fontSize = '12px';
    progressText.style.fontWeight = 'bold';
    progressText.textContent = `Collecte de ${resourceType === 'wood' ? 'bois' : 'pierre'}...`;

    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(progressText);
    document.body.appendChild(progressContainer);

    // Animation de la collecte
    let progress = 0;
    const collectInterval = setInterval(() => {
      progress += 2;
      progressBar.style.width = `${progress}%`;

      // Collection terminée
      if (progress >= 100) {
        clearInterval(collectInterval);
        document.body.removeChild(progressContainer);

        // Ajouter la ressource à l'inventaire
        const quantity = Math.floor(Math.random() * 3) + 1;
        addItem({
          id: resourceType,
          name: resourceType === 'wood' ? 'Bois' : 'Pierre',
          type: 'resource',
          quantity
        });

        // Appeler le callback si fourni
        if (onResourceCollected) {
          onResourceCollected(resourceType);
        }

        // Feedback visuel amélioré avec animation d'apparition
        const feedbackText = document.createElement('div');
        feedbackText.className = 'resource-feedback';
        feedbackText.style.position = 'fixed';
        feedbackText.style.top = '50%';
        feedbackText.style.left = '50%';
        feedbackText.style.transform = 'translate(-50%, -50%)';
        feedbackText.style.color = '#ffffff';
        feedbackText.style.fontSize = '24px';
        feedbackText.style.fontWeight = 'bold';
        feedbackText.style.textShadow = '0 0 5px rgba(0,0,0,0.7)';
        feedbackText.style.padding = '10px';
        feedbackText.style.borderRadius = '5px';
        feedbackText.style.backgroundColor = 'rgba(0,0,0,0.5)';
        feedbackText.style.animation = 'feedbackPop 0.5s forwards';
        feedbackText.innerHTML = `<span style="color:${resourceType === 'wood' ? '#8B4513' : '#A9A9A9'}">+${quantity} ${resourceType === 'wood' ? 'Bois' : 'Pierre'}</span>`;

        // Ajouter l'animation au style global
        if (!document.getElementById('resource-feedback-style')) {
          const style = document.createElement('style');
          style.id = 'resource-feedback-style';
          style.textContent = `
            @keyframes feedbackPop {
              0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
              20% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
              100% { transform: translate(-50%, -70%) scale(1); opacity: 0; }
            }
          `;
          document.head.appendChild(style);
        }

        document.body.appendChild(feedbackText);

        setTimeout(() => {
          if (feedbackText.parentNode) {
            document.body.removeChild(feedbackText);
          }
        }, 1500);

        setAnimationState('idle');
      }
    }, 30);
  };

  // Fonction pour attaquer une cible
  const startAttackingTarget = (target: THREE.Object3D | undefined) => {
    if (!target) {
      setAnimationState('idle');
      return;
    }

    // Durée de l'attaque
    setTimeout(() => {
      // Rechercher l'ID de l'ennemi à partir de son nom ou attributs
      const enemyIdMatch = target.name?.match(/enemy-(\d+)/);
      const enemyId = enemyIdMatch ? parseInt(enemyIdMatch[1]) : undefined;

      if (enemyId !== undefined) {
        // Trouver l'ennemi correspondant et lui infliger des dégâts
        // Cette partie serait intégrée à votre système de combat existant
      }

      // Retour à l'état normal
      setAnimationState('idle');
    }, 1000); // Durée de l'animation d'attaque
  };

  // Fonctions pour les indicateurs d'objets à proximité
  const hideNearbyObjectIndicator = () => {
    const existingIndicator = document.getElementById('nearby-object-indicator');
    if (existingIndicator && existingIndicator.parentNode) {
      existingIndicator.parentNode.removeChild(existingIndicator);
    }
  };

  const showNearbyObjectIndicator = (nearbyObject: { type: string; object: THREE.Object3D; distance: number }) => {
    // Supprimer l'ancien indicateur s'il existe
    hideNearbyObjectIndicator();

    // Créer un nouvel indicateur
    const indicator = document.createElement('div');
    indicator.id = 'nearby-object-indicator';
    indicator.style.position = 'fixed';
    indicator.style.bottom = '10%';
    indicator.style.right = '20px';
    indicator.style.backgroundColor = 'rgba(0,0,0,0.7)';
    indicator.style.color = 'white';
    indicator.style.padding = '10px';
    indicator.style.borderRadius = '5px';
    indicator.style.fontSize = '14px';
    indicator.style.fontWeight = 'bold';
    indicator.style.zIndex = '1000';

    let iconColor;
    let actionText;

    switch(nearbyObject.type) {
      case 'wood':
        iconColor = '#8B4513';
        actionText = 'Couper l\'arbre';
        break;
      case 'stone':
        iconColor = '#A9A9A9';
        actionText = 'Miner la pierre';
        break;
      case 'enemy':
        iconColor = '#FF0000';
        actionText = 'Attaquer l\'ennemi';
        break;
      default:
        iconColor = '#FFFFFF';
        actionText = 'Interagir';
    }

    indicator.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 12px; height: 12px; background-color: ${iconColor}; border-radius: 50%;"></div>
        <span>${actionText}</span>
      </div>
    `;

    // Ajouter l'indicateur au document
    document.body.appendChild(indicator);
  };

    // Géométries et matériaux mémorisés
    const playerGeometry = useRef({
    body: new THREE.CapsuleGeometry(0.5, 1, 16), // Moins de segments
    indicator: new THREE.BoxGeometry(0.3, 0.1, 0.1),
    shadow: new THREE.CircleGeometry(0.5, 16) // Moins de segments
  });

  const playerMaterial = useRef({
    body: new THREE.MeshStandardMaterial({ color: "#3b82f6" }),
    face: new THREE.MeshStandardMaterial({ color: "#000000" }),
    shadow: new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.3 })
  });

  return (
    <group ref={playerRef} position={[0, 0, 0]} name="player">
      {/* Corps du joueur */}
      <mesh castShadow geometry={playerGeometry.current.body} material={playerMaterial.current.body} />
      {/* Indicateur de direction */}
      <mesh position={[0, 0.5, 0.3]} geometry={playerGeometry.current.indicator} material={playerMaterial.current.face} />
      {/* Ombre du joueur */}
      <mesh position={[0, -0.99, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={playerGeometry.current.shadow} material={playerMaterial.current.shadow} />
    </group>
  );
}
