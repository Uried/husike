import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { Lock, Unlock, MessageCircle } from 'lucide-react';
import { getDailyMood } from './DailyMood';

// ── Orbital Galaxy Clock SVG ──────────────────────────────────────────────────
const GalaxyClock = ({ mood }) => {
  const now   = new Date();
  const hAngle = ((now.getHours() % 12) / 12) * 360 + (now.getMinutes() / 60) * 30;
  const mAngle = (now.getMinutes() / 60) * 360;
  const sAngle = (now.getSeconds() / 60) * 360;
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const yearAngle = (dayOfYear / 365) * 360;

  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48" style={{ filter: `drop-shadow(0 0 12px ${mood.primaryColor}40)` }}>
      <defs>
        <radialGradient id="gc-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={mood.primaryColor} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={mood.primaryColor} stopOpacity="0"/>
        </radialGradient>
      </defs>
      {/* Background glow */}
      <circle cx="100" cy="100" r="90" fill="url(#gc-glow)"/>
      {/* Orbit rings */}
      {[70, 55, 40, 22].map((r, i) => (
        <circle key={i} cx="100" cy="100" r={r} fill="none"
          stroke={mood.primaryColor} strokeWidth="0.4" strokeOpacity={0.12 + i * 0.04}/>
      ))}
      {/* Year orbit */}
      <circle cx={100 + 70 * Math.cos((yearAngle - 90) * Math.PI / 180)}
              cy={100 + 70 * Math.sin((yearAngle - 90) * Math.PI / 180)}
              r="3" fill={mood.accentColor} opacity="0.5"/>
      {/* Hour hand */}
      <line x1="100" y1="100"
        x2={100 + 30 * Math.cos((hAngle - 90) * Math.PI / 180)}
        y2={100 + 30 * Math.sin((hAngle - 90) * Math.PI / 180)}
        stroke={mood.primaryColor} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.8"/>
      {/* Minute hand */}
      <line x1="100" y1="100"
        x2={100 + 42 * Math.cos((mAngle - 90) * Math.PI / 180)}
        y2={100 + 42 * Math.sin((mAngle - 90) * Math.PI / 180)}
        stroke={mood.primaryColor} strokeWidth="0.8" strokeLinecap="round" strokeOpacity="0.5"/>
      {/* Second hand */}
      <line x1="100" y1="100"
        x2={100 + 50 * Math.cos((sAngle - 90) * Math.PI / 180)}
        y2={100 + 50 * Math.sin((sAngle - 90) * Math.PI / 180)}
        stroke={mood.accentColor} strokeWidth="0.5" strokeLinecap="round" strokeOpacity="0.7"/>
      {/* Center dot */}
      <circle cx="100" cy="100" r="2.5" fill={mood.primaryColor} opacity="0.9"/>
      {/* Hour markers */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * 360 - 90;
        const r1 = 64, r2 = 68;
        return <line key={i}
          x1={100 + r1 * Math.cos(a * Math.PI / 180)} y1={100 + r1 * Math.sin(a * Math.PI / 180)}
          x2={100 + r2 * Math.cos(a * Math.PI / 180)} y2={100 + r2 * Math.sin(a * Math.PI / 180)}
          stroke={mood.primaryColor} strokeWidth="0.8" strokeOpacity="0.4"/>;
      })}
    </svg>
  );
};

// ── Time until countdown ──────────────────────────────────────────────────────
const TimeUntil = ({ date, color }) => {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const calc = () => {
      const dist = new Date(date).getTime() - Date.now();
      if (dist <= 0) { setTimeLeft(''); return; }
      const days  = Math.floor(dist / 86400000);
      const hours = Math.floor((dist % 86400000) / 3600000);
      const mins  = Math.floor((dist % 3600000) / 60000);
      setTimeLeft(days > 0 ? `${days}j ${hours}h` : `${hours}h ${mins}min`);
    };
    calc();
    const iv = setInterval(calc, 30000);
    return () => clearInterval(iv);
  }, [date]);
  if (!timeLeft) return null;
  return (
    <span className="text-[10px] tracking-widest uppercase" style={{ color: `${color}60` }}>
      {timeLeft}
    </span>
  );
};

// ── Time Capsule card ─────────────────────────────────────────────────────────
const CapsuleCard = ({ message, index, isUnlocked, mood }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const cardRef    = useRef(null);
  const contentRef = useRef(null);
  const glowRef    = useRef(null);

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 32, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 1, delay: index * 0.2 + 0.6, ease: 'back.out(1.4)' }
    );
  }, [index]);

  const handleClick = () => {
    if (!isUnlocked) return;
    const next = !isRevealed;
    setIsRevealed(next);
    if (next && glowRef.current) {
      gsap.fromTo(glowRef.current, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'power2.out' });
    }
    if (contentRef.current) {
      if (next) {
        gsap.fromTo(contentRef.current,
          { opacity: 0, height: 0, y: -10 },
          { opacity: 1, height: 'auto', y: 0, duration: 0.6, ease: 'power2.out' }
        );
      } else {
        gsap.to(contentRef.current, { opacity: 0, height: 0, duration: 0.4 });
      }
    }
  };

  return (
    <div ref={cardRef} style={{ opacity: 0 }}>
      <button
        onClick={handleClick}
        className="relative w-full text-left rounded-2xl p-5 border transition-all duration-500 overflow-hidden group"
        style={{
          background: isUnlocked ? `rgba(${mood.nebulaColor}, 0.04)` : 'rgba(255,255,255,0.015)',
          borderColor: isUnlocked ? `${mood.primaryColor}30` : 'rgba(255,255,255,0.05)',
        }}
      >
        {/* Capsule shimmer on hover */}
        {isUnlocked && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
               style={{ background: `radial-gradient(ellipse at 50% 50%, ${mood.primaryColor}08, transparent 70%)` }}/>
        )}
        <div ref={glowRef} className="absolute inset-0 pointer-events-none rounded-2xl"
             style={{ opacity: 0, boxShadow: `inset 0 0 30px ${mood.primaryColor}15` }}/>

        <div className="relative flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xl" style={{ filter: isUnlocked ? `drop-shadow(0 0 6px ${mood.primaryColor})` : 'none' }}>
              {message.icon || '✉️'}
            </span>
            <div>
              <p className="text-sm font-light tracking-wide" style={{ color: isUnlocked ? `${mood.primaryColor}CC` : 'rgba(255,255,255,0.25)' }}>
                {message.label}
              </p>
              {!isUnlocked && <TimeUntil date={message.unlockDate} color={mood.primaryColor}/>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {isUnlocked
              ? <Unlock className="w-4 h-4" style={{ color: `${mood.primaryColor}80` }}/>
              : <Lock   className="w-4 h-4 text-white/20"/>
            }
          </div>
        </div>

        {/* Locked preview blur */}
        {!isUnlocked && (
          <div className="space-y-1.5 mt-1">
            <div className="h-2.5 rounded-full w-4/5" style={{ background: 'rgba(255,255,255,0.04)', filter: 'blur(3px)' }}/>
            <div className="h-2.5 rounded-full w-3/5" style={{ background: 'rgba(255,255,255,0.03)', filter: 'blur(3px)' }}/>
          </div>
        )}

        {isUnlocked && !isRevealed && (
          <p className="text-[10px] tracking-[0.4em] uppercase mt-1 animate-pulse" style={{ color: `${mood.primaryColor}40` }}>
            Touche pour ouvrir
          </p>
        )}

        <div ref={contentRef} style={{ overflow: 'hidden', height: 0, opacity: 0 }}>
          <p className="mt-4 text-white/80 text-base font-light leading-relaxed italic"
             style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            "{message.content}"
          </p>
        </div>
      </button>
    </div>
  );
};

// ── Main Scene ────────────────────────────────────────────────────────────────
const Scene5TimeMessages = ({ data, dailyMessage }) => {
  const containerRef  = useRef(null);
  const headerRef     = useRef(null);
  const clockWrapRef  = useRef(null);
  const dailyCardRef  = useRef(null);
  const moodBannerRef = useRef(null);
  const sectionLblRef = useRef(null);
  const breathRef     = useRef(null);
  const [clockTick, setClockTick] = useState(0);

  const messages           = data?.messages           || [];
  const dailyMessagePrompt = data?.dailyMessagePrompt || 'Pensée du jour';
  const mood               = getDailyMood();

  // Live clock tick
  useEffect(() => {
    const iv = setInterval(() => setClockTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(containerRef.current,  { opacity: 0 }, { opacity: 1, duration: 1.4 })
      .fromTo(headerRef.current,     { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }, 0.3)
      .fromTo(clockWrapRef.current,  { opacity: 0, scale: 0.7, rotate: -20 }, { opacity: 1, scale: 1, rotate: 0, duration: 1.5, ease: 'back.out(1.4)' }, 0.6)
      .fromTo(moodBannerRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, 1.4)
      .fromTo(dailyCardRef.current,  { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, 1.8)
      .fromTo(sectionLblRef.current, { opacity: 0 },        { opacity: 1, duration: 0.7 }, 2.3)
      .fromTo(breathRef.current,     { opacity: 0 },        { opacity: 1, duration: 1 }, 3);

    gsap.to(breathRef.current, { opacity: 0.25, duration: 4.5, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 3 });
    return () => tl.kill();
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black overflow-y-auto no-scrollbar" style={{ opacity: 0 }}>
      {/* Dynamic sky gradient based on mood */}
      <div className="fixed inset-0 pointer-events-none z-0"
           style={{ background: mood.skyGradient }}/>
      <div className="fixed inset-0 pointer-events-none z-0"
           style={{ background: 'radial-gradient(circle at 50% 0%, rgba(212,175,55,0.04) 0%, transparent 55%)' }}/>

      <div className="relative z-10 min-h-screen flex flex-col items-center px-6 pt-12 pb-20">

        {/* Header */}
        <div ref={headerRef} className="text-center mb-6" style={{ opacity: 0 }}>
          <p className="text-[9px] tracking-[0.6em] uppercase mb-3"
             style={{ color: `${mood.primaryColor}50` }}>
            {mood.label}
          </p>
          <h2 className="text-2xl font-light tracking-wide"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: `${mood.primaryColor}CC` }}>
            Messages du temps
          </h2>
          <p className="text-white/20 text-xs tracking-[0.3em] uppercase mt-2">
            L'expérience ne s'arrête pas ici
          </p>
        </div>

        {/* Galaxy Clock */}
        <div ref={clockWrapRef} className="mb-6" style={{ opacity: 0 }}>
          <GalaxyClock mood={mood} key={clockTick} />
        </div>

        {/* Daily mood banner */}
        <div ref={moodBannerRef} className="w-full max-w-sm mb-8 text-center" style={{ opacity: 0 }}>
          <p className="text-white/35 text-sm font-light italic leading-relaxed"
             style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            "{mood.breathingMessage}"
          </p>
          <div className="mt-3 h-px w-24 mx-auto"
               style={{ background: `linear-gradient(90deg, transparent, ${mood.primaryColor}40, transparent)` }}/>
        </div>

        {/* Daily message capsule */}
        {dailyMessage && (
          <div ref={dailyCardRef} className="w-full max-w-md mb-8" style={{ opacity: 0 }}>
            <div className="rounded-2xl p-7 border text-center space-y-4 relative overflow-hidden"
                 style={{ background: `rgba(${mood.nebulaColor}, 0.06)`, borderColor: `${mood.primaryColor}20` }}>
              <div className="absolute inset-0 pointer-events-none"
                   style={{ background: `radial-gradient(ellipse at 50% 0%, ${mood.primaryColor}06, transparent 60%)` }}/>
              <div className="relative flex items-center justify-center gap-2" style={{ color: `${mood.primaryColor}50` }}>
                <MessageCircle className="w-4 h-4"/>
                <span className="text-[10px] uppercase tracking-[0.35em] font-semibold">{dailyMessagePrompt}</span>
              </div>
              <p className="relative text-white/80 text-lg italic leading-relaxed"
                 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                "{dailyMessage}"
              </p>
              <p className="relative text-[9px] tracking-[0.4em] uppercase"
                 style={{ color: `${mood.primaryColor}35` }}>
                {mood.dailyVariation}
              </p>
            </div>
          </div>
        )}

        {/* Time capsules */}
        <div className="w-full max-w-md space-y-3">
          <p ref={sectionLblRef}
             className="text-[10px] tracking-[0.5em] uppercase text-center mb-5"
             style={{ color: 'rgba(255,255,255,0.15)', opacity: 0 }}>
            Capsules temporelles
          </p>

          {messages.map((msg, i) => (
            <CapsuleCard
              key={msg.id}
              message={msg}
              index={i}
              isUnlocked={Date.now() >= new Date(msg.unlockDate).getTime()}
              mood={mood}
            />
          ))}
        </div>

        {/* Eternal breath */}
        <div ref={breathRef} className="mt-14 text-center" style={{ opacity: 0 }}>
          <div className="w-px h-8 mx-auto mb-4"
               style={{ background: `linear-gradient(to bottom, transparent, ${mood.primaryColor}30)` }}/>
          <span className="text-[9px] tracking-[0.6em] uppercase"
                style={{ color: `${mood.primaryColor}30` }}>
            Je reviens
          </span>
        </div>
      </div>
    </div>
  );
};

export default Scene5TimeMessages;
