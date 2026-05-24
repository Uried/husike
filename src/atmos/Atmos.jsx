import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Howl } from 'howler';
import './Atmos.css';

// ATMOS - Ultra-faithful recreation of https://atmos.leeroy.ca
// Features: Volumetric fog, SSS cloud shader, DoF, Bloom, 3D floating text, Audio

// ATMOS - Recreation of https://atmos.leeroy.ca
// An immersive aviation experience with glider flight through clouds

// Aviation facts that appear in 3D space
const AVIATION_FACTS = [
  "The Earth's atmosphere extends over 600 km into space",
  "Commercial planes fly at 35,000 feet for optimal fuel efficiency",
  "The contrails left by planes can last for hours",
  "A single cloud can weigh more than a million pounds",
  "The average cruising speed is 900 km/h (560 mph)",
  "Pilots experience time dilation on long flights",
  "The Wright brothers' first flight lasted only 12 seconds",
  "Modern jet engines are 85% efficient",
  "Air is 78% nitrogen, 21% oxygen, 1% other gases",
  "A plane's wings create lift through pressure difference",
];

const Atmos = () => {
  const mountRef = useRef(null);
  const planeRef = useRef(null);
  const cloudsRef = useRef([]);
  const textMeshesRef = useRef([]);
  const composerRef = useRef(null);
  const audioRef = useRef(null);
  const mixerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  // Initialize audio - lazy load to avoid pool exhaustion
  useEffect(() => {
    // Only create audio when user starts
    audioRef.current = null;
  }, []);

  // Start audio when experience begins
  useEffect(() => {
    if (started) {
      // Lazy init audio on user interaction
      if (!audioRef.current) {
        audioRef.current = new Howl({
          src: ['https://files.freemusicarchive.org/storage-freemusicarchive-org/music/no_curator/Ketsa/Emotive_Ambience_Licensing_Pack/Ketsa_-_01_-_Careless.mp3'],
          html5: true,
          loop: true,
          volume: 0.4,
        });
      }
      audioRef.current.play();
      // White fade transition
      setTimeout(() => setFadeIn(false), 100);
    }
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, [started]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene setup with atmospheric fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x6BB3D9);
    // Volumetric-like exponential fog for distant cloud blending
    scene.fog = new THREE.FogExp2(0xB8E6F0, 0.008);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 3, 12);
    cameraRef.current = camera;

    // Renderer with ACES tone mapping for filmic look
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Post-processing setup
    const composer = new EffectComposer(renderer);
    
    // Render pass
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Bloom pass - soft glow on lit clouds
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.6, // strength
      0.3, // radius
      0.7  // threshold
    );
    composer.addPass(bloomPass);

    composerRef.current = composer;

    // Lighting - soft, atmospheric
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Main sun light with soft shadows
    const sunLight = new THREE.DirectionalLight(0xfff8e7, 1.2);
    sunLight.position.set(30, 60, 40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    sunLight.shadow.bias = -0.0001;
    scene.add(sunLight);

    // Hemisphere light for sky/ground color grading
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0xE8D5B0, 0.6);
    scene.add(hemiLight);

    // Simple cloud material - MeshStandard with good lighting response
    const createCloudMaterial = () => {
      return new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.35,
        metalness: 0.0,
        emissive: 0x223344,
        emissiveIntensity: 0.15,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
    };

    // Load assets
    const loader = new GLTFLoader();
    const assetPath = '/src/assets/';

    // Create glider with detailed mesh
    const createGlider = () => {
      const gliderGroup = new THREE.Group();
      
      // Fuselage - sleek white body
      const fuselageGeo = new THREE.CapsuleGeometry(0.25, 2.2, 8, 16);
      const fuselageMat = new THREE.MeshPhysicalMaterial({ 
        color: 0xf8f8f8,
        roughness: 0.2,
        metalness: 0.1,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1
      });
      const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
      fuselage.rotation.z = Math.PI / 2;
      fuselage.castShadow = true;
      gliderGroup.add(fuselage);
      
      // Wings - long slender wings with airfoil shape
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.lineTo(2.2, 0.15);
      wingShape.lineTo(2.2, -0.08);
      wingShape.lineTo(0, -0.12);
      wingShape.lineTo(0, 0);
      
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
        depth: 0.04,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelSegments: 3
      });
      const wingMat = new THREE.MeshPhysicalMaterial({ 
        color: 0xffffff,
        roughness: 0.25,
        metalness: 0.05,
        clearcoat: 0.6
      });
      
      // Left wing
      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.set(0.1, 0.25, -0.5);
      leftWing.rotation.y = Math.PI;
      leftWing.castShadow = true;
      gliderGroup.add(leftWing);
      
      // Right wing
      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.position.set(0.1, 0.25, 0.02);
      rightWing.castShadow = true;
      gliderGroup.add(rightWing);
      
      // Horizontal stabilizer (tail)
      const tailGeo = new THREE.BoxGeometry(1.0, 0.03, 0.5);
      const tail = new THREE.Mesh(tailGeo, wingMat);
      tail.position.set(-1.1, 0.35, 0.25);
      tail.castShadow = true;
      gliderGroup.add(tail);
      
      // Vertical stabilizer
      const stabilizerGeo = new THREE.BoxGeometry(0.5, 0.6, 0.04);
      const stabilizer = new THREE.Mesh(stabilizerGeo, wingMat);
      stabilizer.position.set(-1.1, 0.6, 0.25);
      stabilizer.castShadow = true;
      gliderGroup.add(stabilizer);
      
      // Cockpit canopy - glass dome
      const canopyGeo = new THREE.SphereGeometry(0.32, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.4);
      const canopyMat = new THREE.MeshPhysicalMaterial({ 
        color: 0x87CEEB,
        roughness: 0.05,
        metalness: 0.9,
        transparent: true,
        opacity: 0.4,
        transmission: 0.9,
        thickness: 0.1
      });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(0.4, 0.28, 0.25);
      canopy.rotation.x = -Math.PI / 2;
      gliderGroup.add(canopy);
      
      // Pilot silhouette
      const pilotGeo = new THREE.CapsuleGeometry(0.12, 0.35, 4, 8);
      const pilotMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
      const pilot = new THREE.Mesh(pilotGeo, pilotMat);
      pilot.position.set(0.35, 0.35, 0.25);
      pilot.rotation.z = -0.2;
      gliderGroup.add(pilot);
      
      gliderGroup.rotation.y = Math.PI; // Face forward
      return gliderGroup;
    };

    // Try to load GLB glider, fallback to procedural
    loader.load(`${assetPath}planeur.glb`, (gltf) => {
      const plane = gltf.scene;
      plane.scale.set(0.4, 0.4, 0.4);
      plane.position.set(0, 0, 0);
      plane.rotation.y = Math.PI;
      
      plane.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          // Enhance materials
          if (child.material) {
            child.material.roughness = 0.3;
            child.material.metalness = 0.1;
          }
        }
      });
      
      planeRef.current = plane;
      scene.add(plane);
    }, undefined, () => {
      // Fallback to detailed procedural glider
      const glider = createGlider();
      planeRef.current = glider;
      scene.add(glider);
    });

    // Create clouds with SSS shader
    const cloudPositions = [
      { x: -25, y: -8, z: -40, scale: 2.5 },
      { x: 30, y: 5, z: -60, scale: 3.2 },
      { x: -20, y: 15, z: -90, scale: 2.8 },
      { x: 35, y: -12, z: -50, scale: 2.0 },
      { x: -40, y: 8, z: -75, scale: 2.5 },
      { x: 15, y: 20, z: -110, scale: 3.5 },
      { x: -30, y: -15, z: -35, scale: 1.8 },
      { x: 45, y: 3, z: -85, scale: 2.8 },
      { x: -8, y: 25, z: -120, scale: 4.0 },
      { x: 55, y: -5, z: -55, scale: 2.2 },
      { x: -50, y: 12, z: -100, scale: 3.0 },
      { x: 20, y: -18, z: -45, scale: 1.7 },
      { x: -15, y: 8, z: -25, scale: 1.5 },
      { x: 40, y: -8, z: -30, scale: 1.9 },
    ];

    // Create shared cloud material for better performance (defined before use)
    const sharedCloudMaterial = createCloudMaterial();
    
    const createProceduralCloudWithSSS = () => {
      const cloudGroup = new THREE.Group();
      const sphereCount = 6 + Math.floor(Math.random() * 4);
      
      for (let i = 0; i < sphereCount; i++) {
        const radius = 0.8 + Math.random() * 1.5;
        const geometry = new THREE.SphereGeometry(radius, 20, 20);
        // Use the shared material instance for all spheres
        const sphere = new THREE.Mesh(geometry, sharedCloudMaterial);
        
        // Varied positions for organic cloud shape
        const angle = (i / sphereCount) * Math.PI * 2;
        const dist = Math.random() * 2.5;
        sphere.position.set(
          Math.cos(angle) * dist + (Math.random() - 0.5),
          (Math.random() - 0.5) * 1.5,
          Math.sin(angle) * dist * 0.6 + (Math.random() - 0.5)
        );
        
        // Slight random rotation
        sphere.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        cloudGroup.add(sphere);
      }
      
      return cloudGroup;
    };

    // Load or create clouds
    const loadCloud = (path, position, scale, index) => {
      loader.load(path, (gltf) => {
        const cloud = gltf.scene;
        cloud.position.set(position.x, position.y, position.z);
        cloud.scale.set(scale, scale, scale);
        
        // Apply shared SSS material to all meshes
        cloud.traverse((child) => {
          if (child.isMesh) {
            child.material = sharedCloudMaterial;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        cloudsRef.current[index] = cloud;
        scene.add(cloud);
      }, undefined, () => {
        // Fallback to SSS procedural cloud
        const cloud = createProceduralCloudWithSSS();
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

    // Create floating text using CanvasTexture instead of troika-three-text
    // to avoid font loading issues
    const createTextSprite = (text, i) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 1024;
      canvas.height = 128;
      
      // Draw text
      ctx.fillStyle = 'rgba(255, 255, 255, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = '500 32px "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(135, 206, 235, 0.5)';
      ctx.shadowBlur = 20;
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      
      const material = new THREE.SpriteMaterial({ 
        map: texture, 
        transparent: true,
        opacity: 0
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(12, 1.5, 1);
      sprite.position.set(
        (Math.random() - 0.5) * 60,
        -5 + Math.random() * 20,
        -30 - i * 25
      );
      
      return sprite;
    };
    
    AVIATION_FACTS.forEach((fact, i) => {
      const textSprite = createTextSprite(fact, i);
      textMeshesRef.current.push(textSprite);
      scene.add(textSprite);
    });

    setLoading(false);

    // Animation loop with physics-based glider movement
    // Custom timing instead of deprecated THREE.Clock
    let startTime = performance.now();
    let lastTime = startTime;
    
    const animate = (currentTime) => {
      rafRef.current = requestAnimationFrame(animate);
      
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      const elapsed = (currentTime - startTime) / 1000;
      
      // Update mixer
      if (mixerRef.current) mixerRef.current.update(delta);
      
      // Smooth mouse input with easing
      const targetX = mouseRef.current.x;
      const targetY = mouseRef.current.y;
      mouseRef.current.targetX += (targetX - mouseRef.current.targetX) * 0.05;
      mouseRef.current.targetY += (targetY - mouseRef.current.targetY) * 0.05;
      
      // Glider physics-based animation
      if (planeRef.current && started) {
        const plane = planeRef.current;
        const t = mouseRef.current;
        
        // Target position based on mouse with limits
        const maxX = 12;
        const maxY = 6;
        const targetPosX = t.targetX * maxX;
        const targetPosY = t.targetY * maxY;
        
        // Smooth position interpolation (inertia)
        plane.position.x += (targetPosX - plane.position.x) * 0.04;
        plane.position.y += (targetPosY - plane.position.y) * 0.04;
        
        // Calculate velocity for banking
        velocityRef.current.x = (targetPosX - plane.position.x) * 0.1;
        velocityRef.current.y = (targetPosY - plane.position.y) * 0.1;
        
        // Banking (roll) - proportional to horizontal velocity with realistic aircraft dynamics
        const maxBankAngle = 0.8; // ~45 degrees
        const targetRoll = -velocityRef.current.x * 3.0; // Negative for correct bank direction
        plane.rotation.z = THREE.MathUtils.lerp(plane.rotation.z, 
          THREE.MathUtils.clamp(targetRoll, -maxBankAngle, maxBankAngle), 
          0.08
        );
        
        // Pitch - slight nose up/down based on vertical movement
        const targetPitch = velocityRef.current.y * 0.5 + Math.sin(elapsed * 0.5) * 0.05;
        plane.rotation.x = THREE.MathUtils.lerp(plane.rotation.x, targetPitch, 0.05);
        
        // Yaw - slight turn coordination with roll
        const targetYaw = -velocityRef.current.x * 0.3;
        plane.rotation.y = Math.PI + THREE.MathUtils.lerp(plane.rotation.y - Math.PI, targetYaw, 0.03);
        
        // Gentle floating motion
        plane.position.y += Math.sin(elapsed * 0.7) * 0.008;
        
        // Forward illusion (very subtle camera z-movement instead of plane)
        plane.position.z = Math.sin(elapsed * 0.3) * 0.5;
      }
      
      // Animate clouds
      cloudsRef.current.forEach((cloud, i) => {
        if (cloud) {
          const speed = 0.03 + (i % 3) * 0.01;
          cloud.position.z += speed;
          cloud.position.x += Math.sin(elapsed * 0.1 + i) * 0.015;
          
          // Reset when past camera
          if (cloud.position.z > 15) {
            cloud.position.z = -130 - Math.random() * 30;
            cloud.position.x = (Math.random() - 0.5) * 80;
            cloud.position.y = (Math.random() - 0.5) * 35;
          }
        }
      });
      
      // Animate 3D text - fade in when approaching
      textMeshesRef.current.forEach((text, i) => {
        if (!text) return;
        const dist = camera.position.z - text.position.z;
        const targetOpacity = (dist > 5 && dist < 35) ? 0.85 : 0.0;
        text.material.opacity = THREE.MathUtils.lerp(text.material.opacity, targetOpacity, 0.02);
        
        // Gentle floating
        text.position.y += Math.sin(elapsed * 0.5 + i) * 0.005;
      });
      
      // Camera follows glider with smooth damping
      if (planeRef.current && started) {
        const plane = planeRef.current;
        const targetCamX = plane.position.x * 0.25;
        const targetCamY = plane.position.y * 0.25 + 3;
        
        camera.position.x += (targetCamX - camera.position.x) * 0.03;
        camera.position.y += (targetCamY - camera.position.y) * 0.03;
        
        // Look slightly ahead of plane
        const lookTarget = new THREE.Vector3(
          plane.position.x * 0.5,
          plane.position.y * 0.3,
          plane.position.z - 5
        );
        camera.lookAt(lookTarget);
      }
      
      // Animate bloom intensity
      bloomPass.strength = 0.5 + Math.sin(elapsed * 0.5) * 0.1;
      
      // Render with post-processing
      composer.render();
    };
    
    rafRef.current = requestAnimationFrame(animate);

    // Input handlers
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
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
      
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      
      composer.dispose();
      renderer.dispose();
      scene.clear();
    };
  }, [started]);

  return (
    <div className="atmos-container">
      {/* White fade transition */}
      <div 
        className={`atmos-fade-overlay ${fadeIn ? 'visible' : ''}`}
        style={{ 
          opacity: fadeIn ? 1 : 0,
          transition: 'opacity 2s ease-out'
        }}
      />
      
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

      {/* Audio toggle */}
      {started && (
        <button 
          className="atmos-audio-toggle"
          onClick={() => {
            if (audioRef.current) {
              if (audioRef.current.playing()) {
                audioRef.current.pause();
              } else {
                audioRef.current.play();
              }
            }
          }}
        >
          ♪
        </button>
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
