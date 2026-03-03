import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { Stars, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

// ── 3D curve winding through space ───────────────────────────────────────────
const CONTROL_POINTS = [
  new THREE.Vector3( 0,    5,    0),
  new THREE.Vector3(-2.5,  3,   -2),
  new THREE.Vector3( 1,    1,   -4),
  new THREE.Vector3( 2.5, -1,   -6),
  new THREE.Vector3( 0,   -3,   -8),
  new THREE.Vector3(-2.5, -5.5,-10),
  new THREE.Vector3( 0.5, -7.5,-12),
  new THREE.Vector3( 0,   -9,  -13),
];
const curve = new THREE.CatmullRomCurve3(CONTROL_POINTS, false, 'catmullrom', 0.5);

const STAGE_PERCENTS = [0.28, 0.58, 0.88];
const GOLD        = new THREE.Color('#D4AF37');
const GOLD_BRIGHT = new THREE.Color('#FFD700');

// ── GLSL trail shader — colors tube from dim→bright based on scroll progress ─
const TubeTrailMaterial = shaderMaterial(
  { uProgress: 0.0 },
  /* vert */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* frag */ `
    varying vec2 vUv;
    uniform float uProgress;
    void main() {
      bool lit = vUv.y <= uProgress;
      vec3 dim    = vec3(0.83, 0.69, 0.22);
      vec3 bright = vec3(1.00, 0.87, 0.00);
      float t  = uProgress > 0.001 ? vUv.y / uProgress : 0.0;
      vec3 col = lit ? mix(dim, bright, t) : dim;
      float a  = lit ? 0.9 : 0.05;
      gl_FragColor = vec4(col, a);
    }
  `
);
extend({ TubeTrailMaterial });

// Where each stage "lights up" (alias kept for scroll handler)
const STAGE_THRESHOLDS = STAGE_PERCENTS;

// ── Waypoint node in 3D space ─────────────────────────────────────────────────
const WaypointNode = ({ position, isReached }) => {
  const ringRef = useRef();
  useFrame((_, delta) => {
    if (ringRef.current && isReached) ringRef.current.rotation.z += delta * 0.7;
  });
  return (
    <group position={position}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25, 0.008, 8, 48]} />
        <meshBasicMaterial color={isReached ? GOLD_BRIGHT : 'white'} transparent opacity={isReached ? 0.6 : 0.08} />
      </mesh>
      <mesh>
        <sphereGeometry args={[isReached ? 0.1 : 0.045, 16, 16]} />
        <meshStandardMaterial
          color={isReached ? GOLD_BRIGHT : 'white'}
          emissive={isReached ? GOLD : new THREE.Color('black')}
          emissiveIntensity={isReached ? 2.5 : 0}
          transparent opacity={isReached ? 1 : 0.2}
        />
      </mesh>
      {isReached && <pointLight color={GOLD} intensity={1.5} distance={3.5} />}
    </group>
  );
};

// ── Three.js scene driven by progressRef ─────────────────────────────────────
const PathScene = ({ progressRef, stages, activeStage }) => {
  const trailMatRef  = useRef();
  const orbRef       = useRef();
  const orbGlowRef   = useRef();

  const tubeGeo = useMemo(
    () => new THREE.TubeGeometry(curve, 300, 0.013, 8, false),
    []
  );

  const waypointPositions = useMemo(
    () => STAGE_PERCENTS.map(p => { const v = curve.getPoint(p); return [v.x, v.y, v.z]; }),
    []
  );

  useFrame(({ camera }, delta) => {
    const p = Math.min(progressRef.current, 0.999);
    const orbPt  = curve.getPoint(p);
    const tang   = curve.getTangent(p).normalize();

    // Move orb
    if (orbRef.current)      orbRef.current.position.lerp(orbPt, 0.12);
    if (orbGlowRef.current) {
      orbGlowRef.current.position.lerp(orbPt, 0.12);
      const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.35;
      orbGlowRef.current.scale.setScalar(pulse);
    }

    // Trail shader uniform
    if (trailMatRef.current) trailMatRef.current.uProgress = p;

    // Camera flies behind the orb along the tangent
    const behind = tang.clone().multiplyScalar(-5);
    const up     = new THREE.Vector3(0, 2.2, 0);
    camera.position.lerp(orbPt.clone().add(behind).add(up), 0.03);

    // Look slightly ahead
    const lookPt = curve.getPoint(Math.min(p + 0.07, 0.999));
    camera.lookAt(lookPt);
  });

  return (
    <>
      <Stars radius={70} depth={50} count={3500} factor={3.5} saturation={0} fade />
      <ambientLight intensity={0.04} color="#0d0520" />

      {/* Full-path tube with GLSL trail */}
      <mesh geometry={tubeGeo}>
        <tubeTrailMaterial
          ref={trailMatRef}
          uProgress={0}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Orb glow sphere */}
      <mesh ref={orbGlowRef}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.10} />
      </mesh>

      {/* Orb */}
      <group ref={orbRef}>
        <mesh>
          <sphereGeometry args={[0.07, 20, 20]} />
          <meshStandardMaterial color={GOLD_BRIGHT} emissive={GOLD_BRIGHT} emissiveIntensity={3} roughness={0} metalness={1} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshBasicMaterial color="white" />
        </mesh>
        <pointLight color={GOLD} intensity={4} distance={6} />
      </group>

      {/* Waypoints */}
      {waypointPositions.map((pos, i) => (
        <WaypointNode key={i} position={pos} isReached={i <= activeStage} />
      ))}
    </>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const Scene3Universe = ({ data, onNext }) => {
  const scrollRef   = useRef(null);
  const progressRef = useRef(0);
  const [progress,    setProgress]    = useState(0);
  const [activeStage, setActiveStage] = useState(-1);
  const [canContinue, setCanContinue] = useState(false);

  const stages    = data?.stages    || [];
  const voiceLine = data?.voiceLine || 'Suis-moi.';

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const maxScroll = el.scrollHeight - el.clientHeight;
      const p = maxScroll > 0 ? el.scrollTop / maxScroll : 0;
      progressRef.current = p;
      setProgress(p);
      let active = -1;
      STAGE_THRESHOLDS.forEach((t, i) => { if (p >= t - 0.06) active = i; });
      setActiveStage(prev => prev !== active ? active : prev);
      if (p > 0.9) setCanContinue(true);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const currentStage = activeStage >= 0 ? stages[activeStage] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
      className="fixed inset-0 bg-black"
    >
      {/* Three.js canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 7, 10], fov: 52 }}>
          <PathScene progressRef={progressRef} stages={stages} activeStage={activeStage} />
        </Canvas>
      </div>

      {/* Scroll-capture layer — transparent, above canvas */}
      <div
        ref={scrollRef}
        className="absolute inset-0 z-10 overflow-y-scroll"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        <div style={{ height: '420vh' }} />
      </div>

      {/* UI overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none">

        {/* Voice line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ delay: 0.8 }}
          className="absolute top-10 left-0 right-0 text-center text-white text-xs tracking-[0.45em] uppercase"
        >
          {voiceLine}
        </motion.p>

        {/* Stage content panel */}
        <div className="absolute inset-x-5 bottom-28">
          <AnimatePresence mode="wait">
            {currentStage && (
              <motion.div
                key={activeStage}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.7 }}
                className="bg-black/60 backdrop-blur-md rounded-2xl border border-[#D4AF37]/10 px-6 py-5 space-y-3"
              >
                <p className="text-[#D4AF37]/40 text-[9px] uppercase tracking-[0.35em]">
                  {currentStage.label}
                </p>
                <p
                  className="text-white/85 text-lg font-light leading-relaxed"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  "{currentStage.voiceLine}"
                </p>
                {currentStage.description && (
                  <p className="text-white/30 text-sm leading-relaxed">
                    {currentStage.description}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scroll hint */}
        <AnimatePresence>
          {progress < 0.04 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 1.5 }}
              className="absolute bottom-10 left-0 right-0 flex flex-col items-center space-y-2"
            >
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                className="w-[1px] h-8 bg-gradient-to-b from-transparent to-[#D4AF37]/40"
              />
              <p className="text-white/20 text-[9px] tracking-[0.4em] uppercase">Fais défiler</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continue button */}
        <AnimatePresence>
          {canContinue && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-auto"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onNext}
                className="px-8 py-3 rounded-full border border-[#D4AF37]/20 text-[#D4AF37]/50 text-xs tracking-[0.3em] uppercase hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-all"
              >
                Continuer le voyage
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Scene3Universe;
