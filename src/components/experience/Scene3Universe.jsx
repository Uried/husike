import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }    from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { gsap } from 'gsap';

// ── Curve & constants ─────────────────────────────────────────────────────────
const CTRL_PTS = [
  new THREE.Vector3( 0,    5,    0),
  new THREE.Vector3(-2.5,  3,   -2),
  new THREE.Vector3( 1,    1,   -4),
  new THREE.Vector3( 2.5, -1,   -6),
  new THREE.Vector3( 0,   -3,   -8),
  new THREE.Vector3(-2.5, -5.5,-10),
  new THREE.Vector3( 0.5, -7.5,-12),
  new THREE.Vector3( 0,   -9,  -13),
];
const CURVE         = new THREE.CatmullRomCurve3(CTRL_PTS, false, 'catmullrom', 0.5);
const STAGE_PCTS    = [0.28, 0.58, 0.88];
const GOLD_COLOR    = new THREE.Color('#D4AF37');
const GOLD_BRIGHT   = new THREE.Color('#FFD700');

// ── Trail ShaderMaterial (GLSL — no @react-three/drei needed) ────────────────
function makeTrailMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uProgress: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uProgress;
      void main() {
        bool lit = vUv.y <= uProgress;
        vec3 dim    = vec3(0.83, 0.69, 0.22);
        vec3 bright = vec3(1.00, 0.87, 0.00);
        float t   = uProgress > 0.001 ? vUv.y / uProgress : 0.0;
        vec3 col  = lit ? mix(dim, bright, t) : dim;
        float a   = lit ? 0.9 : 0.05;
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

// ── Star field ────────────────────────────────────────────────────────────────
function makeStarField() {
  const geo  = new THREE.BufferGeometry();
  const verts = [];
  for (let i = 0; i < 3500; i++) {
    verts.push(
      (Math.random() - 0.5) * 300,
      (Math.random() - 0.5) * 300,
      (Math.random() - 0.5) * 300,
    );
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.08,
    transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

// ── Waypoint (torus ring + node sphere) ──────────────────────────────────────
function makeWaypoint(position) {
  const group = new THREE.Group();
  group.position.copy(position);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.008, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 }),
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const node = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 }),
  );
  group.add(node);

  const light = new THREE.PointLight(GOLD_COLOR, 0, 3.5);
  group.add(light);

  return { group, ring, node, light };
}

// ── Main component ────────────────────────────────────────────────────────────
const Scene3Universe = ({ data, onNext }) => {
  const mountRef    = useRef(null);
  const scrollRef   = useRef(null);
  const progressRef = useRef(0);
  const stageCardRef    = useRef(null);
  const voiceLineRef    = useRef(null);
  const scrollHintRef   = useRef(null);
  const continueBtnRef  = useRef(null);
  const [activeStage, setActiveStage] = useState(-1);
  const [stageData,   setStageData]   = useState(null);
  const [canContinue, setCanContinue] = useState(false);

  const stages    = data?.stages    || [];
  const voiceLine = data?.voiceLine || 'Suis-moi.';

  /* ── Three.js scene setup ── */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);

    // Scene + camera
    const scene  = new THREE.Scene();
    scene.fog    = new THREE.Fog(0x000000, 30, 200);
    const camera = new THREE.PerspectiveCamera(52, mount.clientWidth / mount.clientHeight, 0.1, 500);
    camera.position.set(0, 7, 10);

    // Ambient light
    scene.add(new THREE.AmbientLight(0x0d0520, 0.08));

    // Stars
    scene.add(makeStarField());

    // Tube path with trail shader
    const trailMat = makeTrailMaterial();
    const tubeGeo  = new THREE.TubeGeometry(CURVE, 300, 0.013, 8, false);
    const tube     = new THREE.Mesh(tubeGeo, trailMat);
    scene.add(tube);

    // Orb
    const orbGroup = new THREE.Group();
    const orbMesh  = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 20, 20),
      new THREE.MeshStandardMaterial({ color: GOLD_BRIGHT, emissive: GOLD_BRIGHT, emissiveIntensity: 3, roughness: 0, metalness: 1 }),
    );
    const orbCore  = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    const orbLight = new THREE.PointLight(GOLD_COLOR, 4, 6);
    orbGroup.add(orbMesh, orbCore, orbLight);
    scene.add(orbGroup);

    // Orb glow sphere (larger, transparent)
    const orbGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16),
      new THREE.MeshBasicMaterial({ color: GOLD_COLOR, transparent: true, opacity: 0.1, depthWrite: false }),
    );
    scene.add(orbGlow);

    // Waypoints
    const waypoints = STAGE_PCTS.map(p => {
      const pos = CURVE.getPoint(p);
      const wp  = makeWaypoint(pos);
      scene.add(wp.group);
      return wp;
    });

    // Post-processing — UnrealBloom
    const composer   = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass   = new UnrealBloomPass(
      new THREE.Vector2(mount.clientWidth, mount.clientHeight),
      1.4, 0.45, 0.82,
    );
    bloomPass.threshold = 0.18;
    bloomPass.strength  = 1.3;
    bloomPass.radius    = 0.5;
    composer.addPass(bloomPass);

    // Resize handler
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      composer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // ── Animate loop
    let rafId;
    const camPos    = new THREE.Vector3();
    const targetPos = new THREE.Vector3();
    const lookPt    = new THREE.Vector3();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const p    = Math.min(progressRef.current, 0.999);
      const orbPt = CURVE.getPoint(p);
      const tang  = CURVE.getTangent(p).normalize();

      // Orb & glow follow curve
      orbGroup.position.lerp(orbPt, 0.12);
      orbGlow.position.lerp(orbPt, 0.12);
      const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.35;
      orbGlow.scale.setScalar(pulse);

      // Update trail shader
      trailMat.uniforms.uProgress.value = p;

      // Rotate reached waypoint rings
      waypoints.forEach(wp => { wp.ring.rotation.z += 0.012; });

      // Camera follows orb from behind + above
      const behind = tang.clone().multiplyScalar(-5);
      targetPos.copy(orbPt).add(behind).add(new THREE.Vector3(0, 2.2, 0));
      camPos.lerp(targetPos, 0.03);
      camera.position.copy(camPos);
      CURVE.getPoint(Math.min(p + 0.07, 0.999), lookPt);
      camera.lookAt(lookPt);

      composer.render();
    };
    animate();

    // ── Entrance fade-in
    gsap.fromTo(renderer.domElement, { opacity: 0 }, { opacity: 1, duration: 1.8 });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      trailMat.dispose();
      tubeGeo.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  /* ── Scroll handler → drives progressRef + UI ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let prevStage = -1;

    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      const p   = max > 0 ? el.scrollTop / max : 0;
      progressRef.current = p;

      // Active stage detection
      let active = -1;
      STAGE_PCTS.forEach((t, i) => { if (p >= t - 0.06) active = i; });

      if (active !== prevStage) {
        prevStage = active;
        setActiveStage(active);

        const sd = active >= 0 ? stages[active] : null;
        setStageData(sd);

        // Animate stage card
        if (stageCardRef.current) {
          gsap.fromTo(stageCardRef.current,
            { opacity: 0, y: 16 },
            { opacity: sd ? 1 : 0, y: 0, duration: 0.7, ease: 'power2.out' },
          );
        }

        // Light up waypoints
        // (handled by activeStage state for node color — done in Three.js loop above)
      }

      // Scroll hint
      if (scrollHintRef.current) {
        gsap.to(scrollHintRef.current, { opacity: p < 0.04 ? 1 : 0, duration: 0.4 });
      }

      // Continue button
      if (p > 0.9 && !canContinue) {
        setCanContinue(true);
        if (continueBtnRef.current) {
          gsap.fromTo(continueBtnRef.current,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
          );
        }
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [stages, canContinue]);

  /* ── UI entrance ── */
  useEffect(() => {
    gsap.fromTo(voiceLineRef.current,
      { opacity: 0 }, { opacity: 0.35, duration: 1.6, delay: 0.8 },
    );
    gsap.fromTo(scrollHintRef.current,
      { opacity: 0 }, { opacity: 1, duration: 1.2, delay: 1.5 },
    );
    // Animate the scroll arrow
    gsap.to('.s3-scroll-arrow', {
      y: 7, duration: 1.8, repeat: -1, yoyo: true, ease: 'sine.inOut',
    });
  }, []);

  const currentStage = activeStage >= 0 ? stages[activeStage] : null;

  return (
    <div className="fixed inset-0 bg-black">
      {/* Three.js mount */}
      <div ref={mountRef} className="absolute inset-0 z-0" />

      {/* Scroll capture */}
      <div
        ref={scrollRef}
        className="absolute inset-0 z-10 overflow-y-scroll no-scrollbar"
      >
        <div style={{ height: '420vh' }} />
      </div>

      {/* UI overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none">

        {/* Voice line */}
        <p ref={voiceLineRef}
           className="absolute top-10 left-0 right-0 text-center text-white text-[10px] tracking-[0.5em] uppercase"
           style={{ opacity: 0 }}>
          {voiceLine}
        </p>

        {/* Stage card */}
        <div ref={stageCardRef}
             className="absolute inset-x-5 bottom-28"
             style={{ opacity: 0 }}>
          {currentStage && (
            <div className="bg-black/65 backdrop-blur-md rounded-2xl border border-[#D4AF37]/10 px-6 py-5 space-y-3">
              <p className="text-[#D4AF37]/40 text-[9px] uppercase tracking-[0.4em]">
                {currentStage.label}
              </p>
              <p className="text-white/85 text-lg font-light leading-relaxed"
                 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                "{currentStage.voiceLine}"
              </p>
              {currentStage.description && (
                <p className="text-white/30 text-sm leading-relaxed">
                  {currentStage.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Scroll hint */}
        <div ref={scrollHintRef}
             className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-2"
             style={{ opacity: 0 }}>
          <div className="s3-scroll-arrow w-px h-8 bg-gradient-to-b from-transparent to-[#D4AF37]/40" />
          <p className="text-white/20 text-[9px] tracking-[0.45em] uppercase">Fais défiler</p>
        </div>

        {/* Continue button */}
        <div ref={continueBtnRef}
             className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-auto"
             style={{ opacity: 0 }}>
          <button
            onClick={onNext}
            className="px-8 py-3 rounded-full border border-[#D4AF37]/20 text-[#D4AF37]/50 text-xs tracking-[0.3em] uppercase hover:border-[#D4AF37]/45 hover:text-[#D4AF37] transition-all duration-300"
          >
            Continuer le voyage
          </button>
        </div>
      </div>
    </div>
  );
};

export default Scene3Universe;
