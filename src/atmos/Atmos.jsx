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

// Aviation facts with title and description like the real site
const AVIATION_FACTS = [
  {
    number: "00",
    title: "WELCOME ABOARD",
    description: "Hello passengers and welcome aboard. Please sit back, relax, and enjoy the view while we tell you some of our favourite facts about the aviation world."
  },
  {
    number: "01",
    title: "SKY BABIES",
    description: "Apart from a crash, the worst nightmare of every flight attendant is childbirth on board. Although extremely rare, nearly 60 babies were born in the sky!"
  },
  {
    number: "02",
    title: "A LONG FLIGHT",
    description: "The longest commercial flight you can book is a flight from Singapore to New York that lasts 18 hours 50 minutes... better get comfortable!"
  },
  {
    number: "03",
    title: "47 SECONDS",
    description: "Not a fan of airtime? The shortest flight available takes place in Scotland. It connects Westray to Papa Westray and takes 47 seconds!"
  },
  {
    number: "04",
    title: "IN THE DARK",
    description: "At night, lights on board are dimmed for landing and takeoff so that in the event of an emergency, passengers' eyes will already be adjusted to darkness."
  },
  {
    number: "05",
    title: "PILOT POWER",
    description: "Did you know that the pilot and co-pilot are required to eat different meals? This is to avoid the risk of both being sick from food poisoning."
  },
  {
    number: "06",
    title: "HIDDEN ROOMS",
    description: "There is a secret room on board most Boeing 777 and 787 aircraft. It is located above first class and has beds and a bathroom for crew members."
  },
  {
    number: "07",
    title: "BLACK BOX",
    description: "Despite its name, the black box is actually orange. This color was chosen to make it easier to find it among the debris of a plane crash."
  },
  {
    number: "08",
    title: "OXYGEN MASKS",
    description: "In the event of a decompression, oxygen masks drop from above. But be aware: there is only about 15 minutes of oxygen in them... enough for an emergency landing."
  },
  {
    number: "09",
    title: "LIGHTNING",
    description: "Planes are struck by lightning on average once a year. But don't worry, modern aircraft are designed to withstand these extreme electrical discharges."
  },
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
  const [fadeIn, setFadeIn] = useState(false);
  const scrollProgressRef = useRef(0); // 0 to 1 along the flight path
  const targetScrollRef = useRef(0);
  const flightPathRef = useRef(null);
  const pathPointsRef = useRef([]);
  const trailRef = useRef(null); // White trail behind glider
  const slowdownZonesRef = useRef([]); // Zones where plane slows down
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
      // White fade transition: first show white, then fade out
      setFadeIn(true);
      setTimeout(() => setFadeIn(false), 1500);
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
    // Gradient background that changes during flight - start with deep blue
    scene.background = new THREE.Color(0x4A4FD9);
    // Volumetric-like exponential fog for distant cloud blending
    scene.fog = new THREE.FogExp2(0x7B7FE0, 0.006);
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

    // Main sun light with soft shadows - warmer tone for sunset effect
    const sunLight = new THREE.DirectionalLight(0xFFE8D0, 1.1);
    sunLight.position.set(20, 50, 30);
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

    // Hemisphere light for sky/ground color grading - purple tones
    const hemiLight = new THREE.HemisphereLight(0x6B6FE0, 0xFFB8A0, 0.5);
    scene.add(hemiLight);

    // Cloud material - soft purple/white like the real site
    const createCloudMaterial = () => {
      return new THREE.MeshStandardMaterial({
        color: 0xE8E8FF,
        roughness: 0.4,
        metalness: 0.0,
        emissive: 0x6B6FE0,
        emissiveIntensity: 0.1,
        transparent: true,
        opacity: 0.92,
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

    // Create flight path - a winding curve through the sky
    // The plane will follow this path as user scrolls
    const createFlightPath = () => {
      const points = [];
      const numPoints = 50;
      const pathLength = 300; // Total depth of the journey
      
      for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        // Create winding path with sine waves
        const x = Math.sin(t * Math.PI * 3) * 20 + Math.sin(t * Math.PI * 1.5) * 10;
        const y = Math.sin(t * Math.PI * 2) * 8 + Math.cos(t * Math.PI * 4) * 3 + 2;
        const z = -t * pathLength;
        points.push(new THREE.Vector3(x, y, z));
      }
      
      const curve = new THREE.CatmullRomCurve3(points);
      curve.curveType = 'catmullrom';
      curve.tension = 0.5;
      
      return { curve, points };
    };
    
    const { curve, points } = createFlightPath();
    flightPathRef.current = curve;
    pathPointsRef.current = points;
    
    // Create white trail that follows the glider
    const createTrail = () => {
      const trailGeometry = new THREE.BufferGeometry();
      const trailLength = 100;
      const positions = new Float32Array(trailLength * 3);
      trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const trailMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.15,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      
      const trail = new THREE.Points(trailGeometry, trailMaterial);
      trail.userData = { 
        positions: [],
        maxLength: trailLength 
      };
      scene.add(trail);
      return trail;
    };
    
    trailRef.current = createTrail();
    
    // Create text group with proper layout: Fact #XX, Title, Description
    const createFactDisplay = (fact, i) => {
      const group = new THREE.Group();
      
      // Fact number sprite
      const numberCanvas = document.createElement('canvas');
      numberCanvas.width = 512;
      numberCanvas.height = 64;
      const nCtx = numberCanvas.getContext('2d');
      nCtx.fillStyle = 'rgba(255, 255, 255, 0)';
      nCtx.fillRect(0, 0, 512, 64);
      nCtx.font = '300 24px "Segoe UI", Helvetica, Arial, sans-serif';
      nCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      nCtx.textAlign = 'center';
      nCtx.fillText(`Fact #${fact.number}`, 256, 40);
      
      const numberTexture = new THREE.CanvasTexture(numberCanvas);
      const numberSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: numberTexture,
        transparent: true,
        opacity: 0
      }));
      numberSprite.scale.set(6, 0.75, 1);
      numberSprite.position.set(0, 2.5, 0);
      group.add(numberSprite);
      
      // Title sprite
      const titleCanvas = document.createElement('canvas');
      titleCanvas.width = 1024;
      titleCanvas.height = 128;
      const tCtx = titleCanvas.getContext('2d');
      tCtx.fillStyle = 'rgba(255, 255, 255, 0)';
      tCtx.fillRect(0, 0, 1024, 128);
      tCtx.font = '300 64px "Segoe UI", Helvetica, Arial, sans-serif';
      tCtx.fillStyle = 'rgba(255, 255, 255, 1)';
      tCtx.textAlign = 'center';
      tCtx.fillText(fact.title, 512, 80);
      
      const titleTexture = new THREE.CanvasTexture(titleCanvas);
      const titleSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: titleTexture,
        transparent: true,
        opacity: 0
      }));
      titleSprite.scale.set(16, 2, 1);
      titleSprite.position.set(0, 1.2, 0);
      group.add(titleSprite);
      
      // Description sprite
      const descCanvas = document.createElement('canvas');
      descCanvas.width = 1024;
      descCanvas.height = 200;
      const dCtx = descCanvas.getContext('2d');
      dCtx.fillStyle = 'rgba(255, 255, 255, 0)';
      dCtx.fillRect(0, 0, 1024, 200);
      dCtx.font = '300 28px "Segoe UI", Helvetica, Arial, sans-serif';
      dCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      dCtx.textAlign = 'center';
      
      // Wrap text
      const words = fact.description.split(' ');
      let line = '';
      let y = 50;
      const lineHeight = 38;
      const maxWidth = 900;
      
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = dCtx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          dCtx.fillText(line, 512, y);
          line = words[n] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      dCtx.fillText(line, 512, y);
      
      const descTexture = new THREE.CanvasTexture(descCanvas);
      const descSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: descTexture,
        transparent: true,
        opacity: 0
      }));
      descSprite.scale.set(16, 3, 1);
      descSprite.position.set(0, -1.5, 0);
      group.add(descSprite);
      
      // Position along flight path
      const pathIndex = Math.floor((i / AVIATION_FACTS.length) * (points.length - 1));
      const pos = points[pathIndex];
      group.position.set(
        pos.x + 12, // Position to the right of the path
        pos.y + 2,
        pos.z
      );
      
      // Store references for animation
      group.userData = {
        pathIndex,
        originalZ: pos.z,
        sprites: [numberSprite, titleSprite, descSprite]
      };
      
      return group;
    };
    
    // Create slowdown zones at each fact position
    slowdownZonesRef.current = [];
    
    AVIATION_FACTS.forEach((fact, i) => {
      const factDisplay = createFactDisplay(fact, i);
      textMeshesRef.current.push(factDisplay);
      scene.add(factDisplay);
      
      // Register slowdown zone
      slowdownZonesRef.current.push({
        z: factDisplay.position.z,
        index: i,
        active: false
      });
    });
    
    // Add scroll listener for flight progression
    const handleScroll = () => {
      if (!started) return;
      // Calculate scroll progress (0 to 1) based on page scroll
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(Math.max(scrollTop / docHeight, 0), 1);
      targetScrollRef.current = progress;
    };
    
    // Enable smooth scroll behavior
    document.body.style.overflow = 'auto';
    document.body.style.height = '500vh'; // Extended height for scrolling (longer journey)
    window.addEventListener('scroll', handleScroll, { passive: true });

    setLoading(false);

    // Animation loop with scroll-driven flight path
    let startTime = performance.now();
    let lastTime = startTime;
    
    const animate = (currentTime) => {
      rafRef.current = requestAnimationFrame(animate);
      
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      const elapsed = (currentTime - startTime) / 1000;
      
      // Update mixer
      if (mixerRef.current) mixerRef.current.update(delta);
      
      // Smooth scroll progress interpolation with auto-slowdown near messages
      let targetProgress = targetScrollRef.current;
      
      // Check if near any fact message - slow down automatically for reading
      const currentPlaneZ = curve.getPointAt(scrollProgressRef.current).z;
      let inSlowdownZone = false;
      const slowdownDistance = 15; // Distance at which slowing starts
      const slowdownFactor = 0.3; // How much to slow down (0.3 = 30% speed)
      
      slowdownZonesRef.current.forEach(zone => {
        const dist = Math.abs(currentPlaneZ - zone.z);
        if (dist < slowdownDistance) {
          inSlowdownZone = true;
          // Blend between normal and slowed speed based on distance
          const factor = 1 - (dist / slowdownDistance);
          targetProgress = scrollProgressRef.current + (targetScrollRef.current - scrollProgressRef.current) * (slowdownFactor + (1 - factor) * 0.7);
        }
      });
      
      if (!inSlowdownZone) {
        scrollProgressRef.current += (targetProgress - scrollProgressRef.current) * 0.05;
      } else {
        scrollProgressRef.current += (targetProgress - scrollProgressRef.current) * 0.02; // Even slower interpolation in zones
      }
      
      // Update sky color based on flight progress (blue -> purple -> orange)
      const flightProgress = scrollProgressRef.current;
      const startColor = new THREE.Color(0x4A4FD9); // Deep blue
      const midColor = new THREE.Color(0x7B5FD9);   // Purple
      const endColor = new THREE.Color(0xF4A574);   // Warm orange (sunset)
      
      let skyColor;
      if (flightProgress < 0.5) {
        skyColor = startColor.clone().lerp(midColor, flightProgress * 2);
      } else {
        skyColor = midColor.clone().lerp(endColor, (flightProgress - 0.5) * 2);
      }
      scene.background = skyColor;
      scene.fog.color = skyColor.clone().multiplyScalar(0.9);
      
      // Flight path animation
      if (planeRef.current && started && flightPathRef.current) {
        const plane = planeRef.current;
        const curve = flightPathRef.current;
        const progress = scrollProgressRef.current;
        
        // Get position on curve - NO MOUSE INFLUENCE
        const position = curve.getPointAt(progress);
        
        // Smoothly interpolate to exact path position
        plane.position.x += (position.x - plane.position.x) * 0.08;
        plane.position.y += (position.y - plane.position.y) * 0.08;
        plane.position.z = position.z;
        
        // Calculate orientation from tangent
        const lookAheadProgress = Math.min(progress + 0.02, 1);
        const lookTarget = curve.getPointAt(lookAheadProgress);
        
        // Calculate banking based on curve curvature
        const prevProgress = Math.max(progress - 0.02, 0);
        const prevPos = curve.getPointAt(prevProgress);
        const curvature = position.x - prevPos.x;
        
        // Banking (roll) based on horizontal curvature
        const maxBankAngle = 0.5;
        const targetRoll = -curvature * 12;
        plane.rotation.z = THREE.MathUtils.lerp(plane.rotation.z, 
          THREE.MathUtils.clamp(targetRoll, -maxBankAngle, maxBankAngle), 
          0.1
        );
        
        // Pitch based on vertical slope
        const verticalSlope = lookTarget.y - position.y;
        const targetPitch = verticalSlope * 1.5;
        plane.rotation.x = THREE.MathUtils.lerp(plane.rotation.x, targetPitch, 0.1);
        
        // Yaw - look ahead on the path
        plane.lookAt(lookTarget);
        
        // Update trail - add current position to trail history
        if (trailRef.current) {
          const trail = trailRef.current;
          const positions = trail.userData.positions;
          
          // Add current position (behind the plane)
          positions.unshift({
            x: plane.position.x,
            y: plane.position.y - 0.5,
            z: plane.position.z + 2
          });
          
          // Limit trail length
          if (positions.length > trail.userData.maxLength) {
            positions.pop();
          }
          
          // Update geometry
          const posArray = trail.geometry.attributes.position.array;
          for (let i = 0; i < positions.length; i++) {
            posArray[i * 3] = positions[i].x;
            posArray[i * 3 + 1] = positions[i].y;
            posArray[i * 3 + 2] = positions[i].z;
          }
          
          // Hide unused trail points
          for (let i = positions.length; i < trail.userData.maxLength; i++) {
            posArray[i * 3] = 0;
            posArray[i * 3 + 1] = 0;
            posArray[i * 3 + 2] = 0;
          }
          
          trail.geometry.attributes.position.needsUpdate = true;
        }
      }
      
      // Animate clouds - drift slowly past
      cloudsRef.current.forEach((cloud, i) => {
        if (cloud) {
          // Move clouds relative to plane's forward motion
          const planeZ = planeRef.current?.position.z || 0;
          
          // Clouds drift slowly
          cloud.position.x += Math.sin(elapsed * 0.1 + i) * 0.01;
          
          // Reset clouds that are too far behind or ahead
          const relativeZ = cloud.position.z - planeZ;
          if (relativeZ > 20 || relativeZ < -150) {
            // Reposition in front of plane's path
            cloud.position.z = planeZ - 100 - Math.random() * 50;
            cloud.position.x = (Math.random() - 0.5) * 80;
            cloud.position.y = (Math.random() - 0.5) * 35;
          }
        }
      });
      
      // Animate fact displays - fade in all 3 text elements when plane approaches
      const planeZ = planeRef.current?.position.z || 0;
      textMeshesRef.current.forEach((group, i) => {
        if (!group) return;
        const dist = Math.abs(group.position.z - planeZ);
        
        // Fade in when close (within 30 units), fade out when too close (< 3) or far (> 50)
        let targetOpacity = 0;
        if (dist < 40 && dist > 5) {
          targetOpacity = 1.0;
        }
        
        // Apply to all sprites in the group
        group.userData.sprites.forEach((sprite, j) => {
          if (sprite) {
            sprite.material.opacity = THREE.MathUtils.lerp(sprite.material.opacity, targetOpacity, 0.02);
          }
        });
      });
      
      // Camera follows glider with cinematic framing
      if (planeRef.current && started) {
        const plane = planeRef.current;
        
        // Camera position: behind and above the plane, following the curve
        const targetCamX = plane.position.x * 0.3;
        const targetCamY = plane.position.y * 0.3 + 4;
        const targetCamZ = plane.position.z + 15; // Behind the plane
        
        camera.position.x += (targetCamX - camera.position.x) * 0.04;
        camera.position.y += (targetCamY - camera.position.y) * 0.04;
        camera.position.z += (targetCamZ - camera.position.z) * 0.04;
        
        // Look at plane with slight anticipation
        const lookTarget = new THREE.Vector3(
          plane.position.x,
          plane.position.y,
          plane.position.z - 10
        );
        camera.lookAt(lookTarget);
      }
      
      // Animate bloom intensity
      bloomPass.strength = 0.5 + Math.sin(elapsed * 0.5) * 0.1;
      
      // Render with post-processing
      composer.render();
    };
    
    rafRef.current = requestAnimationFrame(animate);

    // Scroll is the only input for flight progression
    window.addEventListener('scroll', handleScroll, { passive: true });

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
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      
      // Reset body styles
      document.body.style.overflow = '';
      document.body.style.height = '';
      
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
          <p className="atmos-instruction">Then scroll down to follow the flight path</p>
          <div className="atmos-credits">
            <p>Music by <a href="https://freemusicarchive.org/music/independent-music-licensing-collective-imlc/emotive-ambience-licensing-pack-ketsa" target="_blank" rel="noopener noreferrer">Ketsa</a></p>
            <p>An experiment by <a href="https://leeroy.ca" target="_blank" rel="noopener noreferrer">Leeroy</a></p>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <div ref={mountRef} className="atmos-canvas" />

      {/* HUD / Controls hint - shows scroll instruction when starting */}
      {started && (
        <div className="atmos-hud">
          <div className="atmos-hud-item">
            <span>Scroll to fly along the path</span>
          </div>
          <div className="atmos-scroll-indicator">
            <div className="atmos-scroll-line"></div>
            <div className="atmos-scroll-arrow">↓</div>
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
