import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { getDailyMood } from './DailyMood';

let sharedRenderer = null;
let sharedScene = null;
let sharedCamera = null;
let sharedComposer = null;
let sharedMount = null;
let rafId = null;
let shootingStarTimeout = null;
let initialized = false;

function initCosmos(mount, mood) {
  if (initialized && sharedMount === mount) return;
  cleanup();

  sharedMount = mount;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  mount.appendChild(renderer.domElement);
  sharedRenderer = renderer;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, mood.fogDensity);
  sharedScene = scene;

  const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000);
  camera.position.set(0, 0, 1);
  sharedCamera = camera;

  scene.add(new THREE.AmbientLight(0x0a0520, 0.3));

  // ── Deep star field (3 layers for parallax depth) ──
  [4000, 2000, 800].forEach((count, layer) => {
    const geo = new THREE.BufferGeometry();
    const verts = [], sizes = [], alphas = [];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 200 + layer * 100 + Math.random() * 200;
      verts.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
      sizes.push(0.05 + Math.random() * (layer === 2 ? 0.4 : 0.15));
      alphas.push(0.3 + Math.random() * 0.7);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(layer === 2 ? '#ffffff' : (layer === 1 ? '#D4AF37' : '#ffffff')) },
        uOpacity: { value: layer === 2 ? 0.55 : 0.25 },
      },
      vertexShader: `
        attribute float size;
        uniform float uTime;
        varying float vAlpha;
        void main() {
          float flicker = 0.7 + 0.3 * sin(uTime * 1.5 + position.x * 0.01 + position.y * 0.02);
          vAlpha = flicker;
          gl_PointSize = size * flicker * (300.0 / -( modelViewMatrix * vec4(position, 1.0)).z);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d) * vAlpha * uOpacity;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.userData.layer = layer;
    pts.userData.mat = mat;
    scene.add(pts);
  });

  // ── Nebula clouds ──
  const [r, g, b] = mood.nebulaColor.split(',').map(Number);
  const nebulaData = [
    { pos: [0, 0, -80], size: 120, color: `rgba(${r},${g},${b},0.06)`, blur: 80 },
    { pos: [-40, 20, -100], size: 90, color: `rgba(${Math.floor(r*0.7)},${Math.floor(g*0.5)},${Math.floor(b*1.2)},0.04)`, blur: 60 },
    { pos: [60, -30, -90], size: 100, color: `rgba(212,175,55,0.03)`, blur: 70 },
  ];

  nebulaData.forEach(({ pos, size, color, blur }) => {
    const geo = new THREE.SphereGeometry(size, 8, 8);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(`rgb(${r},${g},${b})`) },
        uOpacity: { value: 0.018 },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vNormal;
        void main() {
          float d = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          float wave = sin(uTime * 0.3 + d * 5.0) * 0.5 + 0.5;
          gl_FragColor = vec4(uColor, uOpacity * d * wave);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.userData.mat = mat;
    mesh.rotation.y = (mood.nebulaRotation * Math.PI) / 180;
    scene.add(mesh);
  });

  // ── Post-processing ──
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(mount.clientWidth, mount.clientHeight),
    Math.min(mood.bloomStrength * 0.35, 0.6), 0.4, 0.92
  );
  composer.addPass(bloom);
  sharedComposer = composer;

  // ── Shooting star pool ──
  const shootingStars = [];
  function spawnShootingStar() {
    const geo = new THREE.BufferGeometry();
    const start = new THREE.Vector3(
      (Math.random() - 0.5) * 200,
      (Math.random() - 0.5) * 100 + 30,
      -60
    );
    const end = start.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 80,
      -40 - Math.random() * 40,
      20
    ));
    const points = [];
    for (let i = 0; i <= 20; i++) {
      points.push(start.clone().lerp(end, i / 20));
    }
    geo.setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0, linewidth: 1,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(geo, mat);
    scene.add(line);

    let t = 0;
    const speed = 0.02 + Math.random() * 0.03;
    const star = { line, mat, t, speed, dead: false };
    shootingStars.push(star);

    // Fade in then out
    const fadeIn = () => {
      mat.opacity = Math.min(mat.opacity + 0.08, 0.9);
      if (mat.opacity < 0.9) requestAnimationFrame(fadeIn);
      else {
        setTimeout(() => {
          const fadeOut = () => {
            mat.opacity = Math.max(mat.opacity - 0.05, 0);
            if (mat.opacity > 0) requestAnimationFrame(fadeOut);
            else { star.dead = true; scene.remove(line); geo.dispose(); mat.dispose(); }
          };
          fadeOut();
        }, 400 + Math.random() * 300);
      }
    };
    fadeIn();
  }

  const freqMap = { high: 2000, medium: 4000, low: 8000 };
  const scheduleShootingStar = () => {
    const delay = freqMap[mood.shootingStarFrequency] + Math.random() * 3000;
    shootingStarTimeout = setTimeout(() => {
      if (Math.random() > 0.3) spawnShootingStar();
      scheduleShootingStar();
    }, delay);
  };
  scheduleShootingStar();

  // ── Resize ──
  const onResize = () => {
    camera.aspect = mount.clientWidth / mount.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    composer.setSize(mount.clientWidth, mount.clientHeight);
  };
  window.addEventListener('resize', onResize);

  // ── Mouse parallax ──
  let mouseX = 0, mouseY = 0;
  const onMouse = (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('mousemove', onMouse);

  // ── Animate ──
  let startTime = Date.now();
  const animate = () => {
    rafId = requestAnimationFrame(animate);
    const elapsed = (Date.now() - startTime) / 1000;

    // Parallax camera drift
    camera.position.x += (mouseX * 2 - camera.position.x) * 0.005;
    camera.position.y += (-mouseY * 1.5 - camera.position.y) * 0.005;
    camera.lookAt(0, 0, 0);

    // Slow star layer rotation (parallax)
    scene.children.forEach(child => {
      if (child.userData.layer !== undefined) {
        child.rotation.y += 0.00002 * (child.userData.layer + 1) * mood.starSpeed;
        if (child.userData.mat?.uniforms?.uTime) {
          child.userData.mat.uniforms.uTime.value = elapsed;
        }
      }
      if (child.userData.mat?.uniforms?.uTime && child.type === 'Mesh') {
        child.userData.mat.uniforms.uTime.value = elapsed;
        child.rotation.y += 0.0001;
      }
    });

    composer.render();
  };
  animate();

  sharedScene._onResize = onResize;
  sharedScene._onMouse = onMouse;
  initialized = true;
}

function cleanup() {
  if (shootingStarTimeout) clearTimeout(shootingStarTimeout);
  if (rafId) cancelAnimationFrame(rafId);
  if (sharedScene) {
    window.removeEventListener('resize', sharedScene._onResize);
    window.removeEventListener('mousemove', sharedScene._onMouse);
  }
  if (sharedRenderer && sharedMount && sharedMount.contains(sharedRenderer.domElement)) {
    sharedMount.removeChild(sharedRenderer.domElement);
    sharedRenderer.dispose();
  }
  sharedRenderer = null;
  sharedScene = null;
  sharedCamera = null;
  sharedComposer = null;
  sharedMount = null;
  initialized = false;
}

const CosmosBackground = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const mood = getDailyMood();
    initCosmos(mount, mood);

    return () => {
      // Don't cleanup on unmount — let it persist. Cleanup on final unmount only via window unload.
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: 'black' }}
    />
  );
};

export { cleanup as cleanupCosmos };
export default CosmosBackground;
