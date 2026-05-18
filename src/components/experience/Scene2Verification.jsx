import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';

/* Magic circle SVG paths for the ritual unlock animation */
const RUNE_PATHS = [
  "M 60,10 L 110,90 L 10,90 Z",
  "M 60,90 L 10,10 L 110,10 Z",
  "M 10,50 L 110,50 M 60,0 L 60,100",
  "M 20,20 L 100,80 M 20,80 L 100,20",
];

const MagicCircle = ({ progress, unlocked, color }) => {
  const r = 70;
  const circ = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 160 160" className="absolute w-64 h-64 pointer-events-none" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
      <defs>
        <linearGradient id="mc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0.4"/>
        </linearGradient>
      </defs>
      {/* Outer ring base */}
      <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5"/>
      {/* Progress arc */}
      <circle cx="80" cy="80" r={r} fill="none"
        stroke="url(#mc-grad)" strokeWidth="1.5" strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - progress)}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '80px 80px', transition: 'stroke-dashoffset 0.3s ease' }}
      />
      {/* Inner circle */}
      <circle cx="80" cy="80" r="40" fill="none" stroke={unlocked ? color : 'rgba(255,255,255,0.06)'} strokeWidth="0.8"
        style={{ transition: 'stroke 0.5s' }}/>
      {/* Rune lines — appear as segments unlock */}
      {RUNE_PATHS.slice(0, Math.floor(progress * 4)).map((_, i) => (
        <line key={i}
          x1={80 + 40 * Math.cos((i / 4) * Math.PI * 2)} y1={80 + 40 * Math.sin((i / 4) * Math.PI * 2)}
          x2={80 + 70 * Math.cos((i / 4) * Math.PI * 2 + Math.PI / 4)} y2={80 + 70 * Math.sin((i / 4) * Math.PI * 2 + Math.PI / 4)}
          stroke={color} strokeWidth="0.8" strokeOpacity="0.5" strokeLinecap="round"
        />
      ))}
      {/* Center orb */}
      {unlocked && (
        <circle cx="80" cy="80" r="6" fill={color} opacity="0.9">
          <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1.5s" repeatCount="indefinite"/>
        </circle>
      )}
    </svg>
  );
};

const Scene2Verification = ({ data, onNext }) => {
  const containerRef   = useRef(null);
  const inputPhaseRef  = useRef(null);
  const voiceRef       = useRef(null);
  const inputWrapRef   = useRef(null);
  const inputRef       = useRef(null);
  const errorRef       = useRef(null);
  const btnRef         = useRef(null);
  const successRef     = useRef(null);
  const successGlowRef = useRef(null);
  const successTextRef = useRef(null);
  const continueRef    = useRef(null);
  const particlesRef   = useRef(null);
  const micBtnRef      = useRef(null);
  const circleWrapRef  = useRef(null);

  const [inputValue, setInputValue]       = useState('');
  const [readyToAdvance, setReadyToAdvance] = useState(false);
  const [circleProgress, setCircleProgress] = useState(0);
  const [circleUnlocked, setCircleUnlocked] = useState(false);
  const [micState, setMicState]           = useState('idle');
  const [inputMode, setInputMode]         = useState('voice'); // voice | type

  const secretNickname = (data?.secretNickname || 'mon coeur').toLowerCase().trim();
  const voiceLine      = data?.voiceLine || "Si c'est vraiment toi… dis le surnom que je te donne.";
  const errorMessage   = data?.errorMessage || "Hmm… ce n'était pas le bon mot.";
  const successLine    = data?.successVoiceLine || "C'est bien toi…";


  /* ── Entrance animation ── */
  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 1.4 })
      .fromTo(voiceRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.8, ease: 'power2.out' }, 0.5)
      .fromTo(circleWrapRef.current, { opacity: 0, scale: 0.7, rotate: -30 }, { opacity: 1, scale: 1, rotate: 0, duration: 1.5, ease: 'back.out(1.4)' }, 1.2)
      .fromTo(micBtnRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, 2.2)
      .fromTo(inputWrapRef.current, { opacity: 0 }, { opacity: 0.6, duration: 0.8 }, 3);
    return () => tl.kill();
  }, []);

  /* ── Button opacity follows input ── */
  useEffect(() => {
    if (btnRef.current) {
      gsap.to(btnRef.current, { opacity: inputValue.length > 0 ? 0.8 : 0, duration: 0.3 });
    }
  }, [inputValue]);

  /* ── GSAP particle burst ── */
  const fireParticles = useCallback(() => {
    const container = particlesRef.current;
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div');
      const size = Math.random() * 8 + 2;
      el.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;left:50%;top:50%;margin-left:${-size/2}px;margin-top:${-size/2}px;background:radial-gradient(circle,#FFD700,#D4AF37 50%,transparent);pointer-events:none;`;
      container.appendChild(el);
      const angle = (i / 80) * Math.PI * 2;
      const dist  = 60 + Math.random() * 180;
      gsap.fromTo(el,
        { x: 0, y: 0, scale: 0, opacity: 1 },
        { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, scale: 1 + Math.random() * 1.5, opacity: 0, duration: 1.4 + Math.random() * 0.8, ease: 'power2.out', delay: Math.random() * 0.15 }
      );
    }
  }, []);

  /* ── Core unlock logic ── */
  const triggerSuccess = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([50, 80, 50, 80, 250]);
    setCircleUnlocked(true);
    setCircleProgress(1);

    // Glow up the orbital mat
    const tl = gsap.timeline();
    tl.to(circleWrapRef.current, { scale: 1.3, opacity: 0, duration: 0.8, ease: 'power2.in' })
      .to(inputPhaseRef.current, { opacity: 0, scale: 0.85, duration: 0.5, ease: 'power2.in' }, '<0.2')
      .set(inputPhaseRef.current, { display: 'none' })
      .fromTo(successRef.current, { opacity: 0, display: 'flex' }, { opacity: 1, duration: 0.7 })
      .add(fireParticles)
      .fromTo(successGlowRef.current, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 2, ease: 'power2.out' }, '<')
      .fromTo(successTextRef.current, { opacity: 0, y: 24, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.8, ease: 'power3.out' }, '-=1')
      .fromTo(continueRef.current, { opacity: 0 }, { opacity: 0.5, duration: 1, repeat: -1, yoyo: true }, '+=1.2')
      .add(() => setReadyToAdvance(true));
  }, [fireParticles]);

  const checkAnswer = useCallback((value) => {
    const normalized = value.toLowerCase().trim();

    // Animate progress as user types
    const ratio = Math.min(normalized.length / secretNickname.length, 0.95);
    const correct = normalized === secretNickname ||
      secretNickname.includes(normalized) && normalized.length >= 3;

    if (normalized === secretNickname) {
      setCircleProgress(1);
      triggerSuccess();
    } else {
      setCircleProgress(Math.max(ratio * 0.85, 0));
    }
  }, [secretNickname, triggerSuccess]);

  const handleSubmit = useCallback(() => {
    const normalized = inputValue.toLowerCase().trim();
    if (normalized === secretNickname) {
      triggerSuccess();
    } else {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setCircleProgress(0);
      gsap.to(inputRef.current, { x: [-12, 12, -9, 9, -5, 5, 0], duration: 0.5, ease: 'power2.inOut' });
      gsap.fromTo(errorRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4,
          onComplete: () => setTimeout(() => gsap.to(errorRef.current, { opacity: 0, duration: 0.5 }), 2000) }
      );
    }
  }, [inputValue, secretNickname, triggerSuccess]);

  /* ── Voice recognition unlock ── */
  const handleVoiceUnlock = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setInputMode('type');
      return;
    }
    setMicState('listening');
    if (navigator.vibrate) navigator.vibrate([30, 60, 30]);

    gsap.to(micBtnRef.current, { scale: 1.15, boxShadow: '0 0 40px rgba(212,175,55,0.5)', duration: 0.4 });
    gsap.to(circleWrapRef.current, { rotate: 360, duration: 4, ease: 'none', repeat: -1 });

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = true;
    recognition.maxAlternatives = 6;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      const allAlts = Array.from(event.results[0]).map(a => a.transcript.toLowerCase().trim()).join(' ');

      // Animate circle progress as speech is heard
      const similarity = allAlts.includes(secretNickname) ? 1 :
        secretNickname.split(' ').filter(w => allAlts.includes(w)).length / secretNickname.split(' ').length;
      setCircleProgress(Math.min(similarity, 1));

      if (allAlts.includes(secretNickname) || transcript === secretNickname) {
        setMicState('done');
        gsap.killTweensOf(circleWrapRef.current);
        gsap.to(micBtnRef.current, { scale: 1, boxShadow: 'none', duration: 0.3 });
        setTimeout(triggerSuccess, 400);
      }
    };

    recognition.onerror = () => {
      setMicState('idle');
      setInputMode('type');
      gsap.killTweensOf(circleWrapRef.current);
      gsap.to(micBtnRef.current, { scale: 1, boxShadow: 'none', duration: 0.3 });
      gsap.to(circleWrapRef.current, { rotate: 0, duration: 0.5 });
    };

    recognition.onend = () => {
      if (micState !== 'done') setMicState('idle');
    };

    recognition.start();
  }, [secretNickname, triggerSuccess, micState]);

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden" style={{ opacity: 0 }}>

      {/* Input phase */}
      <div ref={inputPhaseRef} className="relative z-10 flex flex-col items-center gap-8 px-8 max-w-md w-full">
        {/* Readable voice line with dark backdrop */}
        <p ref={voiceRef}
           className="text-white/85 text-lg md:text-xl font-light tracking-wide text-center leading-relaxed px-6 py-4 rounded-2xl"
           style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", opacity: 0,
             background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          {voiceLine}
        </p>

        {/* Magic circle with dark backdrop */}
        <div ref={circleWrapRef} className="relative flex items-center justify-center rounded-full" style={{ width: 160, height: 160, opacity: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <MagicCircle progress={circleProgress} unlocked={circleUnlocked} color="#D4AF37" />
          {/* Mic button in center */}
          <button
            ref={micBtnRef}
            onClick={handleVoiceUnlock}
            disabled={micState === 'listening' || micState === 'done'}
            className="relative z-10 w-14 h-14 rounded-full border border-[#D4AF37]/40 bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:bg-[#D4AF37]/10"
            style={{ opacity: 0 }}
          >
            {micState === 'listening' && (
              <span className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/50 animate-ping" />
            )}
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"
              stroke={micState === 'listening' ? '#FFD700' : micState === 'done' ? '#4ade80' : '#D4AF37'}
              strokeWidth="1.5">
              {micState === 'done'
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                : <>
                    <path strokeLinecap="round" d="M12 1a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V4a3 3 0 0 1 3-3z"/>
                    <path strokeLinecap="round" d="M19 10a7 7 0 0 1-14 0"/>
                    <line x1="12" y1="17" x2="12" y2="23"/>
                  </>
              }
            </svg>
          </button>
        </div>

        {/* Mic state label */}
        <p className="text-white/30 text-[9px] tracking-[0.4em] uppercase -mt-4">
          {micState === 'listening' ? "Je t'écoute…" : micState === 'done' ? "Reconnu ✓" : "Dis le mot secret"}
        </p>

        {/* Typed fallback */}
        <div ref={inputWrapRef} className="w-full max-w-xs px-5 py-4 rounded-2xl" style={{ opacity: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <p className="text-white/20 text-[9px] tracking-[0.3em] uppercase text-center mb-4">ou écris-le</p>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => { setInputValue(e.target.value); checkAnswer(e.target.value); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            className="w-full bg-transparent border-b border-white/10 pb-3 text-center text-xl tracking-widest text-white/80 placeholder:text-white/15 focus:outline-none focus:border-[#D4AF37]/35 transition-colors duration-300"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          />
          <p ref={errorRef}
             className="mt-3 text-[#D4AF37]/50 text-sm font-light italic text-center"
             style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", opacity: 0 }}>
            {errorMessage}
          </p>
        </div>

        <button
          ref={btnRef}
          onClick={handleSubmit}
          className="px-8 py-2.5 rounded-full border border-[#D4AF37]/20 text-[#D4AF37]/60 text-xs tracking-[0.35em] uppercase hover:border-[#D4AF37]/50 hover:text-[#D4AF37] transition-all duration-300"
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
             className="absolute w-80 h-80 rounded-full bg-[#D4AF37]/15 blur-[80px]"
             style={{ opacity: 0 }} />
        <p ref={successTextRef}
           className="text-[#D4AF37] text-2xl md:text-3xl font-light tracking-wide text-center relative z-10 px-8"
           style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", opacity: 0 }}>
          {successLine}
        </p>
        <p ref={continueRef}
           className="absolute bottom-[-90px] text-white/25 text-[9px] tracking-[0.5em] uppercase"
           style={{ opacity: 0 }}>
          Touche pour continuer
        </p>
      </div>
    </div>
  );
};

export default Scene2Verification;
