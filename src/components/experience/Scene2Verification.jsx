import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';

const Scene2Verification = ({ data, onNext }) => {
  const containerRef  = useRef(null);
  const canvasRef     = useRef(null);
  const inputPhaseRef = useRef(null);
  const voiceRef      = useRef(null);
  const inputWrapRef  = useRef(null);
  const inputRef      = useRef(null);
  const errorRef      = useRef(null);
  const btnRef        = useRef(null);
  const successRef    = useRef(null);
  const successGlowRef= useRef(null);
  const successTextRef= useRef(null);
  const continueRef   = useRef(null);
  const particlesRef  = useRef(null);

  const [inputValue, setInputValue] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [readyToAdvance, setReadyToAdvance] = useState(false);

  const secretNickname = (data?.secretNickname || 'mon coeur').toLowerCase().trim();
  const voiceLine      = data?.voiceLine || "Si c'est vraiment toi… écris le surnom que je te donne quand personne ne regarde.";
  const errorMessage   = data?.errorMessage || 'Hmm… essaie encore mon amour.';
  const successLine    = data?.successVoiceLine || "C'est bien toi…";

  /* ── Star field canvas ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.3,
      a: Math.random(),
      speed: Math.random() * 0.008 + 0.003,
      phase: Math.random() * Math.PI * 2,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        s.phase += s.speed;
        ctx.globalAlpha = Math.max(0, 0.5 + Math.sin(s.phase) * 0.5);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ── Entrance animation ── */
  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 1.2 })
      .fromTo(voiceRef.current,   { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.6, ease: 'power2.out' }, 0.5)
      .fromTo(inputWrapRef.current,{ opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }, 1.6);
    return () => tl.kill();
  }, []);

  /* ── Button opacity follows input ── */
  useEffect(() => {
    if (btnRef.current) {
      gsap.to(btnRef.current, { opacity: inputValue.length > 0 ? 0.65 : 0, duration: 0.3 });
    }
  }, [inputValue]);

  /* ── Focus input after short delay ── */
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 2000);
    return () => clearTimeout(t);
  }, []);

  /* ── GSAP particle burst ── */
  const fireParticles = useCallback(() => {
    const container = particlesRef.current;
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 48; i++) {
      const el = document.createElement('div');
      const size = Math.random() * 7 + 2;
      el.style.cssText = `
        position:absolute; width:${size}px; height:${size}px;
        border-radius:50%; left:50%; top:50%;
        margin-left:${-size/2}px; margin-top:${-size/2}px;
        background:radial-gradient(circle,#FFD700,#D4AF37);
        pointer-events:none;
      `;
      container.appendChild(el);
      const angle    = (i / 48) * Math.PI * 2;
      const dist     = 80 + Math.random() * 140;
      const duration = 1.2 + Math.random() * 0.6;
      gsap.fromTo(el,
        { x: 0, y: 0, scale: 0, opacity: 1 },
        {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          scale: 1 + Math.random(),
          opacity: 0,
          duration,
          ease: 'power2.out',
          delay: Math.random() * 0.2,
        }
      );
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const normalized = inputValue.toLowerCase().trim();
    if (normalized === secretNickname) {
      if (navigator.vibrate) navigator.vibrate([50, 100, 50, 100, 200]);
      setShowSuccess(true);
      const tl = gsap.timeline();
      tl.to(inputPhaseRef.current, { opacity: 0, scale: 0.9, duration: 0.5, ease: 'power2.in' })
        .set(inputPhaseRef.current, { display: 'none' })
        .fromTo(successRef.current, { opacity: 0 }, { opacity: 1, display: 'flex', duration: 0.6 })
        .add(fireParticles)
        .fromTo(successGlowRef.current, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.5, ease: 'power2.out' }, '<')
        .fromTo(successTextRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.5, ease: 'power2.out' }, '-=0.8')
        .fromTo(continueRef.current,  { opacity: 0 },
          { opacity: 0.45, duration: 1.2, repeat: -1, yoyo: true, ease: 'power2.inOut' }, '+=1')
        .add(() => setReadyToAdvance(true), '+=0');
    } else {
      if (navigator.vibrate) navigator.vibrate([200]);
      gsap.to(inputRef.current, {
        x: [-10, 10, -8, 8, -5, 5, 0],
        duration: 0.45,
        ease: 'power2.inOut',
      });
      gsap.fromTo(errorRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out',
          onComplete: () => setTimeout(() => gsap.to(errorRef.current, { opacity: 0, duration: 0.4 }), 1800)
        }
      );
    }
  }, [inputValue, secretNickname, fireParticles]);

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden" style={{ opacity: 0 }}>
      {/* Star canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Nebula glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#D4AF37]/[0.04] blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#D4AF37]/[0.03] blur-[80px]" />
      </div>

      {/* Input phase */}
      <div ref={inputPhaseRef} className="relative z-10 flex flex-col items-center gap-12 px-8 max-w-md w-full">
        <p ref={voiceRef}
           className="text-white/60 text-lg md:text-xl font-light tracking-wide text-center leading-relaxed"
           style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", opacity: 0 }}>
          {voiceLine}
        </p>

        <div ref={inputWrapRef} className="w-full max-w-xs" style={{ opacity: 0 }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            className="w-full bg-transparent border-b border-white/15 pb-4 text-center text-2xl tracking-widest text-white/90 placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/40 transition-colors duration-300"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          />
          <p ref={errorRef}
             className="mt-4 text-[#D4AF37]/60 text-sm font-light italic text-center"
             style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", opacity: 0 }}>
            {errorMessage}
          </p>
        </div>

        <button
          ref={btnRef}
          onClick={handleSubmit}
          className="px-8 py-3 rounded-full border border-[#D4AF37]/25 text-[#D4AF37]/70 text-xs tracking-[0.35em] uppercase hover:border-[#D4AF37]/60 hover:text-[#D4AF37] transition-all duration-300"
          style={{ opacity: 0 }}
        >
          Révéler
        </button>
      </div>

      {/* Success phase */}
      <div ref={successRef} className="relative z-10 flex-col items-center justify-center cursor-pointer hidden"
           onClick={() => readyToAdvance && onNext()}>
        <div ref={particlesRef} className="absolute pointer-events-none" />
        <div ref={successGlowRef}
             className="absolute w-72 h-72 rounded-full bg-[#D4AF37]/10 blur-[70px]"
             style={{ opacity: 0 }} />
        <p ref={successTextRef}
           className="text-[#D4AF37] text-2xl font-light tracking-wide text-center relative z-10"
           style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", opacity: 0 }}>
          {successLine}
        </p>
        <p ref={continueRef}
           className="absolute bottom-[-80px] text-white/30 text-[10px] tracking-[0.45em] uppercase"
           style={{ opacity: 0 }}>
          Continuer
        </p>
      </div>
    </div>
  );
};

export default Scene2Verification;
