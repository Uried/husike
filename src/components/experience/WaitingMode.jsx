import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { MessageCircle } from 'lucide-react';

const WaitingMode = ({ data }) => {
  const containerRef = useRef(null);
  const gridRef      = useRef(null);
  const cardRef      = useRef(null);
  const cellRefs     = useRef([]);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(data.countdownDate).getTime();
    const calc = () => {
      const dist = target - Date.now();
      if (dist <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({
        days:    Math.floor(dist / 86400000),
        hours:   Math.floor((dist % 86400000) / 3600000),
        minutes: Math.floor((dist % 3600000)  / 60000),
        seconds: Math.floor((dist % 60000)    / 1000),
      });
    };
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [data.countdownDate]);

  const isCounting = timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0;

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 1.2 });
    if (gridRef.current) {
      tl.fromTo(cellRefs.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power2.out' },
      0.5);
    }
    tl.fromTo(cardRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' },
    isCounting ? 1 : 0.5);
    return () => tl.kill();
  }, [isCounting]);

  const units = [
    { label: 'Jours',  value: timeLeft.days },
    { label: 'Heures', value: timeLeft.hours },
    { label: 'Min',    value: timeLeft.minutes },
    { label: 'Sec',    value: timeLeft.seconds },
  ];

  return (
    <div ref={containerRef}
         className="flex flex-col items-center justify-center min-h-screen text-center p-6 gap-10 relative overflow-hidden"
         style={{ opacity: 0 }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.04)_0%,transparent_70%)]" />
      </div>

      {isCounting && (
        <div ref={gridRef} className="grid grid-cols-4 gap-4 sm:gap-6 relative z-10">
          {units.map((item, i) => (
            <div key={item.label}
                 ref={el => cellRefs.current[i] = el}
                 className="flex flex-col items-center gap-2"
                 style={{ opacity: 0 }}>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#D4AF37]/5 border border-[#D4AF37]/15 backdrop-blur-xl flex items-center justify-center">
                <span className="text-2xl sm:text-3xl font-light text-[#D4AF37]/80">
                  {String(item.value).padStart(2, '0')}
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-[0.35em] text-white/30 font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      <div ref={cardRef} className="w-full max-w-md relative z-10" style={{ opacity: 0 }}>
        <div className="bg-black/25 backdrop-blur-3xl p-10 rounded-3xl flex flex-col items-center gap-6 border border-[#D4AF37]/10">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/5 border border-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37]/60">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#D4AF37]/40 font-semibold">
              {data.dailyMessagePrompt}
            </p>
            <p className="text-xl md:text-2xl italic text-white/85 leading-relaxed"
               style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              "{data.dailyMessage}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingMode;
