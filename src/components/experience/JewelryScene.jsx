import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  Float, 
  MeshDistortMaterial, 
  MeshWobbleMaterial, 
  OrbitControls, 
  PerspectiveCamera, 
  Environment,
  ContactShadows
} from '@react-three/drei';

const Necklace = () => {
  const mesh = useRef();

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y += 0.01;
      mesh.current.rotation.z += 0.005;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
      <mesh ref={mesh} scale={1.5}>
        <torusKnotGeometry args={[1, 0.3, 128, 16]} />
        <MeshDistortMaterial
          color="#8b5cf6"
          speed={2}
          distort={0.4}
          radius={1}
          metalness={0.8}
          roughness={0.2}
          emissive="#4c1d95"
          emissiveIntensity={0.5}
        />
      </mesh>
    </Float>
  );
};

const JewelryScene = () => {
  return (
    <div className="w-full h-[400px] sm:h-[500px] cursor-grab active:cursor-grabbing">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
        
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        <Necklace />
        
        <ContactShadows 
          position={[0, -2.5, 0]} 
          opacity={0.4} 
          scale={10} 
          blur={2.5} 
          far={4.5} 
        />
        
        <Environment preset="city" />
        
        <OrbitControls 
          enableZoom={false} 
          autoRotate 
          autoRotateSpeed={0.5}
          makeDefault 
        />
      </Canvas>
    </div>
  );
};

export default JewelryScene;
