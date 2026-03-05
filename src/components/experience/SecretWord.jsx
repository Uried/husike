import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { HelpCircle, ChevronRight } from 'lucide-react';

const SecretWord = ({ data, onNext }) => {
  const containerRef = useRef(null);
  const lockedRef    = useRef(null);
  const inputRef     = useRef(null);
  const hintRef      = useRef(null);
  const unlockedRef  = useRef(null);
  const wordRef      = useRef(null);
  const nextBtnRef   = useRef(null);

  const [inputValue, setInputValue] = useState('');
  const [showHint,   setShowHint]   = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 1 })
      .fromTo(lockedRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }, 0.4);
    return () => tl.kill();
  }, []);

  const toggleHint = () => {
    const next = !showHint;
    setShowHint(next);
    if (hintRef.current) {
      if (next) {
        gsap.fromTo(hintRef.current,
          { opacity: 0, height: 0 },
          { opacity: 1, height: 'auto', duration: 0.4, ease: 'power2.out' },
        );
      } else {
        gsap.to(hintRef.current, { opacity: 0, height: 0, duration: 0.3, ease: 'power2.in' });
      }
    }
  };

  const handleUnlock = useCallback(() => {
    if (inputValue.toUpperCase() === data.secretWord.toUpperCase()) {
      gsap.to(lockedRef.current, { opacity: 0, scale: 0.9, duration: 0.5, ease: 'power2.in',
        onComplete: () => {
          setIsUnlocked(true);
          gsap.fromTo(unlockedRef.current,
            { opacity: 0, scale: 0.88 },
            { opacity: 1, scale: 1,    duration: 1, ease: 'back.out(1.3)' },
          );
          gsap.fromTo(nextBtnRef.current,
            { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 0.8 },
          );
        },
      });
    } else {
      gsap.to(inputRef.current, {
        x: [-8, 8, -6, 6, -3, 3, 0], duration: 0.45, ease: 'power2.inOut',
      });
    }
  }, [inputValue, data.secretWord]);

  return (
    <div ref={containerRef}
         className="flex flex-col items-center justify-center min-h-screen p-6 gap-12"
         style={{ opacity: 0 }}>

      {/* Locked state */}
      {!isUnlocked && (
        <div ref={lockedRef} className="w-full max-w-sm text-center space-y-10" style={{ opacity: 0 }}>
          <p className="text-2xl text-white/65 font-light tracking-wide"
             style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            {data.prompt}
          </p>

          <div>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              placeholder="••••••••"
              autoComplete="off" spellCheck="false"
              className="w-full bg-transparent border-b border-white/20 pb-3 text-center text-3xl tracking-[0.5em] text-white placeholder:text-white/10 focus:outline-none focus:border-[#D4AF37]/40 transition-colors uppercase"
            />
          </div>

          <div className="flex flex-col items-center gap-5">
            <button
              onClick={handleUnlock}
              className="px-10 py-3 rounded-full border border-[#D4AF37]/25 text-[#D4AF37]/70 text-xs tracking-[0.35em] uppercase hover:bg-[#D4AF37]/8 hover:border-[#D4AF37]/50 hover:text-[#D4AF37] transition-all duration-300"
            >
              Révéler
            </button>

            <button
              onClick={toggleHint}
              className="flex items-center gap-2 text-white/30 hover:text-white/55 transition-colors text-[10px] uppercase tracking-widest"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Indice</span>
            </button>

            <div ref={hintRef} style={{ overflow: 'hidden', height: 0, opacity: 0 }}>
              <p className="text-white/35 italic text-sm"
                 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                "{data.hint}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Unlocked state */}
      <div ref={unlockedRef}
           className={`flex flex-col items-center gap-8 text-center ${isUnlocked ? '' : 'hidden'}`}
           style={{ opacity: 0 }}>
        <p className="text-lg text-white/40">Le mot secret est</p>
        <h3 className="text-5xl font-light tracking-[0.35em] ml-[0.35em] uppercase text-gold-gradient"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          {data.secretWord}
        </h3>
        <button
          ref={nextBtnRef}
          onClick={onNext}
          className="flex items-center gap-3 text-white/35 hover:text-white transition-all uppercase tracking-[0.3em] text-[10px] pt-10 group"
          style={{ opacity: 0 }}
        >
          <span>Écouter le message</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default SecretWord;
