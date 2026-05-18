import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }    from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { gsap } from 'gsap';
import { getDailyMood } from './DailyMood';

// ── Curve & constants ─────────────────────────────────────────────────────────
const CTRL_PTS = [
  new THREE.Vector3( 0,    5,    0),
  new THREE.Vector3(-3,    3,   -3),
  new THREE.Vector3( 1.5,  1,   -6),
  new THREE.Vector3( 3,   -1,   -9),
  new THREE.Vector3( 0,   -4,  -12),
  new THREE.Vector3(-3,   -6.5,-15),
  new THREE.Vector3( 1,   -8.5,-18),
  new THREE.Vector3( 0,  -11,  -21),
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

// ── Star field with shimmer ────────────────────────────────────────────────────────────────
function makeStarField(mood) {
  const geo  = new THREE.BufferGeometry();
  const verts = [], sizes = [], phases = [];
  for (let i = 0; i < 5000; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 80 + Math.random() * 250;
    verts.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
    sizes.push(0.04 + Math.random() * 0.18);
    phases.push(Math.random() * Math.PI * 2);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('aSize',    new THREE.Float32BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase',   new THREE.Float32BufferAttribute(phases, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      varying float vAlpha;
      void main() {
        vAlpha = 0.4 + 0.6 * sin(uTime * 0.8 + aPhase);
        gl_PointSize = aSize * vAlpha * (300.0 / -(modelViewMatrix * vec4(position,1.0)).z);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        if (d > 0.5) discard;
        gl_FragColor = vec4(1.0, 1.0, 1.0, smoothstep(0.5,0.0,d) * vAlpha * 0.7);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.userData.starMat = mat;
  return pts;
}

// ── Nebula cloud ────────────────────────────────────────────────────────────────
function makeNebulaCloud(position, color, size, opacity) {
  const COUNT = 300;
  const verts = [], sizes = [], alphas = [];
  for (let i = 0; i < COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = Math.random() * size;
    verts.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
    sizes.push(0.3 + Math.random() * 1.2);
    alphas.push(Math.random());
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('aSize',    new THREE.Float32BufferAttribute(sizes, 1));
  const mat = new THREE.PointsMaterial({
    color, size: 0.8, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.position.copy(position);
  return pts;
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
    const mood = getDailyMood();

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    // Scene + camera
    const scene  = new THREE.Scene();
    scene.fog    = new THREE.FogExp2(0x000000, mood.fogDensity * 0.5);
    const camera = new THREE.PerspectiveCamera(56, mount.clientWidth / mount.clientHeight, 0.1, 600);
    camera.position.set(0, 7, 10);

    // Ambient light
    scene.add(new THREE.AmbientLight(0x0d0520, 0.1));

    // Stars with shimmer
    const starField = makeStarField(mood);
    scene.add(starField);

    // Nebula clouds scattered along the path
    const [nr, ng, nb] = mood.nebulaColor.split(',').map(Number);
    const nebulaColor = new THREE.Color(nr/255, ng/255, nb/255);
    scene.add(makeNebulaCloud(new THREE.Vector3(-5, 0, -8),  nebulaColor, 8, 0.12));
    scene.add(makeNebulaCloud(new THREE.Vector3( 6, -2, -14), new THREE.Color('#D4AF37'), 6, 0.08));
    scene.add(makeNebulaCloud(new THREE.Vector3(-4, -6, -18), nebulaColor, 7, 0.1));

    // Tube path with trail shader
    const trailMat = makeTrailMaterial();
    const tubeGeo  = new THREE.TubeGeometry(CURVE, 400, 0.015, 8, false);
    const tube     = new THREE.Mesh(tubeGeo, trailMat);
    scene.add(tube);

    // Orb (the spirit guide)
    const orbGroup = new THREE.Group();
    const orbMesh  = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 24, 24),
      new THREE.MeshStandardMaterial({ color: GOLD_BRIGHT, emissive: GOLD_BRIGHT, emissiveIntensity: 4, roughness: 0, metalness: 1 }),
    );
    const orbCore  = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    const orbLight = new THREE.PointLight(GOLD_COLOR, 6, 8);
    const orbTrail = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshBasicMaterial({ color: GOLD_COLOR, transparent: true, opacity: 0.08, depthWrite: false }),
    );
    orbGroup.add(orbMesh, orbCore, orbLight, orbTrail);
    scene.add(orbGroup);

    // Orb glow sphere
    const orbGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshBasicMaterial({ color: GOLD_COLOR, transparent: true, opacity: 0.07, depthWrite: false }),
    );
    scene.add(orbGlow);

    // Waypoints — rings + floating memory particles
    const waypoints = STAGE_PCTS.map((p, idx) => {
      const pos = CURVE.getPoint(p);
      const wp  = makeWaypoint(pos);
      scene.add(wp.group);

      // Memory particle halo around each waypoint
      const haloGeo = new THREE.BufferGeometry();
      const hVerts  = [];
      for (let j = 0; j < 60; j++) {
        const a = (j / 60) * Math.PI * 2;
        const r = 0.6 + Math.random() * 0.3;
        hVerts.push(pos.x + r * Math.cos(a), pos.y + r * Math.sin(a) * 0.3, pos.z + r * Math.sin(a));
      }
      haloGeo.setAttribute('position', new THREE.Float32BufferAttribute(hVerts, 3));
      const haloMat = new THREE.PointsMaterial({
        color: GOLD_COLOR, size: 0.04, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const halo = new THREE.Points(haloGeo, haloMat);
      scene.add(halo);
      wp.halo = halo;
      wp.haloMat = haloMat;
      return wp;
    });

    // Shooting star pool
    const shootingStars = [];
    let ssTick = 0;
    const spawnShootingStar = () => {
      const start = new THREE.Vector3(
        (Math.random() - 0.5) * 60, 20 + Math.random() * 10, -20 + Math.random() * 10
      );
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 0.5, -1 - Math.random() * 0.5, -0.3
      ).normalize();
      const pts = [];
      for (let i = 0; i <= 12; i++) pts.push(start.clone().addScaledVector(dir, i * 2));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, linewidth: 1,
      });
      const line = new THREE.Line(geo, mat);
      scene.add(line);
      gsap.to(mat, { opacity: 0.85, duration: 0.25 })
          .then(() => gsap.to(mat, { opacity: 0, duration: 0.4 }))
          .then(() => { scene.remove(line); geo.dispose(); mat.dispose(); });
    };

    // Post-processing — UnrealBloom
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(mount.clientWidth, mount.clientHeight),
      mood.bloomStrength, 0.5, 0.75,
    );
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
      const t  = Date.now() * 0.001;
      const p  = Math.min(progressRef.current, 0.999);
      const orbPt = CURVE.getPoint(p);
      const tang  = CURVE.getTangent(p).normalize();

      // Update star shimmer
      if (starField.userData.starMat) {
        starField.userData.starMat.uniforms.uTime.value = t;
      }

      // Rotate star field slowly
      starField.rotation.y += 0.00008;

      // Orb & glow follow curve
      orbGroup.position.lerp(orbPt, 0.1);
      orbGlow.position.lerp(orbPt, 0.1);
      const pulse = 1 + Math.sin(t * 1.8) * 0.4;
      orbGlow.scale.setScalar(pulse);
      orbLight.intensity = 5 + Math.sin(t * 2) * 2;

      // Update trail shader
      trailMat.uniforms.uProgress.value = p;

      // Waypoints: rotate rings, pulse halo on active
      waypoints.forEach((wp, i) => {
        wp.ring.rotation.z += 0.008 + i * 0.004;
        const stageActive = p >= STAGE_PCTS[i] - 0.04;
        if (stageActive && wp.haloMat.opacity < 0.5) {
          wp.haloMat.opacity = Math.min(wp.haloMat.opacity + 0.02, 0.5);
          wp.light.intensity = Math.min(wp.light.intensity + 0.1, 2);
        }
      });

      // Shooting stars (every ~240 frames at mood frequency)
      ssTick++;
      const ssRate = mood.shootingStarFrequency === 'high' ? 180 : mood.shootingStarFrequency === 'medium' ? 360 : 600;
      if (ssTick % ssRate < 3 && Math.random() > 0.7) spawnShootingStar();

      // Camera follows orb from behind + above with gentle sway
      const sway  = Math.sin(t * 0.3) * 0.4;
      const behind = tang.clone().multiplyScalar(-5.5);
      targetPos.copy(orbPt).add(behind).add(new THREE.Vector3(sway, 2.5, 0));
      camPos.lerp(targetPos, 0.025);
      camera.position.copy(camPos);
      CURVE.getPoint(Math.min(p + 0.06, 0.999), lookPt);
      camera.lookAt(lookPt);

      composer.render();
    };
    animate();

    // ── Entrance fade-in
    gsap.fromTo(renderer.domElement, { opacity: 0 }, { opacity: 1, duration: 2.2 });

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
