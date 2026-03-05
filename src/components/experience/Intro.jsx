import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const Intro = ({ data, onNext }) => {
  const containerRef = useRef(null);
  const orbRef       = useRef(null);
  const glowRef      = useRef(null);
  const headingRef   = useRef(null);
  const btnRef       = useRef(null);

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 1 })
      .fromTo(orbRef.current,  { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 1.4, ease: 'back.out(1.4)' }, 0.3)
      .fromTo(headingRef.current, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 1.3, ease: 'power2.out' }, 0.7)
      .fromTo(btnRef.current,  { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }, 1.1);

    gsap.to(glowRef.current, { opacity: 0.25, duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });

    return () => tl.kill();
  }, []);

  return (
    <div ref={containerRef}
         className="relative flex flex-col items-center justify-center min-h-screen text-center p-6 overflow-hidden bg-black"
         style={{ opacity: 0 }}>
      {/* Nebula */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#D4AF37]/[0.04] blur-[140px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-16">
        {/* Orb icon */}
        <div ref={orbRef} className="relative" style={{ opacity: 0 }}>
          <div ref={glowRef}
               className="absolute inset-[-28px] rounded-full bg-[#D4AF37]/15 blur-3xl"
               style={{ opacity: 0.1 }} />
          <div className="w-24 h-24 rounded-full border border-[#D4AF37]/15 flex items-center justify-center bg-black/40 backdrop-blur-md">
            <span className="text-3xl" style={{ filter: 'drop-shadow(0 0 10px #D4AF37)' }}>✦</span>
          </div>
        </div>

        <h1 ref={headingRef}
            className="text-3xl font-light text-white leading-relaxed tracking-wide max-w-sm"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", opacity: 0 }}>
          {data?.prompt || 'Une promesse vous attend.'}
        </h1>

        <button
          ref={btnRef}
          onClick={onNext}
          className="px-12 py-4 rounded-full bg-[#D4AF37]/8 border border-[#D4AF37]/20 text-[#D4AF37]/80 font-light tracking-[0.35em] uppercase text-sm backdrop-blur-md transition-all hover:bg-[#D4AF37]/15 hover:border-[#D4AF37]/40 hover:text-[#D4AF37] duration-300"
          style={{ opacity: 0 }}
        >
          {data?.buttonText || 'Ouvrir'}
        </button>
      </div>
    </div>
  );
};

export default Intro;
