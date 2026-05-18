import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ExperienceEngine from './components/experience/ExperienceEngine';
import CosmosBackground from './components/experience/CosmosBackground';

function App() {
  useEffect(() => {
    const cursor = document.getElementById('custom-cursor');
    if (!cursor) return;

    const onMove = (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top  = e.clientY + 'px';
    };
    const onDown = () => cursor.classList.add('clicking');
    const onUp   = () => cursor.classList.remove('clicking');

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup',   onUp);

    const observer = new MutationObserver(() => {
      document.querySelectorAll('button, a, input, [data-hover]').forEach(el => {
        if (!el.__husikeHover) {
          el.__husikeHover = true;
          el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
          el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup',   onUp);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div id="custom-cursor" className="custom-cursor" />
      <Router>
        <Routes>
          <Route path="/experience/:token" element={<ExperienceEngine />} />
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
}

function HomePage() {
  const titleRef = useRef(null);
  const subRef   = useRef(null);
  const orbRef   = useRef(null);
  const lineRef  = useRef(null);

  useEffect(() => {
    import('gsap').then(({ gsap }) => {
      const tl = gsap.timeline();
      tl.fromTo(orbRef.current,
          { opacity: 0, scale: 0.4 },
          { opacity: 1, scale: 1, duration: 2, ease: 'power2.out', delay: 0.4 })
        .fromTo(titleRef.current,
          { opacity: 0, y: 30, letterSpacing: '0.2em' },
          { opacity: 1, y: 0, letterSpacing: '0.55em', duration: 1.8, ease: 'power3.out' }, '-=1')
        .fromTo(lineRef.current,
          { scaleX: 0, opacity: 0 },
          { scaleX: 1, opacity: 1, duration: 1.2, ease: 'power2.out', transformOrigin: 'center' }, '-=0.6')
        .fromTo(subRef.current,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }, '-=0.6');

      // Continuous orb pulse
      gsap.to(orbRef.current, {
        boxShadow: '0 0 60px 12px rgba(212,175,55,0.4)',
        duration: 2, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 2.5,
      });
    });
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-black text-white overflow-hidden">
      {/* Persistent cosmos background */}
      <CosmosBackground />

      {/* Content — must be above cosmos (z-10) */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">

        {/* Glowing orb */}
        <div ref={orbRef} className="relative mb-10" style={{ opacity: 0 }}>
          <div className="absolute inset-[-30px] rounded-full pointer-events-none"
               style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)' }}/>
          <div className="w-24 h-24 rounded-full border border-[#D4AF37]/25 flex items-center justify-center backdrop-blur-md"
               style={{ background: 'rgba(0,0,0,0.5)', boxShadow: '0 0 30px 4px rgba(212,175,55,0.2)' }}>
            <span className="text-3xl" style={{ filter: 'drop-shadow(0 0 10px #D4AF37)' }}>✦</span>
          </div>
          {/* Orbit ring */}
          <div className="absolute inset-[-16px] rounded-full border border-[#D4AF37]/10 pointer-events-none"
               style={{ animation: 'rotateOrbit 12s linear infinite' }}/>
          <div className="absolute inset-[-28px] rounded-full border border-[#D4AF37]/05 pointer-events-none"
               style={{ animation: 'rotateOrbit 20s linear infinite reverse' }}/>
        </div>

        {/* Title */}
        <h1
          ref={titleRef}
          className="text-5xl md:text-6xl font-light uppercase mb-4"
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            color: 'rgba(212,175,55,0.85)',
            letterSpacing: '0.55em',
            opacity: 0,
            textShadow: '0 0 40px rgba(212,175,55,0.3)',
          }}
        >
          Husike
        </h1>

        {/* Divider line */}
        <div
          ref={lineRef}
          className="w-32 h-px mb-8"
          style={{
            opacity: 0,
            background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)',
          }}
        />

        {/* Subtitle */}
        <p
          ref={subRef}
          className="text-white/30 text-xs tracking-[0.35em] uppercase leading-loose max-w-xs"
          style={{ opacity: 0 }}
        >
          Scannez le code QR de votre bijou<br />pour entrer dans l'univers.
        </p>

        {/* Dev shortcut — remove in production */}
        {import.meta.env.DEV && (
          <a
            href="/experience/je-reviens-demo"
            className="mt-12 px-6 py-2.5 rounded-full text-[10px] tracking-[0.4em] uppercase transition-all duration-300"
            style={{
              border: '1px solid rgba(212,175,55,0.2)',
              color: 'rgba(212,175,55,0.4)',
            }}
            onMouseEnter={e => { e.target.style.borderColor = 'rgba(212,175,55,0.5)'; e.target.style.color = 'rgba(212,175,55,0.8)'; }}
            onMouseLeave={e => { e.target.style.borderColor = 'rgba(212,175,55,0.2)'; e.target.style.color = 'rgba(212,175,55,0.4)'; }}
          >
            ✦ Démo — je-reviens
          </a>
        )}
      </div>
    </div>
  );
}

export default App;
