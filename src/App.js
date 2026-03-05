import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ExperienceEngine from './components/experience/ExperienceEngine';

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
    <Router>
      <Routes>
        <Route path="/experience/:token" element={<ExperienceEngine />} />

        <Route path="/" element={<HomePage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function HomePage() {
  useEffect(() => {
    import('gsap').then(({ gsap }) => {
      gsap.from('.home-title',  { opacity: 0, y: 30, duration: 1.8, ease: 'power3.out', delay: 0.3 });
      gsap.from('.home-sub',    { opacity: 0, y: 20, duration: 1.5, ease: 'power2.out', delay: 0.8 });
      gsap.from('.home-orb',    { opacity: 0, scale: 0.4, duration: 2,   ease: 'power2.out', delay: 0.5 });
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 text-center overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#D4AF37]/3 blur-[150px] pointer-events-none" />

      <div className="home-orb relative mb-12">
        <div className="absolute inset-[-24px] bg-[#D4AF37]/10 blur-2xl rounded-full" />
        <div className="w-20 h-20 rounded-full border border-[#D4AF37]/20 flex items-center justify-center bg-black/50 backdrop-blur-md">
          <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px #D4AF37)' }}>✦</span>
        </div>
      </div>

      <h1 className="home-title text-5xl font-light tracking-[0.6em] mb-6 uppercase text-[#D4AF37]/80"
          style={{ fontFamily: "'Roboto Condensed', sans-serif", fontStyle: 'italic' }}>
        Husike
      </h1>

      <p className="home-sub text-white/30 text-sm tracking-[0.3em] uppercase max-w-xs leading-loose">
        Scannez le code QR de votre bijou<br />pour commencer l'expérience.
      </p>
    </div>
  );
}

export default App;
