import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const Scene1Opening = ({ data, onNext }) => {
  const containerRef = useRef(null);
  const ringsRef     = useRef([]);
  const lightRef     = useRef(null);
  const voiceRef     = useRef(null);
  const nameGroupRef = useRef(null);
  const lineRef      = useRef(null);
  const tapRef       = useRef(null);
  const charRefs     = useRef([]);
  const [canProceed, setCanProceed] = useState(false);

  const name      = data?.recipientName || 'Toi';
  const voiceLine = data?.voiceLine || "Si tu entends ceci… c'est que tu as mis le collier.";

  useEffect(() => {
    const tl = gsap.timeline();

    // Phase 1 — rings + light (t=2s)
    tl.add(() => {
      if (navigator.vibrate) {
        const iv = setInterval(() => navigator.vibrate([100, 200, 100]), 1500);
        setTimeout(() => { clearInterval(iv); navigator.vibrate(0); }, 9000);
      }
    }, 2)
    .to(ringsRef.current, {
      opacity: 1, duration: 1.6, stagger: 0.15, ease: 'power2.out',
    }, 2)
    .to(lightRef.current, {
      opacity: 1, scale: 1, duration: 2.5, ease: 'power2.out',
    }, 2.2);

    // Ring pulse loop (added after they appear)
    tl.add(() => {
      ringsRef.current.forEach((r, i) => {
        if (r) gsap.to(r, {
          scale: 1.35, opacity: 0.05, duration: 1.4,
          repeat: -1, yoyo: true, delay: i * 0.3, ease: 'sine.inOut',
        });
      });
    }, 3.6);

    // Phase 2 — voice line (t=5s)
    tl.fromTo(voiceRef.current,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0,  duration: 1.8, ease: 'power2.out' },
    5);

    // Phase 3 — name chars (t=8s)
    tl.to(voiceRef.current, { opacity: 0, y: -18, duration: 1, ease: 'power2.in' }, 7.5)
    .fromTo(nameGroupRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 8)
    .fromTo(charRefs.current,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' },
    8)
    .fromTo(lineRef.current,
      { scaleX: 0, opacity: 0 },
      { scaleX: 1, opacity: 1, duration: 1.6, ease: 'power2.out', transformOrigin: 'center' },
    8 + name.length * 0.12 + 0.4);

    // Phase 4 — tap hint + enable proceed (t=11s)
    tl.fromTo(tapRef.current,
      { opacity: 0 },
      { opacity: 0.4, duration: 1.2, ease: 'power2.out', repeat: -1, yoyo: true },
    11)
    .add(() => setCanProceed(true), 11);

    return () => {
      tl.kill();
      gsap.killTweensOf([...ringsRef.current, lightRef.current, voiceRef.current,
        nameGroupRef.current, lineRef.current, tapRef.current, ...charRefs.current]);
      if (navigator.vibrate) navigator.vibrate(0);
    };
  }, [name]);

  const handleTap = () => { if (canProceed) onNext(); };

  return (
    <div
      ref={containerRef}
      onClick={handleTap}
      className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden select-none cursor-pointer"
    >
      {/* Heartbeat rings */}
      <div className="absolute">
        {[120, 200, 280].map((size, i) => (
          <div
            key={i}
            ref={el => ringsRef.current[i] = el}
            className="absolute rounded-full border border-[#D4AF37]/20"
            style={{
              width: size, height: size,
              left: -size / 2, top: -size / 2,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* Distant orb */}
      <div ref={lightRef} className="absolute" style={{ opacity: 0, scale: 0.15 }}>
        <div className="w-32 h-32 rounded-full bg-[#D4AF37]/20 blur-[60px]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-[#D4AF37]" style={{ filter: 'blur(2px)' }} />
        </div>
      </div>

      {/* Voice line */}
      <p
        ref={voiceRef}
        className="absolute text-white/70 text-lg md:text-xl font-light tracking-wide text-center px-8 max-w-md"
        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", opacity: 0 }}
      >
        {voiceLine}
      </p>

      {/* Name group */}
      <div ref={nameGroupRef} className="absolute flex flex-col items-center gap-8" style={{ opacity: 0 }}>
        <svg
          viewBox={`0 0 ${Math.max(name.length * 58, 120)} 80`}
          className="w-full max-w-xs h-auto overflow-visible"
        >
          <defs>
            <linearGradient id="hsk-gold" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#D4AF37" />
              <stop offset="50%"  stopColor="#FFD700" />
              <stop offset="100%" stopColor="#D4AF37" />
            </linearGradient>
          </defs>
          {name.split('').map((char, i) => (
            <text
              key={i}
              ref={el => charRefs.current[i] = el}
              x={i * 58 + 29}
              y="56"
              textAnchor="middle"
              fill="url(#hsk-gold)"
              fontSize="50"
              fontFamily="'Cormorant Garamond', Georgia, serif"
              fontWeight="300"
              style={{ opacity: 0 }}
            >
              {char}
            </text>
          ))}
        </svg>

        <div
          ref={lineRef}
          className="h-px w-48 bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent"
          style={{ opacity: 0, transform: 'scaleX(0)' }}
        />
      </div>

      {/* Tap hint */}
      <p
        ref={tapRef}
        className="absolute bottom-16 text-white/30 text-[10px] tracking-[0.45em] uppercase"
        style={{ opacity: 0 }}
      >
        Touche l'écran
      </p>
    </div>
  );
};

export default Scene1Opening;
