import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { ChevronRight } from 'lucide-react';

const MediaDisplay = ({ media, isActive }) => {
  const elRef = useRef(null);
  useEffect(() => {
    if (!elRef.current) return;
    gsap.to(elRef.current, {
      opacity: isActive ? 1 : 0,
      scale:   isActive ? 1 : 0.9,
      y:       isActive ? 0 : 18,
      duration: 0.55,
      ease: 'power2.out',
    });
  }, [isActive]);
  if (!media) return null;
  return (
    <div ref={elRef} className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0 }}>
      {media.type === 'image' && <img src={media.url} alt={media.alt} className="max-w-full max-h-full rounded-lg shadow-2xl" />}
      {media.type === 'video' && <video src={media.url} autoPlay loop muted className="max-w-full max-h-full rounded-lg shadow-2xl" />}
    </div>
  );
};

const PromiseReveal = ({ data, onNext }) => {
  const containerRef  = useRef(null);
  const voiceRef      = useRef(null);
  const trackRef      = useRef(null);
  const orbRef        = useRef(null);
  const voicelineRef  = useRef(null);
  const continueBtnRef= useRef(null);

  const [activeStep, setActiveStep] = useState(0);
  const steps = data?.steps || [];
  const isDragging = useRef(false);
  const startX     = useRef(0);
  const currentX   = useRef(0);
  const DRAG_MAX   = 300;

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 1.2 })
      .fromTo(voiceRef.current, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, 0.4)
      .fromTo(trackRef.current,   { opacity: 0 },       { opacity: 1, duration: 0.8 }, 0.8);
    return () => tl.kill();
  }, []);

  const updateVoiceLine = useCallback((step) => {
    if (!voicelineRef.current) return;
    gsap.to(voicelineRef.current, { opacity: 0, y: -10, duration: 0.25, onComplete: () => {
      voicelineRef.current.textContent = `"${steps[step]?.voiceLine}"` || '';
      gsap.fromTo(voicelineRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
    }});
  }, [steps]);

  const handlePointerDown = (e) => {
    isDragging.current = true;
    startX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  };
  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    const x  = e.clientX ?? e.touches?.[0]?.clientX ?? startX.current;
    const dx = Math.max(-DRAG_MAX, Math.min(0, x - startX.current));
    currentX.current = dx;
    gsap.set(orbRef.current, { x: dx });
    const p = -dx / DRAG_MAX;
    let step = 0;
    if (p >= 0.66) step = 2;
    else if (p >= 0.33) step = 1;
    if (step !== activeStep) {
      setActiveStep(step);
      updateVoiceLine(step);
      if (step === steps.length - 1) {
        gsap.to(continueBtnRef.current, { opacity: 1, duration: 0.6, delay: 0.3 });
      }
    }
  };
  const handlePointerUp = () => { isDragging.current = false; };

  return (
    <div ref={containerRef}
         className="relative flex flex-col items-center justify-center min-h-screen text-center p-6 overflow-hidden"
         style={{ opacity: 0 }}
         onMouseMove={handlePointerMove} onMouseUp={handlePointerUp}
         onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp}>

      <p ref={voiceRef}
         className="absolute top-24 font-light text-lg text-white/55"
         style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", opacity: 0 }}>
        Suis-moi.
      </p>

      {/* Media area */}
      <div className="relative w-full h-64 mb-16">
        {steps.map((step, i) => (
          <MediaDisplay key={i} media={step.media} isActive={activeStep === i} />
        ))}
      </div>

      {/* Drag track */}
      <div ref={trackRef}
           className="relative w-full max-w-sm h-20 flex items-center justify-center select-none"
           style={{ opacity: 0 }}>
        <svg width="100%" height="2" className="absolute">
          <line x1="0" y1="1" x2="100%" y2="1" stroke="rgba(212,175,55,0.15)" strokeWidth="1.5" />
        </svg>
        <div
          ref={orbRef}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          className="w-10 h-10 rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 cursor-grab active:cursor-grabbing flex items-center justify-center"
          style={{ boxShadow: '0 0 16px rgba(212,175,55,0.25)' }}
        >
          <div className="w-2 h-2 rounded-full bg-[#D4AF37]/70" />
        </div>
      </div>

      {/* Voice line */}
      <div className="h-20 mt-6 flex items-center justify-center px-8">
        <p ref={voicelineRef}
           className="text-white/75 text-lg font-light italic leading-relaxed"
           style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", opacity: 0 }}>
          {steps[0]?.voiceLine ? `"${steps[0].voiceLine}"` : ''}
        </p>
      </div>

      <button
        ref={continueBtnRef}
        onClick={onNext}
        className="mt-10 px-8 py-3 rounded-full border border-[#D4AF37]/20 text-[#D4AF37]/60 text-sm hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition-all duration-300 flex items-center gap-2"
        style={{ opacity: 0 }}
      >
        Continuer <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default PromiseReveal;
