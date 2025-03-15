import React, { useMemo } from 'react';
import * as THREE from 'three';

export function Island() {
  // Create desert sand material with stable texture
  const sandMaterial = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const context = canvas.getContext('2d');
    if (!context) return new THREE.MeshStandardMaterial({ color: '#e6ccb3' });

    // Create base sand color
    context.fillStyle = '#e6ccb3';
    context.fillRect(0, 0, 2048, 2048);

    // Create a stable noise pattern
    const noisePattern = new Array(100).fill(0).map(() => ({
      x: Math.random() * 2048,
      y: Math.random() * 2048,
      size: Math.random() * 3 + 1,
      color: Math.random() > 0.5 ? '#d4b796' : '#f0dcc3'
    }));

    // Apply stable noise pattern
    noisePattern.forEach(({ x, y, size, color }) => {
      context.fillStyle = color;
      context.fillRect(x, y, size, size);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(50, 50);

    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 1,
      metalness: 0,
    });
  }, []); // Empty dependency array ensures the material is created only once

  // Generate stable terrain geometry
  const terrainGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(3000, 3000, 250, 250);
    const vertices = geometry.attributes.position.array;
    const seed = 12345; // Fixed seed for consistent terrain

    // Deterministic pseudo-random function
    const seededRandom = (x: number, z: number) => {
      const dot = x * 12.9898 + z * 78.233;
      return Math.abs(Math.sin(dot * seed) * 43758.5453123) % 1;
    };
    
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const z = vertices[i + 2];
      
      // Create stable dunes and beach terrain
      const distance = Math.sqrt(x * x + z * z);
      const heightScale = Math.max(0, 1 - distance / 1500);
      
      const height = 
        Math.sin(x * 0.02 + seed) * Math.cos(z * 0.02 + seed) * 5 * heightScale + // Large dunes
        Math.sin(x * 0.1 + seed) * Math.cos(z * 0.1 + seed) * 2 * heightScale +   // Small dunes
        seededRandom(x, z) * heightScale -                                         // Stable random variation
        Math.max(0, (distance - 1000) * 0.01);                                     // Beach slope

      vertices[i + 1] = height;
    }

    geometry.computeVertexNormals();
    return geometry;
  }, []); // Empty dependency array ensures the geometry is created only once

  // Create palm trees with stable positions
  const palmTrees = useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => {
      const angle = (i / 100) * Math.PI * 2;
      const radius = 500 + (Math.sin(i * 123.456) * 300); // Stable random variation
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = 8 + (Math.sin(i * 789.123) * 4); // Stable random height
      const lean = (Math.sin(i * 456.789) * 0.2); // Stable random lean
      const leanAngle = (i / 100) * Math.PI * 2;

      return {
        position: [x, -5, z],
        rotation: [
          Math.cos(leanAngle) * lean,
          (i / 100) * Math.PI * 2,
          Math.sin(leanAngle) * lean
        ],
        height
      };
    });
  }, []); // Empty dependency array ensures palm trees are created only once

  // Create rocks with stable positions
  const rocks = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => {
      const angle = (i / 50) * Math.PI * 2;
      const radius = Math.sin(i * 234.567) * 1000;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scale = 1 + (Math.sin(i * 345.678) * 2);

      return {
        position: [x, -4, z],
        rotation: [i * 0.1, i * 0.2, i * 0.3],
        scale
      };
    });
  }, []); // Empty dependency array ensures rocks are created only once

  return (
    <group>
      {/* Main terrain */}
      <mesh 
        geometry={terrainGeometry}
        position={[0, -5, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        castShadow
        name="ground"
      >
        <primitive object={sandMaterial} attach="material" />
      </mesh>

      {/* Palm trees */}
      {palmTrees.map((palm, i) => (
        <group 
          key={`palm-${i}`} 
          position={palm.position as [number, number, number]}
          rotation={palm.rotation as [number, number, number]}
        >
          {/* Trunk */}
          <mesh castShadow>
            <cylinderGeometry args={[0.3, 0.5, palm.height, 8]} />
            <meshStandardMaterial color="#8b4513" roughness={0.9} />
          </mesh>
          {/* Palm fronds */}
          {Array.from({ length: 7 }).map((_, j) => (
            <group 
              key={`frond-${j}`} 
              position={[0, palm.height - 0.5, 0]} 
              rotation={[
                -Math.PI / 4 + (Math.sin(j * 789.123) * 0.5),
                (j / 7) * Math.PI * 2,
                0
              ]}
            >
              <mesh castShadow>
                <coneGeometry args={[2, 4, 1, 1]} />
                <meshStandardMaterial color="#2d5a27" roughness={0.8} />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* Rocks */}
      {rocks.map((rock, i) => (
        <mesh 
          key={`rock-${i}`} 
          position={rock.position as [number, number, number]}
          rotation={rock.rotation as [number, number, number]}
          scale={[rock.scale, rock.scale, rock.scale]}
          castShadow
        >
          <dodecahedronGeometry args={[2]} />
          <meshStandardMaterial color="#808080" roughness={0.8} />
        </mesh>
      ))}

      {/* Ocean */}
      <mesh 
        position={[0, -6, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[6000, 6000]} />
        <meshStandardMaterial 
          color="#0ea5e9" 
          transparent 
          opacity={0.8}
          metalness={0.2}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}