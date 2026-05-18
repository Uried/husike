import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { getDailyMood } from './DailyMood';

/* ── Portal ring SVG ── */
const PortalRing = ({ progress, listening, color }) => {
  const r = 80;
  const circ = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 200 200" className="absolute w-full h-full top-0 left-0 pointer-events-none">
      <defs>
        <radialGradient id="portal-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity={listening ? 0.3 : 0.1}/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </radialGradient>
        <filter id="portal-blur">
          <feGaussianBlur stdDeviation={listening ? 4 : 2}/>
        </filter>
      </defs>
      {/* Glow fill */}
      <circle cx="100" cy="100" r={r} fill="url(#portal-glow)"/>
      {/* Base ring */}
      <circle cx="100" cy="100" r={r} fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.12"/>
      {/* Progress arc */}
      <circle cx="100" cy="100" r={r} fill="none"
        stroke={color} strokeWidth={listening ? 1.5 : 1} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '100px 100px', transition: 'stroke-dashoffset 0.4s ease, stroke-width 0.3s' }}
        filter={listening ? 'url(#portal-blur)' : undefined}
      />
      {/* Inner rings */}
      {[55, 35].map((ir, i) => (
        <circle key={i} cx="100" cy="100" r={ir} fill="none"
          stroke={color} strokeWidth="0.4"
          strokeOpacity={0.06 + progress * 0.14 * (i + 1)}/>
      ))}
    </svg>
  );
};

const Scene1Opening = ({ data, onNext }) => {
  const mountRef      = useRef(null);
  const overlayRef    = useRef(null);
  const phase1Ref     = useRef(null);   // whisper phase
  const phase2Ref     = useRef(null);   // code entry phase
  const phase3Ref     = useRef(null);   // unlocked phase
  const voiceRef      = useRef(null);
  const codePromptRef = useRef(null);
  const portalWrapRef = useRef(null);
  const micBtnRef     = useRef(null);
  const inputRef      = useRef(null);
  const inputWrapRef  = useRef(null);
  const hintRef       = useRef(null);
  const errorRef      = useRef(null);
  const unlockTextRef = useRef(null);
  const particlesRef  = useRef(null);
  const breathRingRef = useRef(null);

  const [micState, setMicState]           = useState('idle');
  const [inputValue, setInputValue]       = useState('');
  const [portalProgress, setPortalProgress] = useState(0);
  const [listening, setListening]         = useState(false);

  const name           = data?.recipientName  || 'Toi';
  const secretNickname = (data?.secretNickname || 'mon coeur').toLowerCase().trim();
  // Voice challenge: "Ma chérie Emma… si c'est bien toi, dis-moi notre code secret…"
  const voiceLine      = data?.voiceLine
    || `Ma chérie ${name}… si c'est bien toi… c'est quoi notre code secret à nous deux ?`;
  const mood           = getDailyMood();

  /* ── Three.js: breathing particle nebula ── */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, mount.clientWidth / mount.clientHeight, 0.1, 500);
    camera.position.z = 3;

    const COUNT = 600;
    const positions = new Float32Array(COUNT * 3);
    const scales    = new Float32Array(COUNT);
    const phases    = new Float32Array(COUNT);
    const radii     = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const theta  = Math.random() * Math.PI * 2;
      const phi    = Math.acos(2 * Math.random() - 1);
      const r      = 0.5 + Math.random() * 2.5;
      radii[i]     = r;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      scales[i]  = 0.2 + Math.random() * 0.6;
      phases[i]  = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aScale',   new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aPhase',   new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:       { value: 0 },
        uProgress:   { value: 0 },
        uPrimaryColor: { value: new THREE.Color(mood.primaryColor) },
        uAccentColor:  { value: new THREE.Color(mood.accentColor) },
      },
      vertexShader: `
        attribute float aScale;
        attribute float aPhase;
        uniform float uTime;
        uniform float uProgress;
        varying float vBrightness;
        varying float vMix;
        void main() {
          float breathe = sin(uTime * 0.8 + aPhase) * 0.15 * uProgress;
          vec3 pos = position * (1.0 + breathe);
          vBrightness = 0.4 + 0.6 * sin(uTime * 1.2 + aPhase);
          vMix = fract(aPhase / (3.14159 * 2.0));
          gl_PointSize = aScale * (1.0 + 0.3 * sin(uTime + aPhase)) * (120.0 / -(modelViewMatrix * vec4(pos, 1.0)).z);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uPrimaryColor;
        uniform vec3 uAccentColor;
        varying float vBrightness;
        varying float vMix;
        void main() {
          float d = distance(gl_PointCoord, vec2(0.5));
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d) * vBrightness * 0.35;
          vec3 col = mix(uPrimaryColor, uAccentColor, vMix * 0.4);
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // Central glow sphere
    const glowGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(mood.primaryColor),
      transparent: true, opacity: 0,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glow);

    const orbLight = new THREE.PointLight(new THREE.Color(mood.primaryColor), 0, 8);
    scene.add(orbLight);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    let mouseX = 0, mouseY = 0;
    const onMouse = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5);
      mouseY = (e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('mousemove', onMouse);

    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = Date.now() * 0.001;
      mat.uniforms.uTime.value = t;
      points.rotation.y += 0.0008;
      points.rotation.x += 0.0003;
      camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.02;
      camera.position.y += (-mouseY * 1.2 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);
      const pulse = 1 + Math.sin(t * 1.2) * 0.1;
      orbLight.intensity = mat.uniforms.uProgress.value * 0.8 * pulse;
      renderer.render(scene, camera);
    };
    animate();

    // Entrance: fade in particles
    gsap.to(mat.uniforms.uProgress, { value: 1, duration: 3, ease: 'power2.inOut' });
    gsap.to(glowMat, { opacity: 0.5, duration: 2.5, delay: 1 });

    const cleanup = () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouse);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    mountRef.current._cleanup = cleanup;
    return cleanup;
  }, [mood.primaryColor, mood.accentColor]);

  /* ── GSAP narrative: whisper then portal ── */
  useEffect(() => {
    if (navigator.vibrate) setTimeout(() => navigator.vibrate([60, 100, 60]), 1500);

    const tl = gsap.timeline();

    // Breath ring appears
    tl.fromTo(breathRingRef.current,
      { opacity: 0, scale: 0.5 },
      { opacity: 1, scale: 1, duration: 2.5, ease: 'power2.out' }, 0.8);
    tl.add(() => gsap.to(breathRingRef.current, {
      scale: 1.12, opacity: 0.25, duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut',
    }), 3);

    // Whispered voice line fades in (blurred → sharp)
    tl.fromTo(voiceRef.current,
      { opacity: 0, filter: 'blur(12px)', y: 10 },
      { opacity: 1, filter: 'blur(0px)', y: 0, duration: 2.5, ease: 'power2.out' }, 2);

    // Portal + code entry appears
    tl.fromTo(phase2Ref.current,
      { opacity: 0, scale: 0.85 },
      { opacity: 1, scale: 1, duration: 1.5, ease: 'back.out(1.3)' }, 5.5)
    .fromTo(micBtnRef.current,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, 6.5)
    .fromTo(hintRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.8 }, 7.2)
    .fromTo(inputWrapRef.current,
      { opacity: 0 },
      { opacity: 0.7, duration: 0.8 }, 7.5);

    return () => { tl.kill(); if (navigator.vibrate) navigator.vibrate(0); };
  }, []);

  /* ── Particle burst on unlock ── */
  const fireParticles = useCallback(() => {
    const c = particlesRef.current;
    if (!c) return;
    c.innerHTML = '';
    for (let i = 0; i < 100; i++) {
      const el = document.createElement('div');
      const s  = 2 + Math.random() * 8;
      el.style.cssText = `position:absolute;width:${s}px;height:${s}px;border-radius:50%;left:50%;top:50%;margin:${-s/2}px;background:radial-gradient(circle,#FFD700,#D4AF37 60%,transparent);pointer-events:none;`;
      c.appendChild(el);
      const angle = (i / 100) * Math.PI * 2;
      const dist  = 80 + Math.random() * 220;
      gsap.fromTo(el,
        { x: 0, y: 0, scale: 0, opacity: 1 },
        { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, scale: 1 + Math.random() * 2, opacity: 0,
          duration: 1.2 + Math.random(), ease: 'power2.out', delay: Math.random() * 0.1 }
      );
    }
  }, []);

  /* ── Trigger unlock sequence ── */
  const triggerUnlock = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([80, 60, 80, 60, 300]);
    setPortalProgress(1);

    const tl = gsap.timeline();
    // Portal explodes outward
    tl.to(phase2Ref.current, { scale: 1.4, opacity: 0, duration: 0.7, ease: 'power2.in' })
      .to(phase1Ref.current, { opacity: 0, duration: 0.4 }, '<0.2')
      .add(fireParticles, '<')
      // Unlock message materialises
      .fromTo(phase3Ref.current,
        { opacity: 0, scale: 0.8, filter: 'blur(20px)' },
        { opacity: 1, scale: 1,   filter: 'blur(0px)', duration: 2, ease: 'power3.out' })
      .fromTo(unlockTextRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 1.5, ease: 'power2.out' }, '-=1.2')
      // Then advance
      .add(() => {
        setTimeout(() => gsap.to(overlayRef.current, {
          opacity: 0, duration: 1, ease: 'power2.in', onComplete: onNext,
        }), 1800);
      });
  }, [fireParticles, onNext]);

  /* ── Check typed answer ── */
  const handleInputChange = useCallback((val) => {
    setInputValue(val);
    const norm = val.toLowerCase().trim();
    const ratio = Math.min(norm.length / secretNickname.length, 0.9);
    setPortalProgress(ratio * 0.85);
    if (norm === secretNickname) triggerUnlock();
  }, [secretNickname, triggerUnlock]);

  const handleSubmit = useCallback(() => {
    const norm = inputValue.toLowerCase().trim();
    if (norm === secretNickname) {
      triggerUnlock();
    } else {
      setPortalProgress(0);
      gsap.to(inputRef.current, { x: [-10, 10, -8, 8, -4, 4, 0], duration: 0.45 });
      gsap.fromTo(errorRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3,
          onComplete: () => setTimeout(() => gsap.to(errorRef.current, { opacity: 0, duration: 0.4 }), 2000) }
      );
    }
  }, [inputValue, secretNickname, triggerUnlock]);

  /* ── Voice recognition ── */
  const handleMicClick = useCallback((e) => {
    e.stopPropagation();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { inputRef.current?.focus(); return; }

    setMicState('listening');
    setListening(true);
    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    gsap.to(micBtnRef.current, { scale: 1.15, duration: 0.3 });

    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.interimResults = true;
    rec.maxAlternatives = 8;

    rec.onresult = (event) => {
      const alts = Array.from(event.results[0]).map(a => a.transcript.toLowerCase().trim()).join(' ');
      // Show progress as words match
      const words = secretNickname.split(' ');
      const matched = words.filter(w => alts.includes(w)).length;
      setPortalProgress(Math.min(matched / words.length, 1));

      if (alts.includes(secretNickname) || event.results[0][0].transcript.toLowerCase().trim() === secretNickname) {
        setMicState('done');
        setListening(false);
        gsap.to(micBtnRef.current, { scale: 1, duration: 0.2 });
        setTimeout(triggerUnlock, 300);
      }
    };
    rec.onerror = () => { setMicState('idle'); setListening(false); gsap.to(micBtnRef.current, { scale: 1, duration: 0.2 }); };
    rec.onend   = () => { if (micState !== 'done') { setMicState('idle'); setListening(false); } };
    rec.start();
  }, [secretNickname, triggerUnlock, micState]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: 'transparent' }}
    >
      {/* Three.js particle nebula */}
      <div ref={mountRef} className="absolute inset-0 z-0" />

      {/* Breath ring */}
      <div ref={breathRingRef}
           className="absolute rounded-full pointer-events-none"
           style={{ width: 320, height: 320, opacity: 0,
             border: `1px solid ${mood.primaryColor}25`,
             boxShadow: `0 0 60px 0px ${mood.primaryColor}10` }}/>

      {/* ── PHASE 1: Whisper ── */}
      <div ref={phase1Ref} className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <p ref={voiceRef}
           className="px-10 max-w-sm text-center font-light leading-relaxed"
           style={{
             fontFamily: "'Cormorant Garamond', Georgia, serif",
             fontSize: 'clamp(1.1rem, 4vw, 1.45rem)',
             color: 'rgba(255,255,255,0.88)',
             opacity: 0,
             padding: '1.5rem 2rem',
             borderRadius: '1rem',
             background: 'rgba(0,0,0,0.55)',
             backdropFilter: 'blur(12px)',
             WebkitBackdropFilter: 'blur(12px)',
           }}>
          {voiceLine}
        </p>
      </div>

      {/* ── PHASE 2: Portal + code entry ── */}
      <div ref={phase2Ref} className="absolute z-20 flex flex-col items-center gap-6" style={{ opacity: 0 }}>
        {/* Dark backdrop so portal is always readable */}
        <div className="absolute inset-[-40px] rounded-3xl pointer-events-none"
             style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '50%', transform: 'scale(1.8)' }}/>

        {/* Portal circle */}
        <div ref={portalWrapRef} className="relative flex items-center justify-center"
             style={{ width: 200, height: 200 }}>
          <PortalRing progress={portalProgress} listening={listening} color={mood.primaryColor}/>

          {/* Mic button at center */}
          <button
            ref={micBtnRef}
            onClick={handleMicClick}
            disabled={micState === 'done'}
            className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-300 hover:scale-105"
            style={{
              opacity: 0,
              border: `1px solid ${mood.primaryColor}50`,
              background: `rgba(0,0,0,0.65)`,
              boxShadow: listening ? `0 0 40px ${mood.primaryColor}60` : 'none',
            }}
          >
            {listening && (
              <span className="absolute inset-0 rounded-full border-2 animate-ping"
                    style={{ borderColor: `${mood.primaryColor}70` }}/>
            )}
            {micState === 'done'
              ? <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="#4ade80" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              : <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none"
                     stroke={listening ? '#FFD700' : mood.primaryColor} strokeWidth="1.5">
                  <path strokeLinecap="round" d="M12 1a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z"/>
                  <path strokeLinecap="round" d="M19 10a7 7 0 0 1-14 0"/>
                  <line x1="12" y1="17" x2="12" y2="23"/>
                </svg>
            }
          </button>
        </div>

        {/* Hint label */}
        <p ref={hintRef} className="text-[10px] tracking-[0.45em] uppercase -mt-2"
           style={{ color: `${mood.primaryColor}55`, opacity: 0 }}>
          {listening ? "Je t'écoute…" : 'Dis le code secret'}
        </p>

        {/* Typed fallback */}
        <div ref={inputWrapRef} className="flex flex-col items-center gap-2" style={{ opacity: 0 }}>
          <p className="text-white/20 text-[9px] tracking-[0.3em] uppercase">ou écris-le</p>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            onClick={e => e.stopPropagation()}
            className="bg-transparent border-b pb-2 text-center text-lg tracking-widest text-white/80 placeholder:text-white/15 focus:outline-none transition-colors duration-300 w-40"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              borderColor: `${mood.primaryColor}25`,
            }}
          />
          <p ref={errorRef} className="text-sm font-light italic"
             style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: `${mood.primaryColor}60`, opacity: 0 }}>
            {data?.errorMessage || "Ce n'est pas ça…"}
          </p>
        </div>

        {/* Particles anchor */}
        <div ref={particlesRef} className="absolute pointer-events-none"/>
      </div>

      {/* ── PHASE 3: Unlocked ── */}
      <div ref={phase3Ref} className="absolute z-30 flex flex-col items-center gap-6 text-center pointer-events-none"
           style={{ opacity: 0 }}>
        {/* Burst glow */}
        <div className="absolute w-80 h-80 rounded-full pointer-events-none"
             style={{ background: `radial-gradient(circle, ${mood.primaryColor}25, transparent 70%)`,
                      filter: 'blur(30px)' }}/>
        <p ref={unlockTextRef}
           className="relative text-2xl md:text-3xl font-light px-8 max-w-xs leading-relaxed"
           style={{ fontFamily: "'Cormorant Garamond', Georgia, serif",
                    color: `${mood.primaryColor}EE`,
                    textShadow: `0 0 40px ${mood.primaryColor}60`,
                    opacity: 0 }}>
          {data?.successVoiceLine || "C'est bien toi…"}
        </p>
        <p className="relative text-[9px] tracking-[0.6em] uppercase animate-pulse"
           style={{ color: `${mood.primaryColor}40` }}>
          Entrée dans l'univers
        </p>
      </div>

      <style>{`
        @keyframes breathe {
          from { transform: scale(1);    opacity: 0.06; }
          to   { transform: scale(1.15); opacity: 0.18; }
        }
      `}</style>
    </div>
  );
};

export default Scene1Opening;
