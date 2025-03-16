import React, { useMemo } from 'react';
import * as THREE from 'three';


export function Island() {
  // Optimisez la géométrie du terrain en réduisant sa résolution
  const terrainGeometry = useMemo(() => {
    // Réduire de 250x250 à 100x100
    const geometry = new THREE.PlaneGeometry(3000, 3000, 100, 100);
    const vertices = geometry.attributes.position.array;
    const seed = 12345;

    const seededRandom = (x: number, z: number) => {
      const dot = x * 12.9898 + z * 78.233;
      return Math.abs(Math.sin(dot * seed) * 43758.5453123) % 1;
    };

    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];

      const distance = Math.sqrt(x * x + z * z);
      const heightScale = Math.max(0, 1 - distance / 1500);

      const height =
        Math.sin(x * 0.02 + seed) * Math.cos(z * 0.02 + seed) * 5 * heightScale +
        Math.sin(x * 0.1 + seed) * Math.cos(z * 0.1 + seed) * 2 * heightScale +
        seededRandom(x, z) * heightScale -
        Math.max(0, (distance - 1000) * 0.01);

      vertices[i + 1] = height;
    }

    geometry.computeVertexNormals();
    return geometry;
  }, []);

  // Optimisez le matériau
  const sandMaterial = useMemo(() => {
    // Utilisez une texture plus simple ou préchargée
    return new THREE.MeshStandardMaterial({
      color: '#e6ccb3',
      roughness: 1,
      metalness: 0,
    });
  }, []);

  // Utilisez InstancedMesh pour les palmiers et rochers
  const palmInstances = useMemo(() => {
    // Créez des géométries simplifiées pour les palmiers
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 8, 6); // Moins de segments
    const frondGeometry = new THREE.ConeGeometry(2, 4, 4); // Géométrie simplifiée

    const palmPositions = Array.from({ length: 50 }).map((_, i) => { // Réduire à 50 palmiers
      const angle = (i / 50) * Math.PI * 2;
      const radius = 500 + (Math.sin(i * 123.456) * 300);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = 8 + (Math.sin(i * 789.123) * 4);

      return { position: [x, -5, z], height };
    });

    return { trunkGeometry, frondGeometry, palmPositions };
  }, []);

  // Utilisez des matériaux simples réutilisés
  const materials = useMemo(() => ({
    trunk: new THREE.MeshStandardMaterial({ color: "#8b4513", roughness: 0.9 }),
    frond: new THREE.MeshStandardMaterial({ color: "#2d5a27", roughness: 0.8 }),
    rock: new THREE.MeshStandardMaterial({ color: "#808080", roughness: 0.8 }),
    water: new THREE.MeshStandardMaterial({
      color: "#0ea5e9",
      transparent: true,
      opacity: 0.8,
      metalness: 0.2,
      roughness: 0.1
    })
  }), []);

  // Simplifiez les rochers avec InstancedMesh
  const rockInstances = useMemo(() => {
    const rockGeometry = new THREE.DodecahedronGeometry(2, 0); // Réduire la complexité
    const rockCount = 25; // Réduire le nombre de rochers

    const rockMesh = new THREE.InstancedMesh(rockGeometry, materials.rock, rockCount);
    rockMesh.castShadow = true;

    const matrix = new THREE.Matrix4();

    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2;
      const radius = Math.sin(i * 234.567) * 1000;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scale = 1 + (Math.sin(i * 345.678) * 2);

      matrix.makeScale(scale, scale, scale);
      matrix.setPosition(x, -4, z);
      rockMesh.setMatrixAt(i, matrix);
    }

    rockMesh.instanceMatrix.needsUpdate = true;
    return rockMesh;
  }, [materials]);

  // Ajouter des zones de végétation
  const grassPatches = useMemo(() => {
    const patches = [];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 100 + Math.random() * 400;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scale = 3 + Math.random() * 10;
      patches.push({ position: [x, -4.5, z], scale });
    }
    return patches;
  }, []);

  // Ajouter quelques fleurs colorées
  const flowers = useMemo(() => {
    const flowerPositions = [];
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 50 + Math.random() * 450;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const color = [
        '#FF5733', // Orange
        '#DAF7A6', // Light green
        '#FFC300', // Yellow
        '#C70039', // Red
        '#900C3F', // Burgundy
        '#581845'  // Purple
      ][Math.floor(Math.random() * 6)];
      flowerPositions.push({ position: [x, -4.5, z], color });
    }
    return flowerPositions;
  }, []);

  // Ajoutez des campements abandonnés
  const campSites = useMemo(() => {
    return [
      { position: [120, -4.5, 150], rotation: Math.random() * Math.PI },
      { position: [-200, -4.5, 80], rotation: Math.random() * Math.PI },
      { position: [80, -4.5, -250], rotation: Math.random() * Math.PI }
    ];
  }, []);

  return (
    <group>
      {/* Terrain principal */}
      <mesh
        geometry={terrainGeometry}
        position={[0, -5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        name="ground"
      >
        <primitive object={sandMaterial} attach="material" />
      </mesh>

      {/* Palmiers optimisés */}
      {palmInstances.palmPositions.slice(0, 50).map((palm, i) => (
        <group
          key={`palm-${i}`}
          position={palm.position as [number, number, number]}
        >
          <mesh castShadow geometry={palmInstances.trunkGeometry} material={materials.trunk} />
          <mesh
            position={[0, palm.height - 0.5, 0]}
            castShadow
            geometry={palmInstances.frondGeometry}
            material={materials.frond}
          />
        </group>
      ))}

      {/* Rochers optimisés avec InstancedMesh */}
      <primitive object={rockInstances} />

      {/* Océan */}
      <mesh
        position={[0, -6, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[6000, 6000, 1, 1]} /> {/* Réduire la complexité */}
        <primitive object={materials.water} attach="material" />
      </mesh>

      {/* Zones d'herbe */}
      {grassPatches.map((patch, index) => (
        <mesh
          key={`grass-${index}`}
          position={patch.position as [number, number, number]}
          rotation={[-Math.PI / 2, 0, Math.random() * Math.PI]}
        >
          <planeGeometry args={[patch.scale, patch.scale, 1, 1]} />
          <meshStandardMaterial color="#4a7c59" opacity={0.9} transparent />
        </mesh>
      ))}

      {/* Fleurs colorées */}
      {flowers.map((flower, index) => (
        <mesh
          key={`flower-${index}`}
          position={flower.position as [number, number, number]}
        >
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshStandardMaterial color={flower.color} />
        </mesh>
      ))}

      {/* Sites de campement */}
      {campSites.map((camp, index) => (
        <group
          key={`camp-${index}`}
          position={camp.position as [number, number, number]}
          rotation={[0, camp.rotation, 0]}
        >
          {/* Cercle de pierres */}
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i / 6) * Math.PI * 2;
            return (
              <mesh
                key={`camp-stone-${i}`}
                position={[Math.cos(angle) * 3, 0, Math.sin(angle) * 3]}
              >
                <sphereGeometry args={[0.8, 6, 6]} />
                <meshStandardMaterial color="#808080" />
              </mesh>
            );
          })}

          {/* Feu de camp */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[1.2, 1.5, 0.5, 8]} />
            <meshStandardMaterial color="#3d2817" />
          </mesh>

          {/* Troncs comme sièges */}
          <mesh position={[2, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 3, 8]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>

          <mesh position={[-2, 0, 1]} rotation={[Math.PI/2, 0, Math.PI/3]}>
            <cylinderGeometry args={[0.5, 0.5, 2.5, 8]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
