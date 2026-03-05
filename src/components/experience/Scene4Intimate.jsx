import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';

const PARTICLE_COUNT = 60;

const Scene4Intimate = ({ data, onNext }) => {
  const containerRef   = useRef(null);
  const canvasRef      = useRef(null);
  const glowRef        = useRef(null);
  const voiceRef       = useRef(null);
  const touchCircleRef = useRef(null);
  const progressSvgRef = useRef(null);
  const progressArcRef = useRef(null);
  const ringsRef       = useRef([]);
  const msgRef         = useRef(null);
  const senderRef      = useRef(null);
  const btnRef         = useRef(null);

  const phaseRef       = useRef(0);
  const intensityRef   = useRef(0);
  const touchTimerRef  = useRef(null);
  const touchProgress  = useRef(0);
  const hbSpeedRef     = useRef(1.5);
  const isTouchingRef  = useRef(false);
  const canvasAnimRef  = useRef(null);

  const voiceLine     = data?.voiceLine     || 'Pose ton doigt ici.';
  const revealMessage = data?.revealMessage || 'Peu importe la distance… tu es là.';
  const senderName    = data?.senderName;

  /* ── Canvas particle ring ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const cx = () => canvas.width  / 2;
    const cy = () => canvas.height / 2;
    const BASE_R = 100;

    const draw = () => {
      canvasAnimRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const intensity = intensityRef.current;
      const phase     = phaseRef.current;
      const now       = Date.now();

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle  = (i / PARTICLE_COUNT) * Math.PI * 2;
        const maxOff = phase >= 1 ? 60 * intensity : 0;
        const off    = maxOff > 0 ? Math.sin(now / 300 + i) * maxOff : 0;
        const r      = BASE_R + off;
        const size   = phase >= 1 ? 2 + intensity * 4 : 2;
        const alpha  = phase >= 1 ? (0.3 + Math.sin(now / 200 + i) * 0.25) : 0.1;

        const x = cx() + Math.cos(angle) * r;
        const y = cy() + Math.sin(angle) * r;

        const grad = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
        grad.addColorStop(0, `rgba(212,175,55,${alpha})`);
        grad.addColorStop(1, `rgba(255,215,0,0)`);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Glow pulse
      const pulse = 1 + Math.sin(now * (0.004 / hbSpeedRef.current)) * 0.08;
      if (glowRef.current) {
        glowRef.current.style.transform = `scale(${pulse})`;
        glowRef.current.style.opacity   = `${0.04 + intensityRef.current * 0.06}`;
      }

      // Rings pulse
      ringsRef.current.forEach((ring, idx) => {
        if (!ring) return;
        const rs = 1 + Math.sin(now * (0.004 / hbSpeedRef.current) + idx * 0.4) * (0.04 + intensityRef.current * 0.04);
        ring.style.transform = `scale(${rs})`;
        ring.style.opacity   = isTouchingRef.current
          ? `${0.1 + intensityRef.current * 0.25}`
          : '0.07';
        ring.style.borderColor = `rgba(212,175,55,${0.1 + intensityRef.current * 0.3})`;
      });
    };
    draw();

    return () => {
      cancelAnimationFrame(canvasAnimRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  /* ── Entrance animation ── */
  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 1.5 })
      .fromTo(voiceRef.current, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }, 0.8)
      .fromTo(touchCircleRef.current, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 1, ease: 'back.out(1.5)' }, 1.2);
    return () => tl.kill();
  }, []);

  /* ── Transition to phase 2 (reveal) ── */
  const triggerReveal = useCallback(() => {
    phaseRef.current = 2;
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);

    gsap.to(voiceRef.current, { opacity: 0, y: -20, duration: 0.6 });
    gsap.to(touchCircleRef.current, { opacity: 0, scale: 0.8, duration: 0.6 });
    gsap.fromTo(msgRef.current,
      { opacity: 0, y: 36 },
      { opacity: 1, y: 0, duration: 2, ease: 'power3.out', delay: 0.4 },
    );
    if (senderRef.current) {
      gsap.fromTo(senderRef.current,
        { opacity: 0 }, { opacity: 1, duration: 1.5, delay: 2 },
      );
    }
    setTimeout(() => {
      phaseRef.current = 3;
      gsap.fromTo(btnRef.current,
        { opacity: 0, y: 8 },
        { opacity: 0.55, y: 0, duration: 1, ease: 'power2.out' },
      );
    }, 4000);
  }, []);

  /* ── Touch handlers ── */
  const handleTouchStart = useCallback(() => {
    if (phaseRef.current >= 2) return;
    isTouchingRef.current = true;
    phaseRef.current = 1;
    if (navigator.vibrate) navigator.vibrate([100, 100, 100, 100, 200]);

    touchTimerRef.current = setInterval(() => {
      touchProgress.current += 1;
      const newIntensity = Math.min(touchProgress.current / 30, 1);
      intensityRef.current = newIntensity;
      hbSpeedRef.current   = Math.max(1.5 - newIntensity * 1, 0.5);

      // Progress arc
      if (progressArcRef.current) {
        const dashOffset = 364.4 * (1 - newIntensity);
        progressArcRef.current.style.strokeDashoffset = dashOffset;
      }

      if (navigator.vibrate && touchProgress.current % 3 === 0) {
        navigator.vibrate([Math.floor(50 + newIntensity * 150)]);
      }

      if (touchProgress.current >= 30) {
        clearInterval(touchTimerRef.current);
        triggerReveal();
      }
    }, 100);
  }, [triggerReveal]);

  const handleTouchEnd = useCallback(() => {
    isTouchingRef.current = false;
    if (touchTimerRef.current) clearInterval(touchTimerRef.current);
    if (phaseRef.current < 2) {
      touchProgress.current = Math.max(0, touchProgress.current - 5);
      intensityRef.current  = touchProgress.current / 30;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearInterval(touchTimerRef.current);
      if (navigator.vibrate) navigator.vibrate(0);
    };
  }, []);

  return (
    <div ref={containerRef}
         className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden select-none"
         style={{ opacity: 0 }}>
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Ambient glow */}
      <div ref={glowRef}
           className="absolute w-96 h-96 rounded-full bg-[#D4AF37]/5 blur-[80px] pointer-events-none"
           style={{ opacity: 0.04 }} />

      {/* Voice line */}
      <p ref={voiceRef}
         className="absolute top-24 text-white/50 text-lg font-light tracking-wide text-center px-8"
         style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", opacity: 0 }}>
        {voiceLine}
      </p>

      {/* Touch circle + rings */}
      <div ref={touchCircleRef} className="relative z-10" style={{ opacity: 0 }}>
        {[120, 160, 200].map((size, i) => (
          <div
            key={i}
            ref={el => ringsRef.current[i] = el}
            className="absolute rounded-full border border-[#D4AF37]/10"
            style={{
              width: size, height: size,
              left: -size / 2 + 60, top: -size / 2 + 60,
              opacity: 0.07,
              transition: 'border-color 0.3s',
            }}
          />
        ))}

        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          className="w-[120px] h-[120px] rounded-full border-2 border-[#D4AF37]/30 bg-[#D4AF37]/5 flex items-center justify-center cursor-pointer backdrop-blur-sm relative"
          style={{ boxShadow: '0 0 20px rgba(212,175,55,0.1)' }}
        >
          {/* Inner core */}
          <div className="w-8 h-8 rounded-full bg-[#D4AF37]/40" />

          {/* Progress SVG arc */}
          <svg ref={progressSvgRef}
               className="absolute w-full h-full"
               viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="58" fill="none"
                    stroke="rgba(212,175,55,0.08)" strokeWidth="2" />
            <circle
              ref={progressArcRef}
              cx="60" cy="60" r="58" fill="none"
              stroke="#D4AF37" strokeWidth="2" strokeLinecap="round"
              strokeDasharray="364.4" strokeDashoffset="364.4"
              style={{ transformOrigin: 'center', transform: 'rotate(-90deg)', transition: 'stroke-dashoffset 0.1s' }}
            />
          </svg>
        </div>
      </div>

      {/* Revealed message */}
      <div ref={msgRef}
           className="absolute bottom-32 text-center px-8 max-w-md"
           style={{ opacity: 0 }}>
        <p className="text-[#D4AF37] text-2xl md:text-3xl font-light tracking-wide leading-relaxed"
           style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          "{revealMessage}"
        </p>
        {senderName && (
          <p ref={senderRef}
             className="mt-6 text-white/30 text-sm tracking-[0.35em] uppercase"
             style={{ opacity: 0 }}>
            — {senderName}
          </p>
        )}
      </div>

      {/* Continue button */}
      <button
        ref={btnRef}
        onClick={onNext}
        className="absolute bottom-12 px-8 py-3 rounded-full border border-[#D4AF37]/20 text-[#D4AF37]/50 text-xs tracking-[0.3em] uppercase hover:border-[#D4AF37]/45 hover:text-[#D4AF37] transition-all duration-300"
        style={{ opacity: 0 }}
      >
        Continuer
      </button>
    </div>
  );
};

export default Scene4Intimate;
