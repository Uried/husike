import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Play, Pause, ChevronRight, Mic } from 'lucide-react';

const BAR_COUNT = 20;

const AudioMessage = ({ data, onNext }) => {
  const containerRef = useRef(null);
  const promptRef    = useRef(null);
  const cardRef      = useRef(null);
  const canvasRef    = useRef(null);
  const nextBtnRef   = useRef(null);
  const rafRef       = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const progressRef = useRef(0);
  const playingRef  = useRef(false);
  const intervalRef = useRef(null);

  /* ── Entrance ── */
  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 1 })
      .fromTo(promptRef.current,  { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }, 0.4)
      .fromTo(cardRef.current,    { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1,   ease: 'power2.out' }, 0.8);
    return () => tl.kill();
  }, []);

  /* ── Canvas waveform ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const barW   = w / BAR_COUNT - 2;
      const p      = progressRef.current;
      const lit    = Math.floor(p / 5);

      for (let i = 0; i < BAR_COUNT; i++) {
        const isLit = i < lit;
        const noise = playingRef.current
          ? Math.abs(Math.sin(Date.now() / (180 + i * 12) + i)) * 26 + 4
          : 4;
        const barH = isLit ? noise : 4;
        ctx.fillStyle = isLit ? 'rgba(212,175,55,0.85)' : 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.roundRect(i * (barW + 2), (h - barH) / 2, barW, barH, 2);
        ctx.fill();
      }
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* ── Playback simulation ── */
  const togglePlay = () => {
    if (progressRef.current >= 100) {
      progressRef.current = 0;
      setProgress(0);
    }
    const next = !playingRef.current;
    playingRef.current = next;
    setIsPlaying(next);

    if (next) {
      intervalRef.current = setInterval(() => {
        if (progressRef.current >= 100) {
          clearInterval(intervalRef.current);
          playingRef.current = false;
          setIsPlaying(false);
          gsap.to(nextBtnRef.current, { opacity: 1, duration: 0.8, ease: 'power2.out' });
          return;
        }
        progressRef.current = Math.min(progressRef.current + 1, 100);
        setProgress(progressRef.current);
      }, 150);
    } else {
      clearInterval(intervalRef.current);
    }
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <div ref={containerRef}
         className="flex flex-col items-center justify-center min-h-screen p-6 gap-14"
         style={{ opacity: 0 }}>

      <p ref={promptRef}
         className="text-2xl md:text-3xl text-white/65 font-light tracking-wide text-center max-w-md"
         style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", opacity: 0 }}>
        {data.prompt}
      </p>

      <div ref={cardRef} className="w-full max-w-xs" style={{ opacity: 0 }}>
        <div className="bg-white/[0.04] backdrop-blur-2xl rounded-3xl p-6 border border-[#D4AF37]/10 shadow-2xl space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/35">Enregistrement</span>
            <Mic className="w-4 h-4 text-red-400/60" />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-[#D4AF37]/90 flex-shrink-0 flex items-center justify-center hover:bg-[#D4AF37] transition-colors"
            >
              {isPlaying
                ? <Pause className="w-6 h-6 text-black fill-black" />
                : <Play  className="w-6 h-6 text-black fill-black ml-0.5" />}
            </button>

            <canvas ref={canvasRef} width={180} height={48} className="flex-1" />
          </div>
        </div>
      </div>

      <button
        ref={nextBtnRef}
        onClick={onNext}
        className="flex items-center gap-3 text-white/35 hover:text-white/80 transition-all uppercase tracking-[0.3em] text-xs group"
        style={{ opacity: 0 }}
      >
        <span>Découvrir la promesse</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};

export default AudioMessage;
