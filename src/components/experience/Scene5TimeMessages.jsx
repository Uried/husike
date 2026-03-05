import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Lock, Unlock, MessageCircle, Clock } from 'lucide-react';

const TimeUntil = ({ date }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    const calc = () => {
      const dist = new Date(date).getTime() - Date.now();
      if (dist <= 0) { setTimeLeft(null); return; }
      const days  = Math.floor(dist / 86400000);
      const hours = Math.floor((dist % 86400000) / 3600000);
      setTimeLeft(days > 0 ? `${days}j ${hours}h` : `${hours}h ${Math.floor((dist % 3600000) / 60000)}min`);
    };
    calc();
    const iv = setInterval(calc, 60000);
    return () => clearInterval(iv);
  }, [date]);
  if (!timeLeft) return null;
  return (
    <span className="text-white/30 text-[10px] tracking-widest uppercase flex items-center gap-1">
      <Clock className="w-3 h-3" /><span>{timeLeft}</span>
    </span>
  );
};

const MessageCard = ({ message, index, isUnlocked }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const contentRef = useRef(null);
  const cardRef    = useRef(null);

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 28 },
      { opacity: 1, y: 0, duration: 0.8, delay: index * 0.18 + 0.5, ease: 'power2.out' },
    );
  }, [index]);

  const handleClick = () => {
    if (!isUnlocked) return;
    const next = !isRevealed;
    setIsRevealed(next);
    if (contentRef.current) {
      if (next) {
        gsap.fromTo(contentRef.current,
          { opacity: 0, height: 0 },
          { opacity: 1, height: 'auto', duration: 0.5, ease: 'power2.out' },
        );
      } else {
        gsap.to(contentRef.current, { opacity: 0, height: 0, duration: 0.4, ease: 'power2.in' });
      }
    }
  };

  return (
    <div ref={cardRef} style={{ opacity: 0 }}>
      <button
        onClick={handleClick}
        className={`w-full text-left rounded-2xl p-6 border transition-all duration-400 ${
          isUnlocked
            ? 'bg-[#D4AF37]/5 border-[#D4AF37]/20 cursor-pointer hover:bg-[#D4AF37]/8'
            : 'bg-white/[0.02] border-white/5 cursor-not-allowed opacity-50'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-lg">{message.icon || '✉️'}</span>
            <span className={`text-sm font-light tracking-wide ${isUnlocked ? 'text-[#D4AF37]/80' : 'text-white/30'}`}>
              {message.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isUnlocked && <TimeUntil date={message.unlockDate} />}
            {isUnlocked
              ? <Unlock className="w-4 h-4 text-[#D4AF37]/60" />
              : <Lock   className="w-4 h-4 text-white/20" />}
          </div>
        </div>

        {!isUnlocked && (
          <div className="space-y-2">
            <div className="h-3 bg-white/5 rounded-full w-3/4 blur-sm" />
            <div className="h-3 bg-white/5 rounded-full w-1/2 blur-sm" />
          </div>
        )}

        {isUnlocked && !isRevealed && (
          <p className="text-white/25 text-xs tracking-widest uppercase animate-pulse">
            Touche pour lire
          </p>
        )}

        <div ref={contentRef} style={{ overflow: 'hidden', height: 0, opacity: 0 }}>
          <p className="text-white/80 text-base font-light leading-relaxed italic"
             style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            "{message.content}"
          </p>
        </div>
      </button>
    </div>
  );
};

const Scene5TimeMessages = ({ data, dailyMessage }) => {
  const containerRef  = useRef(null);
  const headerRef     = useRef(null);
  const clockRef      = useRef(null);
  const dailyCardRef  = useRef(null);
  const sectionLblRef = useRef(null);
  const breathRef     = useRef(null);

  const messages           = data?.messages           || [];
  const dailyMessagePrompt = data?.dailyMessagePrompt || 'Pensée du jour';
  const now                = Date.now();

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(containerRef.current,  { opacity: 0 }, { opacity: 1, duration: 1.2 })
      .fromTo(headerRef.current,     { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, 0.3)
      .fromTo(dailyCardRef.current,  { opacity: 0, y: 20  }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 0.6)
      .fromTo(sectionLblRef.current, { opacity: 0 },         { opacity: 1, duration: 0.6 }, 0.8)
      .fromTo(breathRef.current,     { opacity: 0 },         { opacity: 1, duration: 0.8 }, 1.5);

    gsap.to(clockRef.current, { rotate: 10, duration: 3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to(breathRef.current, { opacity: 0.3, duration: 4, yoyo: true, repeat: -1, ease: 'sine.inOut' });

    return () => tl.kill();
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black overflow-y-auto no-scrollbar" style={{ opacity: 0 }}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.03)_0%,transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#D4AF37]/[0.03] to-transparent" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center px-6 py-16">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-12" style={{ opacity: 0 }}>
          <div ref={clockRef} className="text-3xl mb-4 inline-block">🕰</div>
          <h2 className="text-2xl text-[#D4AF37]/80 font-light tracking-wide"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            Messages du temps
          </h2>
          <p className="text-white/30 text-xs tracking-[0.3em] uppercase mt-3">
            L'expérience ne s'arrête pas ici
          </p>
        </div>

        {/* Daily message */}
        {dailyMessage && (
          <div ref={dailyCardRef} className="w-full max-w-md mb-10" style={{ opacity: 0 }}>
            <div className="bg-[#D4AF37]/5 backdrop-blur-sm rounded-2xl p-8 border border-[#D4AF37]/10 text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-[#D4AF37]/40">
                <MessageCircle className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-[0.3em] font-semibold">{dailyMessagePrompt}</span>
              </div>
              <p className="text-white/80 text-lg italic leading-relaxed"
                 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                "{dailyMessage}"
              </p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="w-full max-w-md space-y-4">
          <p ref={sectionLblRef}
             className="text-white/20 text-[10px] tracking-[0.4em] uppercase font-semibold mb-6 text-center"
             style={{ opacity: 0 }}>
            Messages à venir
          </p>

          {messages.map((msg, i) => (
            <MessageCard
              key={msg.id}
              message={msg}
              index={i}
              isUnlocked={Date.now() >= new Date(msg.unlockDate).getTime()}
            />
          ))}
        </div>

        {/* Bottom breath */}
        <div ref={breathRef} className="mt-16 text-center" style={{ opacity: 0.1 }}>
          <span className="text-[#D4AF37]/30 text-xs tracking-[0.5em] uppercase">Je reviens</span>
        </div>
      </div>
    </div>
  );
};

export default Scene5TimeMessages;
