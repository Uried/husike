import React, { useEffect, useRef, useState, useCallback, Suspense, useMemo, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, PerspectiveCamera, Text, Environment, Sphere, Instance, Instances } from '@react-three/drei';
import { EffectComposer, Noise, Bloom, Vignette } from '@react-three/postprocessing';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { fadeOnBeforeCompile, fadeOnBeforeCompileFlat } from '../../../utils/fadeMaterial';
import './AtmosJourney.css';

// ═══════════════════════════════════════════════════════════════════════════════
// BACKGROUND COLORS (exact same as atmosClone Home.jsx)
// colorA = top of gradient, colorB = bottom of gradient
// GSAP timeline interpolates between these stops based on scroll progress
// ═══════════════════════════════════════════════════════════════════════════════

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
        child.material.roughness = 0.9;
        child.material.metalness = 0.0;
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
// SKY COMPONENT - exact replica of atmosClone Background.jsx
// Uses a 2-color gradient (colorA=top, colorB=bottom) on a sphere,
// matching lamina Gradient with axes="y", start=0.2, end=-0.5
// ═══════════════════════════════════════════════════════════════════════════════
function Sky({ backgroundColors }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const { camera } = useThree();
  
  const uniforms = useMemo(() => ({
    uColorA: { value: new THREE.Color("#3535cc") },
    uColorB: { value: new THREE.Color("#abaadd") },
  }), []);
  
  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uColorA.value.set(backgroundColors.current.colorA);
      materialRef.current.uniforms.uColorB.value.set(backgroundColors.current.colorB);
    }
    if (meshRef.current) {
      meshRef.current.position.copy(camera.position);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[500, 40, 20]} />
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
          uniform vec3 uColorA, uColorB;
          varying vec3 vPos;
          
          void main() {
            // Replicate lamina Gradient: axes="y", start=0.2, end=-0.5
            float rawY = vPos.y / 500.0; // normalized -1 to 1
            float t = smoothstep(-0.5, 0.2, rawY);
            // t=0 at bottom (colorB), t=1 at top (colorA)
            vec3 color = mix(uColorB, uColorA, t);
            gl_FragColor = vec4(color, 1.0);
          }
        `}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPEED LINES - exact copy from atmosClone Speed.jsx
// Lines appear when scrolling fast, fade out when idle
// ═══════════════════════════════════════════════════════════════════════════════
const SPEED_INSTANCES = 240;
const SPEED_MAX_OPACITY = 0.1;

function SpeedShape() {
  const ref = useRef();
  let randomPosition = { x: 0, y: 0, z: 0 };
  let randomSpeed = 0;

  const resetRandom = () => {
    randomPosition = {
      x: THREE.MathUtils.randFloatSpread(8),
      y: THREE.MathUtils.randFloatSpread(5),
      z: THREE.MathUtils.randFloatSpread(8),
    };
    randomSpeed = THREE.MathUtils.randFloat(16, 20);
  };
  resetRandom();

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.position.z += randomSpeed * delta;
      if (ref.current.position.z > 5) {
        resetRandom();
        ref.current.position.z = randomPosition.z;
      }
    }
  });

  return (
    <Instance
      ref={ref}
      color="white"
      position={[randomPosition.x, randomPosition.y, randomPosition.z]}
      rotation-y={Math.PI / 2}
    />
  );
}

function SpeedLines({ scrollProgressRef }) {
  const speedMaterial = useRef();
  const lastScroll = useRef(0);
  const wheelVelocity = useRef(0);

  // Listen to wheel events directly to detect fast scrolling reliably
  useEffect(() => {
    const onWheel = (e) => {
      // Accumulate scroll velocity from wheel events
      wheelVelocity.current += Math.abs(e.deltaY) * 0.001;
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  useFrame((_state, delta) => {
    if (!speedMaterial.current) return;

    // Show lines when wheel velocity is high enough
    if (wheelVelocity.current > 0.01) {
      speedMaterial.current.opacity = SPEED_MAX_OPACITY;
    }
    // Decay wheel velocity over time
    wheelVelocity.current *= 0.85;

    // Fade out gradually
    if (speedMaterial.current.opacity > 0) {
      speedMaterial.current.opacity -= delta * 0.2;
    }
  });

  return (
    <group>
      <Instances>
        <planeGeometry args={[1, 0.004]} />
        <meshBasicMaterial
          ref={speedMaterial}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          opacity={0}
          transparent
        />
        {Array(SPEED_INSTANCES)
          .fill()
          .map((_, key) => (
            <SpeedShape key={key} />
          ))}
      </Instances>
    </group>
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
      <meshStandardMaterial 
        ref={materialRef}
        color={"white"}
        transparent 
        opacity={0.25}
        envMapIntensity={2}
        onBeforeCompile={fadeOnBeforeCompile}
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
// CLOUD COMPONENT - using fadeOnBeforeCompile for distance-based fog (like original)
// ═══════════════════════════════════════════════════════════════════════════════
function Cloud({ modelPath, position, scale = 1, sceneOpacity }) {
  const { scene } = useGLTF(modelPath);
  const materialRef = useRef();
  
  // Clone the scene for this cloud instance
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        // Apply a new MeshStandardMaterial with fadeOnBeforeCompile
        // This replicates the atmosClone's cloud material exactly
        const mat = new THREE.MeshStandardMaterial({
          onBeforeCompile: fadeOnBeforeCompile,
          envMapIntensity: 2,
          transparent: true,
        });
        child.material = mat;
        if (!materialRef.current) materialRef.current = mat;
      }
    });
  }, [clonedScene]);

  // Sync opacity with scene opacity (fade in/out with scene)
  useFrame(() => {
    if (materialRef.current && sceneOpacity != null) {
      materialRef.current.opacity = sceneOpacity;
    }
  });

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
          >
            {fact.n} — {fact.l}
            <meshStandardMaterial
              color={"white"}
              onBeforeCompile={fadeOnBeforeCompileFlat}
            />
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
            <meshStandardMaterial
              color={"white"}
              onBeforeCompile={fadeOnBeforeCompileFlat}
            />
          </Text>
        </group>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENE - complete implementation matching original
// ═══════════════════════════════════════════════════════════════════════════════
function Scene({ scrollProgress, scrollProgressRef, curve, onEggFound, backgroundColors, bgTimeline }) {
  const { camera, scene } = useThree();
  const gliderRef = useRef();

  
  // No FogExp2 — distance fade is handled by fadeMaterial shader (like the original)
  useEffect(() => {
    scene.fog = null;
  }, [scene]);
  
  // Seek the GSAP color timeline based on scroll (exactly like atmosClone)
  useFrame(() => {
    if (bgTimeline.current) {
      bgTimeline.current.seek(scrollProgress * bgTimeline.current.duration());
    }
  });

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
      {/* Sky - 2-color gradient sphere driven by GSAP timeline (like atmosClone) */}
      <Sky backgroundColors={backgroundColors} />
      
      {/* Lighting */}
      <directionalLight position={[0, 3, 1]} intensity={0.1} />
      <hemisphereLight skyColor={0xd0ccff} groundColor={0xffc8a0} intensity={1.5} />
      <directionalLight color={0xffffff} intensity={2.5} position={[10, 14, 6]} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight color={0xffddcc} intensity={0.75} position={[-8, -4, 8]} />
      <directionalLight color={0xaabbff} intensity={0.85} position={[0, 8, -14]} />
      
      {/* Environment map for cloud reflections (like atmosClone Background) */}
      <Environment resolution={256} frames={Infinity}>
        <Sphere scale={[100, 100, 100]} rotation-y={Math.PI / 2}>
          <meshStandardMaterial color={"#ffffff"} side={THREE.BackSide} />
        </Sphere>
      </Environment>
      
      {/* Guide Tube */}
      <GuideTube curve={curve} scrollProgress={scrollProgress} />
      
      {/* Speed lines - appear when scrolling fast (like atmosClone) */}
      <SpeedLines scrollProgressRef={scrollProgressRef} />
      
      {/* Glider */}
      <Glider ref={gliderRef} curve={curve} scrollProgress={scrollProgress} />
      
      {/* Easter Egg Elephant */}
      <EasterEgg curve={curve} scrollProgress={scrollProgress} onFound={onEggFound} />
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
  const sceneOpacityRef = useRef(1);
  const scrollProgressRef = useRef(0);
  
  // Background colors driven by GSAP timeline (exact copy from atmosClone)
  const backgroundColors = useRef({
    colorA: "#3535cc",
    colorB: "#abaadd",
  });
  const bgTimeline = useRef(null);
  
  useEffect(() => {
    const tl = gsap.timeline();
    tl.to(backgroundColors.current, {
      duration: 1,
      colorA: "#6f35cc",
      colorB: "#ffad30",
    });
    tl.to(backgroundColors.current, {
      duration: 1,
      colorA: "#424242",
      colorB: "#ffcc00",
    });
    tl.to(backgroundColors.current, {
      duration: 1,
      colorA: "#81318b",
      colorB: "#55ab8f",
    });
    tl.pause();
    bgTimeline.current = tl;
    return () => tl.kill();
  }, []);
  
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

  // Scroll handling with inertia
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    let targetProg = 0;
    let currentProg = 0;
    const BASE_SK = 0.0012;
    let rafId;
    
    const handleWheel = (e) => {
      if (showEnd) return;
      targetProg = Math.max(0, Math.min(1, targetProg + e.deltaY * BASE_SK));
    };
    
    const animate = () => {
      currentProg += (targetProg - currentProg) * 0.18;
      scrollProgressRef.current = currentProg; // Update ref every frame for SpeedLines
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
  
  // Scene opacity for fade-in (clouds use this)
  sceneOpacityRef.current = started ? 1 : 0;
  
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
      style={{ background: `#3535cc` }}
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
              scrollProgressRef={scrollProgressRef}
              curve={flightCurve} 
              onEggFound={() => setEggFound(true)}
              backgroundColors={backgroundColors}
              bgTimeline={bgTimeline}
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
                sceneOpacity={sceneOpacityRef.current}
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
                sceneOpacity={sceneOpacityRef.current}
              />
            ))}
          </Suspense>
          {/* Post-processing: grain + bloom + vignette (like the original Atmos) */}
          <EffectComposer>
            <Bloom
              intensity={1.2}
              luminanceThreshold={0.3}
              luminanceSmoothing={0.95}
              mipmapBlur
            />
            <Noise opacity={0.1} />
            <Vignette eskil={false} offset={0.1} darkness={0.5} />
          </EffectComposer>
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
