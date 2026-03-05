import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';

const JewelryScene = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);

    // Scene + camera
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const spotLight = new THREE.SpotLight(0xffd700, 2.5);
    spotLight.position.set(6, 8, 6);
    spotLight.angle    = 0.18;
    spotLight.penumbra = 0.8;
    spotLight.castShadow = true;
    scene.add(spotLight);

    const fillLight = new THREE.PointLight(0xd4af37, 1.2, 20);
    fillLight.position.set(-5, -4, -5);
    scene.add(fillLight);

    const rimLight  = new THREE.PointLight(0xffffff, 0.6, 15);
    rimLight.position.set(0, 5, -4);
    scene.add(rimLight);

    // TorusKnot jewel
    const knotGeo = new THREE.TorusKnotGeometry(1, 0.28, 180, 20);
    const knotMat = new THREE.MeshStandardMaterial({
      color:            new THREE.Color('#D4AF37'),
      emissive:         new THREE.Color('#7a5c10'),
      emissiveIntensity: 0.35,
      metalness: 0.9,
      roughness: 0.15,
    });
    const knot = new THREE.Mesh(knotGeo, knotMat);
    knot.scale.setScalar(1.5);
    knot.castShadow = true;
    scene.add(knot);

    // Floating particle ring around the knot
    const ringPts = [];
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const r = 2.4 + Math.random() * 0.5;
      ringPts.push(Math.cos(a) * r, (Math.random() - 0.5) * 0.5, Math.sin(a) * r);
    }
    const ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(ringPts, 3));
    const ringMat = new THREE.PointsMaterial({
      color: 0xd4af37, size: 0.03, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(new THREE.Points(ringGeo, ringMat));

    // OrbitControls — auto-rotate, no zoom
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom    = false;
    controls.enablePan     = false;
    controls.autoRotate    = true;
    controls.autoRotateSpeed = 0.6;
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;

    // Resize
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Animate
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = Date.now() * 0.001;
      knot.rotation.y += 0.008;
      knot.rotation.z += 0.004;
      knot.position.y  = Math.sin(t * 0.8) * 0.12;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Entrance
    gsap.fromTo(renderer.domElement, { opacity: 0 }, { opacity: 1, duration: 1.5 });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      knotGeo.dispose();
      knotMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-[400px] sm:h-[500px] cursor-grab active:cursor-grabbing"
    />
  );
};

export default JewelryScene;
