import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import './Atmos.css';

// ATMOS - Recreation of https://atmos.leeroy.ca
// An immersive aviation experience with glider flight through clouds

const Atmos = () => {
  const mountRef = useRef(null);
  const planeRef = useRef(null);
  const cloudsRef = useRef([]);
  const mixerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 20, 100);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 15);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
    sunLight.position.set(50, 100, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0xffffff, 0.4);
    scene.add(hemiLight);

    // Load assets
    const loader = new GLTFLoader();
    const assetPath = '/src/assets/';

    // Load glider
    loader.load(`${assetPath}planeur.glb`, (gltf) => {
      const plane = gltf.scene;
      plane.scale.set(0.5, 0.5, 0.5);
      plane.position.set(0, 0, 0);
      plane.rotation.y = Math.PI;
      
      // Add shadow casting
      plane.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      planeRef.current = plane;
      scene.add(plane);
      
      // Animation mixer
      if (gltf.animations.length > 0) {
        mixerRef.current = new THREE.AnimationMixer(plane);
        gltf.animations.forEach((clip) => {
          mixerRef.current.clipAction(clip).play();
        });
      }
    }, undefined, (error) => {
      // Create a simple glider if model fails
      const gliderGroup = new THREE.Group();
      
      // Fuselage
      const fuselageGeo = new THREE.CapsuleGeometry(0.3, 2, 4, 8);
      const fuselageMat = new THREE.MeshStandardMaterial({ 
        color: 0xf5f5f5,
        roughness: 0.4,
        metalness: 0.1
      });
      const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
      fuselage.rotation.z = Math.PI / 2;
      fuselage.castShadow = true;
      gliderGroup.add(fuselage);
      
      // Wings
      const wingGeo = new THREE.BoxGeometry(4, 0.1, 0.8);
      const wingMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.05
      });
      const wings = new THREE.Mesh(wingGeo, wingMat);
      wings.position.set(0.2, 0.3, 0);
      wings.castShadow = true;
      gliderGroup.add(wings);
      
      // Tail
      const tailGeo = new THREE.BoxGeometry(1.2, 0.08, 0.6);
      const tail = new THREE.Mesh(tailGeo, wingMat);
      tail.position.set(-1.2, 0.4, 0);
      tail.castShadow = true;
      gliderGroup.add(tail);
      
      // Vertical stabilizer
      const stabilizerGeo = new THREE.BoxGeometry(0.6, 0.8, 0.08);
      const stabilizer = new THREE.Mesh(stabilizerGeo, wingMat);
      stabilizer.position.set(-1.2, 0.6, 0);
      stabilizer.castShadow = true;
      gliderGroup.add(stabilizer);
      
      // Cockpit
      const cockpitGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const cockpitMat = new THREE.MeshStandardMaterial({ 
        color: 0x87CEEB,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.7
      });
      const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
      cockpit.position.set(0.3, 0.2, 0);
      gliderGroup.add(cockpit);
      
      gliderGroup.rotation.y = Math.PI;
      planeRef.current = gliderGroup;
      scene.add(gliderGroup);
    });

    // Load and create clouds
    const cloudInstances = [];
    const cloudPositions = [
      { x: -20, y: -5, z: -30, scale: 2 },
      { x: 25, y: 8, z: -50, scale: 3 },
      { x: -15, y: 12, z: -80, scale: 2.5 },
      { x: 30, y: -8, z: -40, scale: 1.8 },
      { x: -35, y: 5, z: -60, scale: 2.2 },
      { x: 10, y: 15, z: -90, scale: 3.5 },
      { x: -25, y: -10, z: -25, scale: 1.5 },
      { x: 40, y: 3, z: -70, scale: 2.8 },
      { x: -5, y: 20, z: -100, scale: 4 },
      { x: 50, y: -3, z: -45, scale: 2 },
      { x: -45, y: 10, z: -85, scale: 3 },
      { x: 15, y: -12, z: -35, scale: 1.6 },
    ];

    // Create procedural clouds as fallback
    const createProceduralCloud = () => {
      const cloudGroup = new THREE.Group();
      const sphereCount = 5 + Math.random() * 5;
      
      for (let i = 0; i < sphereCount; i++) {
        const radius = 1 + Math.random() * 2;
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.9,
          metalness: 0,
          transparent: true,
          opacity: 0.85
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 3
        );
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        cloudGroup.add(sphere);
      }
      
      return cloudGroup;
    };

    // Try to load GLB clouds, fallback to procedural
    const loadCloud = (path, position, scale, index) => {
      loader.load(path, (gltf) => {
        const cloud = gltf.scene;
        cloud.position.set(position.x, position.y, position.z);
        cloud.scale.set(scale, scale, scale);
        
        cloud.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xffffff,
              roughness: 0.9,
              metalness: 0,
              transparent: true,
              opacity: 0.9
            });
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        cloudsRef.current[index] = cloud;
        scene.add(cloud);
      }, undefined, () => {
        // Fallback to procedural cloud
        const cloud = createProceduralCloud();
        cloud.position.set(position.x, position.y, position.z);
        cloud.scale.set(scale, scale, scale);
        cloudsRef.current[index] = cloud;
        scene.add(cloud);
      });
    };

    cloudPositions.forEach((pos, i) => {
      const cloudPath = i % 2 === 0 ? `${assetPath}cloud_11.glb` : `${assetPath}cloud_22.glb`;
      loadCloud(cloudPath, pos, pos.scale, i);
    });

    setLoading(false);

    // Animation loop
    let animationId;
    const clock = new THREE.Clock();
    
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      
      // Update mixer
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }
      
      // Animate plane with mouse influence
      if (planeRef.current && started) {
        const plane = planeRef.current;
        
        // Smooth mouse following
        const targetX = mouseRef.current.x * 8;
        const targetY = mouseRef.current.y * 4;
        
        plane.position.x += (targetX - plane.position.x) * 0.03;
        plane.position.y += (targetY - plane.position.y) * 0.03;
        
        // Banking (roll) based on horizontal movement
        const bankAngle = (plane.position.x - targetX) * 0.1;
        plane.rotation.z = bankAngle;
        
        // Pitch based on vertical movement
        const pitchAngle = (targetY - plane.position.y) * 0.05;
        plane.rotation.x = pitchAngle;
        
        // Constant forward motion illusion
        plane.position.z += Math.sin(time * 0.5) * 0.02;
        
        // Gentle floating
        plane.position.y += Math.sin(time * 0.8) * 0.005;
      }
      
      // Animate clouds - slow drift
      cloudsRef.current.forEach((cloud, i) => {
        if (cloud) {
          cloud.position.x += Math.sin(time * 0.1 + i) * 0.02;
          cloud.position.z += 0.05; // Move toward camera
          
          // Reset cloud position when it passes camera
          if (cloud.position.z > 20) {
            cloud.position.z = -120;
            cloud.position.x = (Math.random() - 0.5) * 80;
            cloud.position.y = (Math.random() - 0.5) * 30;
          }
          
          // Gentle rotation
          cloud.rotation.y += 0.001;
        }
      });
      
      // Camera follows plane smoothly
      if (planeRef.current && started) {
        const targetCamX = planeRef.current.position.x * 0.3;
        const targetCamY = planeRef.current.position.y * 0.3 + 5;
        
        camera.position.x += (targetCamX - camera.position.x) * 0.05;
        camera.position.y += (targetCamY - camera.position.y) * 0.05;
        camera.lookAt(planeRef.current.position);
      }
      
      renderer.render(scene, camera);
    };
    
    animate();

    // Mouse/touch handlers
    const handleMouseMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        mouseRef.current.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        mouseRef.current.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
      
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
      scene.clear();
    };
  }, [started]);

  return (
    <div className="atmos-container">
      {/* Loading Screen */}
      {loading && (
        <div className="atmos-loading">
          <div className="atmos-spinner"></div>
          <p>Preparing for takeoff...</p>
        </div>
      )}

      {/* Start Screen */}
      {!started && !loading && (
        <div className="atmos-start-screen">
          <div className="atmos-logo">
            <span className="atmos-letter">A</span>
            <span className="atmos-letter">T</span>
            <span className="atmos-letter">M</span>
            <span className="atmos-letter">O</span>
            <span className="atmos-letter">S</span>
          </div>
          <p className="atmos-tagline">Get on board and discover the most surreal facts about the aviation industry</p>
          <button className="atmos-start-btn" onClick={() => setStarted(true)}>
            <span>Board Now</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="atmos-credits">
            <p>Music by <a href="https://freemusicarchive.org/music/independent-music-licensing-collective-imlc/emotive-ambience-licensing-pack-ketsa" target="_blank" rel="noopener noreferrer">Ketsa</a></p>
            <p>An experiment by <a href="https://leeroy.ca" target="_blank" rel="noopener noreferrer">Leeroy</a></p>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <div ref={mountRef} className="atmos-canvas" />

      {/* HUD / Controls hint */}
      {started && (
        <div className="atmos-hud">
          <div className="atmos-hud-item">
            <span>Move mouse to fly</span>
          </div>
        </div>
      )}

      {/* End Screen */}
      {started && (
        <div className="atmos-end-screen" style={{ opacity: 0, pointerEvents: 'none' }}>
          <h2>Thank you for flying with Atmos</h2>
          <p>We hope to see you again very soon</p>
        </div>
      )}
    </div>
  );
};

export default Atmos;
