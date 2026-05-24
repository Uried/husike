import React, { useEffect, useRef, useState, useCallback, Suspense, useMemo, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { useGLTF, PerspectiveCamera, Text } from '@react-three/drei';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import './AtmosJourney.css';

extend({ EffectComposer, RenderPass, ShaderPass });

// ═══════════════════════════════════════════════════════════════════════════════
// PALETTES & FACTS (from original atmos.leeroy.ca)
// ═══════════════════════════════════════════════════════════════════════════════
const PALETTES = [
  [[0.980, 0.760, 0.580], [0.650, 0.550, 0.920], [0.180, 0.140, 0.600]], // dawn - warm orange to deep blue
  [[0.990, 0.850, 0.550], [0.550, 0.620, 0.980], [0.120, 0.100, 0.550]], // golden - bright yellow to royal blue  
  [[0.700, 0.820, 0.990], [0.380, 0.480, 0.950], [0.080, 0.080, 0.450]], // noon - white-blue to deep navy
  [[0.990, 0.680, 0.600], [0.520, 0.450, 0.900], [0.100, 0.080, 0.400]], // rose dusk - pink to purple
  [[0.750, 0.600, 0.800], [0.350, 0.300, 0.750], [0.050, 0.050, 0.300]], // twilight - purple to deep night
];

const FACTS = [
  { n: '01', l: 'Altitude',   b: 'Commercial planes cruise\nat 35,000 ft — higher than\nMount Everest by over 5 miles.' },
  { n: '02', l: 'Speed',      b: 'A Boeing 747 travels at\n900 km/h — nearly the speed\nof sound.' },
  { n: '03', l: 'Lightning',  b: 'Every commercial aircraft\nis struck by lightning at least\nonce a year — safely.' },
  { n: '04', l: 'Oxygen',     b: 'Oxygen masks give you only\n15 minutes of air — just enough\nto descend to breathable altitude.' },
  { n: '05', l: 'Tires',      b: 'Aircraft tires are inflated\nto 200 psi — six times the\npressure of a car tire.' },
  { n: '06', l: 'Autopilot',  b: 'Modern flights are on autopilot\nfor 90% of the time. Pilots\nfly ~7 minutes per flight.' },
  { n: '07', l: 'Fuel',       b: 'A long-haul 747 burns\nroughly 4 litres of fuel\nper second.' },
  { n: '08', l: 'Birds',      b: 'Bird strikes cost the aviation\nindustry over $1.2 billion\nper year worldwide.' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// GRAIN & VIGNETTE SHADERS (post-processing)
// ═══════════════════════════════════════════════════════════════════════════════
const GrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uStrength: { value: 0.028 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime, uStrength;
    varying vec2 vUv;
    float hash(vec2 p, float t) { return fract(sin(dot(p + t, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float g = hash(vUv * vec2(1920.0, 1080.0), uTime) * 2.0 - 1.0;
      gl_FragColor = vec4(c.rgb + g * uStrength, c.a);
    }
  `
};

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uD: { value: 0.50 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uD;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float d = length(vUv * 2.0 - 1.0);
      gl_FragColor = vec4(c.rgb * (1.0 - d * d * uD), c.a);
    }
  `
};

// ═══════════════════════════════════════════════════════════════════════════════
// GLIDER COMPONENT - follows flight curve like original
// ═══════════════════════════════════════════════════════════════════════════════
const Glider = React.forwardRef(function Glider({ curve, scrollProgress }, ref) {
  const { scene } = useGLTF('/src/assets/planeur.glb');
  const localRef = useRef();
  const pC = useMemo(() => new THREE.Vector3(), []);
  const pB = useMemo(() => new THREE.Vector3(), []);
  
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.castShadow = true;
        child.material.roughness = 0.28;
        child.material.metalness = 0.55;
      }
    });
  }, [scene]);
  
  useImperativeHandle(ref, () => localRef.current);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const sp = Math.min(scrollProgress, 0.9999);
    
    // Position on curve (slightly ahead of camera) - just above tube at Y=-0.5
    curve.getPointAt(Math.min(sp + 0.006, 0.9999), pC);
    pC.y = -0.25; // Just above the tube (tube is at -0.5)
    
    // Look ahead point - same height
    curve.getPointAt(Math.min(sp + 0.013, 0.9999), pB);
    pB.y = -0.25; // Same fixed height
    
    if (localRef.current) {
      localRef.current.position.copy(pC);
      localRef.current.lookAt(pB);
      localRef.current.rotateZ(Math.sin(t * 0.36) * 0.22);
      localRef.current.rotateX(Math.sin(t * 0.26) * 0.04);
    }
  });

  return (
    <primitive 
      ref={localRef}
      object={scene} 
      rotation={[0, Math.PI, 0]}
      scale={0.28}
    />
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// SKY COMPONENT (animated gradient sphere)
// ═══════════════════════════════════════════════════════════════════════════════
function Sky({ paletteIndex, paletteBlend }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const { camera } = useThree();
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBot: { value: new THREE.Color(...PALETTES[0][0]) },
    uMid: { value: new THREE.Color(...PALETTES[0][1]) },
    uTop: { value: new THREE.Color(...PALETTES[0][2]) },
    uBot2: { value: new THREE.Color(...PALETTES[1][0]) },
    uMid2: { value: new THREE.Color(...PALETTES[1][1]) },
    uTop2: { value: new THREE.Color(...PALETTES[1][2]) },
    uBlend: { value: 0 },
  }), []);
  
  useEffect(() => {
    if (materialRef.current) {
      const c = PALETTES[paletteIndex];
      const n = PALETTES[Math.min(paletteIndex + 1, PALETTES.length - 1)];
      materialRef.current.uniforms.uBot.value.setRGB(...c[0]);
      materialRef.current.uniforms.uMid.value.setRGB(...c[1]);
      materialRef.current.uniforms.uTop.value.setRGB(...c[2]);
      materialRef.current.uniforms.uBot2.value.setRGB(...n[0]);
      materialRef.current.uniforms.uMid2.value.setRGB(...n[1]);
      materialRef.current.uniforms.uTop2.value.setRGB(...n[2]);
      materialRef.current.uniforms.uBlend.value = paletteBlend;
    }
  }, [paletteIndex, paletteBlend]);
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
    if (meshRef.current) {
      meshRef.current.position.copy(camera.position);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[280, 40, 20]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vPos;
          void main() {
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime, uBlend;
          uniform vec3 uBot, uMid, uTop, uBot2, uMid2, uTop2;
          varying vec3 vPos;
          
          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          
          float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p) * fract(p) * (3.0 - 2.0 * fract(p));
            return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
                       mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
          }
          
          vec3 grad(vec3 b, vec3 m, vec3 t, float v) {
            return v < 0.5 ? mix(b, m, v * 2.0) : mix(m, t, (v - 0.5) * 2.0);
          }
          
          void main() {
            float t = clamp((vPos.y + 280.0) / 560.0, 0.0, 1.0);
            float n = noise(vec2(vPos.x * 0.004 + uTime * 0.032, vPos.z * 0.004 + uTime * 0.024)) * 0.09;
            float tt = clamp(t + n, 0.0, 1.0);
            vec3 c1 = grad(uBot, uMid, uTop, tt);
            vec3 c2 = grad(uBot2, uMid2, uTop2, tt);
            gl_FragColor = vec4(mix(c1, c2, uBlend), 1.0);
          }
        `}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WIND PARTICLES
// ═══════════════════════════════════════════════════════════════════════════════
function WindParticles({ scrollVelocity }) {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const WIND_N = 700;
  
  const windPts = useMemo(() => {
    return Array.from({ length: WIND_N }, () => ({
      ox: (Math.random() - 0.5) * 20,
      oy: (Math.random() - 0.5) * 12,
      oz: (Math.random() - 0.5) * 14,
      z: 0,
      spd: 0.07 + Math.random() * 0.15,
    }));
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;
    
    windPts.forEach((pt, i) => {
      pt.z += pt.spd;
      if (pt.z > 14) pt.z = -14;
      
      const opacity = Math.min(1, scrollVelocity * 3) * (1 - Math.abs(pt.z) / 14);
      
      dummy.position.set(pt.ox, pt.oy, pt.z + pt.oz);
      dummy.rotation.z = Math.PI / 2;
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, WIND_N]} frustumCulled={false}>
      <planeGeometry args={[0.035, 0.48]} />
      <meshBasicMaterial color={0xffffff} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUIDE TUBE (visible path) - flat path below glider
// ═══════════════════════════════════════════════════════════════════════════════
function GuideTube({ curve, scrollProgress }) {
  const materialRef = useRef();
  const meshRef = useRef();
  
  // Create flat version of curve (Y=0 for all points)
  const flatCurve = useMemo(() => {
    const pts = [];
    const N = 100;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const pt = curve.getPointAt(t);
      pts.push(new THREE.Vector3(pt.x, 0, pt.z)); // Flat Y=0
    }
    return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  }, [curve]);
  
  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(flatCurve, 300, 0.022, 6, false);
  }, [flatCurve]);
  
  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.opacity = Math.max(0, 0.25 - scrollProgress * 0.2);
    }
    // Keep tube below glider at fixed Y
    if (meshRef.current) {
      meshRef.current.position.y = -0.5;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial 
        ref={materialRef}
        color={0xffffff} 
        transparent 
        opacity={0.25} 
        depthWrite={false} 
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EASTER EGG ELEPHANT
// ═══════════════════════════════════════════════════════════════════════════════
function EasterEgg({ curve, scrollProgress, onFound }) {
  const groupRef = useRef();
  const EGG_SPOTS = [0.18, 0.33, 0.51, 0.67, 0.82];
  const eggT = useMemo(() => EGG_SPOTS[Math.floor(Math.random() * EGG_SPOTS.length)], []);
  const eggPt = useMemo(() => curve.getPointAt(eggT), [curve, eggT]);
  
  const eGrey = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.65, metalness: 0.04 }), []);
  const eyeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x1a1a2e }), []);
  
  useFrame(() => {
    if (groupRef.current && Math.abs(scrollProgress - eggT) < 0.03) {
      onFound?.();
    }
  });

  return (
    <group ref={groupRef} position={[eggPt.x + 4.5, eggPt.y - 1.5, eggPt.z]} scale={0.88} rotation={[0, Math.PI * 0.65, 0]}>
      {/* Body */}
      <mesh scale={[1, 0.78, 1.1]}>
        <sphereGeometry args={[0.55, 16, 12]} />
        <primitive object={eGrey} attach="material" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.24, 0.60]}>
        <sphereGeometry args={[0.34, 16, 12]} />
        <primitive object={eGrey} attach="material" />
      </mesh>
      {/* Trunk segments */}
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} position={[0, 0.24 - 0.21 * k, 0.87]} rotation={[0.28 + k * 0.17, 0, 0]}>
          <cylinderGeometry args={[0.07 - 0.01 * k, 0.08 - 0.01 * k, 0.21, 8]} />
          <primitive object={eGrey} attach="material" />
        </mesh>
      ))}
      {/* Ears */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.40, 0.29, 0.54]} scale={[0.24, 1, 0.78]}>
          <sphereGeometry args={[0.27, 12, 10]} />
          <primitive object={eGrey} attach="material" />
        </mesh>
      ))}
      {/* Legs */}
      {[[-0.27, 0, 0.18], [0.27, 0, 0.18], [-0.24, 0, -0.24], [0.24, 0, -0.24]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y - 0.55, z]}>
          <cylinderGeometry args={[0.09, 0.10, 0.36, 8]} />
          <primitive object={eGrey} attach="material" />
        </mesh>
      ))}
      {/* Eyes */}
      {[-0.11, 0.13].map((s, i) => (
        <mesh key={i} position={[s, 0.35, 0.90]}>
          <sphereGeometry args={[0.043, 8, 8]} />
          <primitive object={eyeMat} attach="material" />
        </mesh>
      ))}
      {/* Tail */}
      <mesh position={[0, 0, -0.68]} rotation={[-0.5, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.04, 0.28, 6]} />
        <primitive object={eGrey} attach="material" />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLOUD COMPONENT - matching Leeroy's exact material
// ═══════════════════════════════════════════════════════════════════════════════
function Cloud({ modelPath, position, scale = 1, cloudMaterial }) {
  const { scene } = useGLTF(modelPath);
  
  // Clone the scene for this cloud instance
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  
  // Default cloud material - matte like original (not glossy)
  const defaultMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.695, 0.718, 0.968),
      roughness: 0.9,  // High roughness = matte
      metalness: 0.0,
    });
  }, []);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.material = cloudMaterial || defaultMaterial;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clonedScene, cloudMaterial, defaultMaterial]);

  return (
    <primitive 
      object={clonedScene} 
      position={position}
      scale={scale}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3D FACTS COMPONENT - positioned along flight curve
// ═══════════════════════════════════════════════════════════════════════════════
function Facts3D({ curve, scrollProgress }) {
  const groupRef = useRef();
  const pA = useMemo(() => new THREE.Vector3(), []);
  const pB = useMemo(() => new THREE.Vector3(), []);
  const { camera } = useThree();
  
  // Use default Inter font from drei which is preloaded
  const fontUrl = undefined; // Uses default Inter font
  
  useFrame(() => {
    if (!groupRef.current || !camera) return;
    
    FACTS.forEach((fact, i) => {
      const t = (i + 1) / (FACTS.length + 1);
      const mesh = groupRef.current.children[i];
      if (!mesh) return;
      
      // Position on curve
      curve.getPointAt(t, pA);
      curve.getPointAt(Math.min(t + 0.01, 0.999), pB);
      
      // Side offset - further from center for better visibility
      const side = i % 2 === 0 ? 1 : -1;
      const lateralOffset = side * (1.5 + (i % 3) * 0.2); // Increased from 0.8 to 1.5
      
      // Calculate position with lateral offset
      const tangent = pB.clone().sub(pA).normalize();
      const normal = new THREE.Vector3(0, 1, 0);
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      
      mesh.position.copy(pA).add(binormal.multiplyScalar(lateralOffset));
      mesh.position.y += 0.1; // Slightly above glider path
      
      // Face the camera (billboard effect)
      mesh.lookAt(camera.position);
      
      // Visibility based on scroll
      const dist = Math.abs(scrollProgress - t);
      const opacity = Math.max(0, 1 - dist * 12);
      mesh.children.forEach(child => {
        if (child.material) child.material.opacity = opacity;
      });
    });
  });
  
  return (
    <group ref={groupRef}>
      {FACTS.map((fact, i) => (
        <group key={fact.n}>
          {/* Fact number and label */}
          <Text
            font={fontUrl}
            fontSize={0.08}
            color="#ffffff"
            anchorX="left"
            anchorY="bottom"
            position={[-0.3, 0.15, 0]}
            letterSpacing={0.1}
            opacity={0.7}
          >
            {fact.n} — {fact.l}
          </Text>
          {/* Fact body text */}
          <Text
            font={fontUrl}
            fontSize={0.12}
            color="#ffffff"
            anchorX="left"
            anchorY="top"
            position={[-0.3, 0.05, 0]}
            maxWidth={2.5}
            lineHeight={1.3}
            letterSpacing={0.02}
          >
            {fact.b.replace(/\n/g, ' ')}
          </Text>
        </group>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST PROCESSING COMPONENT (using drei/EffectComposer would be better, using manual for now)
// ═══════════════════════════════════════════════════════════════════════════════
function PostProcessing({ scrollProgress }) {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef();
  const grainPassRef = useRef();
  
  useEffect(() => {
    if (!gl || !scene || !camera) return;
    
    const composer = new EffectComposer(gl);
    composer.setSize(size.width, size.height);
    
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    const grainPass = new ShaderPass(GrainShader);
    grainPass.uniforms.uTime.value = 0;
    composer.addPass(grainPass);
    grainPassRef.current = grainPass;
    
    const vigPass = new ShaderPass(VignetteShader);
    composer.addPass(vigPass);
    
    composerRef.current = composer;
    
    return () => {
      composer.dispose();
    };
  }, [gl, scene, camera, size]);
  
  useFrame((state) => {
    if (grainPassRef.current) {
      grainPassRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
    if (composerRef.current) {
      composerRef.current.render();
    }
  }, 1);
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE - complete implementation matching original
// ═══════════════════════════════════════════════════════════════════════════════
function Scene({ scrollProgress, curve, onEggFound }) {
  const { camera, scene } = useThree();
  const gliderRef = useRef();
  const hemiRef = useRef();
  const [scrollVel, setScrollVel] = useState(0);
  
  // Calculate palette based on scroll
  const paletteIndex = Math.min(Math.floor(scrollProgress * (PALETTES.length - 1)), PALETTES.length - 2);
  const paletteBlend = (scrollProgress * (PALETTES.length - 1)) - paletteIndex;
  
  // Setup lighting and fog
  useEffect(() => {
    scene.fog = new THREE.FogExp2(0x8899dd, 0.005);
    renderer?.setClearColor(0x8899dd);
  }, [scene]);
  
  const { gl: renderer } = useThree();
  
  // Update lighting colors based on palette
  useEffect(() => {
    if (hemiRef.current) {
      const c = PALETTES[paletteIndex];
      const n = PALETTES[Math.min(paletteIndex + 1, PALETTES.length - 1)];
      const lr = (a, b, t) => a + (b - a) * t;
      hemiRef.current.color.setRGB(lr(c[1][0], n[1][0], paletteBlend), lr(c[1][1], n[1][1], paletteBlend), lr(c[1][2], n[1][2], paletteBlend));
      hemiRef.current.groundColor.setRGB(lr(c[0][0], n[0][0], paletteBlend), lr(c[0][1], n[0][1], paletteBlend), lr(c[0][2], n[0][2], paletteBlend));
    }
    if (scene.fog) {
      const c = PALETTES[paletteIndex];
      const n = PALETTES[Math.min(paletteIndex + 1, PALETTES.length - 1)];
      const lr = (a, b, t) => a + (b - a) * t;
      scene.fog.color.setRGB(lr(c[1][0], n[1][0], paletteBlend) * 0.85, lr(c[1][1], n[1][1], paletteBlend) * 0.85, lr(c[1][2], n[1][2], paletteBlend) * 0.95);
      renderer?.setClearColor(scene.fog.color);
    }
  }, [paletteIndex, paletteBlend, scene, renderer]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const sp = Math.min(scrollProgress, 0.9999);
    
    // Camera further back from glider
    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const camOffset = Math.max(0, sp - 0.01); // Camera behind glider
    curve.getPointAt(camOffset, pA);
    curve.getPointAt(Math.min(camOffset + 0.013, 0.9999), pB);
    
    // Camera above glider to see top view
    pA.y = -0.05;  // Camera slightly above glider
    pB.y = -0.25;  // Look at glider height
    
    camera.position.copy(pA);
    camera.lookAt(pB);
    
    // Glider position ahead of camera - minimal bobbing
    if (gliderRef.current) {
      const pC = new THREE.Vector3();
      const gliderOffset = Math.min(sp, 0.9999); // Further ahead
      curve.getPointAt(gliderOffset, pC);
      pC.y = -0.25; // Fixed height
      gliderRef.current.position.copy(pC);
      gliderRef.current.lookAt(pB);
      gliderRef.current.rotateZ(Math.sin(t * 0.36) * 0.22);
      gliderRef.current.rotateX(Math.sin(t * 0.26) * 0.04);
    }
  });

  return (
    <>
      {/* Sky */}
      <Sky paletteIndex={paletteIndex} paletteBlend={paletteBlend} />
      
      {/* Lighting */}
      <hemisphereLight ref={hemiRef} skyColor={0xd0ccff} groundColor={0xffc8a0} intensity={1.5} />
      <directionalLight color={0xffffff} intensity={2.5} position={[10, 14, 6]} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight color={0xffddcc} intensity={0.75} position={[-8, -4, 8]} />
      <directionalLight color={0xaabbff} intensity={0.85} position={[0, 8, -14]} />
      
      {/* Guide Tube */}
      <GuideTube curve={curve} scrollProgress={scrollProgress} />
      
      {/* Wind Particles */}
      <WindParticles scrollVelocity={scrollVel} />
      
      {/* Glider */}
      <Glider ref={gliderRef} curve={curve} scrollProgress={scrollProgress} />
      
      {/* Easter Egg Elephant */}
      <EasterEgg curve={curve} scrollProgress={scrollProgress} onFound={onEggFound} />
      
      {/* Post Processing - original doesn't use complex post-processing */}
      {/* <PostProcessing scrollProgress={scrollProgress} /> */}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const AtmosJourney = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [started, setStarted] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [eggFound, setEggFound] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorBig, setCursorBig] = useState(false);
  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const cloudMatRef = useRef(null);
  
  // Generate flight curve - flat path with turns only, no mountains
  const flightCurve = useMemo(() => {
    const pts = [];
    const N = 28;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      pts.push(new THREE.Vector3(
        Math.sin(t * Math.PI * 3.0) * 8 + (Math.random() - 0.5) * 3,  // X: turns/sinuosity
        (Math.random() - 0.5) * 1.5,  // Y: almost flat, just small variations
        -t * 165  // Z: forward movement
      ));
    }
    return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  }, []);

  // Scroll handling with inertia - slower base, even slower near facts
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    let targetProg = 0;
    let currentProg = 0;
    const BASE_SK = 0.00018; // Reduced from 0.00036
    let rafId;
    
    // Calculate distance to nearest fact for slowdown
    const getNearestFactDistance = (prog) => {
      let minDist = 1;
      for (let i = 0; i < FACTS.length; i++) {
        const factT = (i + 1) / (FACTS.length + 1);
        const dist = Math.abs(prog - factT);
        if (dist < minDist) minDist = dist;
      }
      return minDist;
    };
    
    const handleWheel = (e) => {
      if (showEnd) return;
      
      // Slow down more when near facts (within 0.08 range)
      const factDist = getNearestFactDistance(currentProg);
      const slowdownFactor = factDist < 0.08 ? 0.3 : 1.0; // 70% slower near facts
      
      targetProg = Math.max(0, Math.min(1, targetProg + e.deltaY * BASE_SK * slowdownFactor));
    };
    
    const animate = () => {
      currentProg += (targetProg - currentProg) * 0.04; // Slower lerp too
      setScrollProgress(currentProg);
      setShowEnd(currentProg > 0.95);
      rafId = requestAnimationFrame(animate);
    };
    
    window.addEventListener('wheel', handleWheel, { passive: true });
    rafId = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
      cancelAnimationFrame(rafId);
    };
  }, [showEnd]);

  // Audio init
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const mgain = actx.createGain();
    mgain.gain.value = 0;
    mgain.connect(actx.destination);
    
    // Pad tones
    [261.6, 329.6, 392.0, 523.2, 659.3, 783.9].forEach((f, i) => {
      const o = actx.createOscillator();
      const g = actx.createGain();
      const flt = actx.createBiquadFilter();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 8;
      flt.type = 'lowpass';
      flt.frequency.value = 900;
      g.gain.value = 0.065;
      o.connect(flt);
      flt.connect(g);
      g.connect(mgain);
      o.start();
    });
    
    audioCtxRef.current = actx;
    gainNodeRef.current = mgain;
  }, []);

  const toggleSound = useCallback(() => {
    initAudio();
    const newState = !soundOn;
    setSoundOn(newState);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
      gainNodeRef.current.gain.linearRampToValueAtTime(newState ? 0.2 : 0, audioCtxRef.current.currentTime + 1.4);
    }
  }, [soundOn, initAudio]);

  const handleStart = useCallback(() => {
    if (started) return;
    setStarted(true);
    gsap.to('.atmos-intro', {
      opacity: 0,
      duration: 1.8,
      ease: 'power2.inOut',
      onComplete: () => {
        const intro = document.querySelector('.atmos-intro');
        if (intro) intro.style.display = 'none';
      }
    });
  }, [started]);

  // Update palette based on scroll
  const paletteIndex = Math.min(Math.floor(scrollProgress * (PALETTES.length - 1)), PALETTES.length - 2);
  const paletteBlend = (scrollProgress * (PALETTES.length - 1)) - paletteIndex;
  
  // Fixed cloud positions - distant from flight path, glider never intersects
  const cloudPositions = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => {
      const t = i / 16;
      const side = i % 2 === 0 ? 1 : -1;
      const pt = flightCurve.getPointAt(t);
      return {
        t,
        side,
        pt,
        modelPath: Math.random() > 0.5 ? '/src/assets/cloud_11.glb' : '/src/assets/cloud_22.glb',
        offsetX: side * (6 + Math.random() * 12) + (Math.random() - 0.5) * 3,
        offsetY: side * (2 + Math.random() * 4) + (Math.random() - 0.5) * 2,
        offsetZ: (Math.random() - 0.5) * 6,
        scale: 1.2 + Math.random() * 1.8,
      };
    });
  }, [flightCurve]);
  
  // Close flyby clouds - further from glider, just for visual depth
  const closeCloudPositions = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => {
      const t = 0.1 + i * 0.15;
      const pt = flightCurve.getPointAt(t);
      const side = i % 2 === 0 ? 1 : -1;
      return {
        t,
        pt,
        modelPath: Math.random() > 0.5 ? '/src/assets/cloud_11.glb' : '/src/assets/cloud_22.glb',
        offsetX: side * (3.5 + Math.random() * 2),
        offsetY: side * (1.5 + Math.random() * 2),
        offsetZ: (Math.random() - 0.5) * 3,
        scale: 0.7 + Math.random() * 0.6,
      };
    });
  }, [flightCurve]);
  
  // Cloud material for tinting based on sky - matte like original
  cloudMatRef.current = useMemo(() => {
    const c = PALETTES[paletteIndex];
    const n = PALETTES[Math.min(paletteIndex + 1, PALETTES.length - 1)];
    const lr = (a, b, t) => a + (b - a) * t;
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(lr(c[1][0] * 0.95, n[1][0] * 0.95, paletteBlend), lr(c[1][1] * 0.97, n[1][1] * 0.97, paletteBlend), lr(c[1][2], n[1][2], paletteBlend)),
      roughness: 0.9,  // Matte, not glossy
      metalness: 0,
    });
  }, [paletteIndex, paletteBlend]);
  
  // Mouse tracking for custom cursor
  useEffect(() => {
    const handleMouseMove = (e) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="atmos-container"
      style={{ background: `#7B7FCC` }}
    >
      {/* Custom cursor */}
      <div 
        className={`atmos-cursor ${cursorBig ? 'big' : ''}`}
        style={{ left: cursorPos.x, top: cursorPos.y }}
      />

      {/* Intro overlay */}
      {!started && (
        <div 
          className="atmos-intro" 
          onClick={handleStart}
          onWheel={(e) => {
            handleStart();
          }}
        >
          <h1 className="atmos-title">ATMOS</h1>
          <p className="atmos-subtitle">Scroll to begin the journey</p>
        </div>
      )}

      {/* Header */}
      <div className="atmos-header">
        <div className="atmos-logo">ATMOS</div>
        <div className="atmos-tagline">Get on board & discover<br/>surreal aviation facts</div>
      </div>

      {/* Sound toggle */}
      <button 
        className="atmos-sound" 
        onClick={toggleSound} 
        title="Toggle sound"
        onMouseEnter={() => setCursorBig(true)}
        onMouseLeave={() => setCursorBig(false)}
      >
        <svg viewBox="0 0 24 24" style={{ opacity: soundOn ? 1 : 0.4 }}>
          <path d="M11 5 6 9H2v6h4l5 4V5z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={soundOn ? 1 : 0.25}/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={soundOn ? 1 : 0.25}/>
        </svg>
      </button>

      {/* Progress bar */}
      <div className="atmos-progress-wrap">
        <div className="atmos-progress" style={{ width: `${scrollProgress * 100}%` }} />
      </div>

      {/* 3D Canvas */}
      <div className="atmos-canvas-container">
        <Canvas
          dpr={[1, 2]}
          gl={{ 
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
          }}
        >
          <PerspectiveCamera makeDefault fov={55} near={0.1} far={600} />
          <Suspense fallback={null}>
            <Scene 
              scrollProgress={scrollProgress} 
              curve={flightCurve} 
              onEggFound={() => setEggFound(true)}
            />
            
            {/* 3D Facts positioned along flight curve */}
            <Facts3D curve={flightCurve} scrollProgress={scrollProgress} />
            
            {/* Clouds scattered along curve - using fixed positions */}
            {cloudPositions.map((cloud, i) => (
              <Cloud
                key={`cloud-${i}`}
                modelPath={cloud.modelPath}
                position={[
                  cloud.pt.x + cloud.offsetX,
                  cloud.pt.y + cloud.offsetY,
                  cloud.pt.z + cloud.offsetZ
                ]}
                scale={cloud.scale}
                cloudMaterial={cloudMatRef.current}
              />
            ))}
            
            {/* Close flyby clouds - near the glider path */}
            {closeCloudPositions.map((cloud, i) => (
              <Cloud
                key={`close-cloud-${i}`}
                modelPath={cloud.modelPath}
                position={[
                  cloud.pt.x + cloud.offsetX,
                  cloud.pt.y + cloud.offsetY,
                  cloud.pt.z + cloud.offsetZ
                ]}
                scale={cloud.scale}
                cloudMaterial={cloudMatRef.current}
              />
            ))}
          </Suspense>
        </Canvas>
      </div>

      {/* Scroll capture area */}
      <div ref={scrollContainerRef} className="atmos-scroll-area">
        <div className="atmos-scroll-spacer" />
      </div>

      {/* Easter egg notification */}
      {eggFound && (
        <div className="atmos-egg">You found the hidden elephant!</div>
      )}

      {/* End screen */}
      <div className={`atmos-end ${showEnd ? 'on' : ''}`}>
        <h2>Thank you for choosing Atmos<br/>for your trip.</h2>
        <p>We hope to see you again very soon.</p>
        <button 
          className="atmos-restart" 
          onClick={() => window.location.reload()}
          onMouseEnter={() => setCursorBig(true)}
          onMouseLeave={() => setCursorBig(false)}
        >
          Fly again ↑
        </button>
      </div>

      {/* Footer */}
      <div className="atmos-footer">
        <span>Inspired by Leeroy — Atmos</span>
        <span>Aviation Facts</span>
      </div>
    </div>
  );
};

export default AtmosJourney;
