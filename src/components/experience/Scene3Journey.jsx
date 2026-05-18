import React, { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';

/* ─────────────────────────────────────────────────────────────────────────────
   ROAD JOURNEY — scroll-driven trip to a real place
   The user scrolls down = the car drives forward.
   Scenery layers scroll at different parallax speeds.
   Each memory "stage" is a stop along the road.
───────────────────────────────────────────────────────────────────────────── */

/* ── SVG scenery elements ── */
const Tree = ({ x, y, scale = 1, dark = false }) => (
  <g transform={`translate(${x},${y}) scale(${scale})`} opacity={dark ? 0.6 : 1}>
    <rect x="-4" y="30" width="8" height="24" fill={dark ? '#2d4a1e' : '#4a7c35'} rx="2"/>
    <ellipse cx="0" cy="20" rx="18" ry="22" fill={dark ? '#1e3a12' : '#3a6b28'}/>
    <ellipse cx="0" cy="10" rx="13" ry="16" fill={dark ? '#2a4f1a' : '#4a8030'}/>
  </g>
);

const Bush = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${scale})`}>
    <ellipse cx="0" cy="0" rx="16" ry="10" fill="#4a7c35"/>
    <ellipse cx="-10" cy="2" rx="10" ry="8" fill="#3a6b28"/>
    <ellipse cx="10" cy="2" rx="10" ry="8" fill="#3a6b28"/>
  </g>
);

const House = ({ x, y, color = '#e8d5b0' }) => (
  <g transform={`translate(${x},${y})`}>
    <rect x="-22" y="10" width="44" height="34" fill={color} rx="2"/>
    <polygon points="-26,10 0,-14 26,10" fill="#c0392b"/>
    <rect x="-7" y="26" width="14" height="18" fill="#8b7355" rx="1"/>
    <rect x="-18" y="16" width="10" height="10" fill="#aee6f7" rx="1"/>
    <rect x="8" y="16" width="10" height="10" fill="#aee6f7" rx="1"/>
    <rect x="-26" y="44" width="52" height="3" fill="#b8a88a" rx="1"/>
  </g>
);

const Car = ({ x, y, color = '#c0392b', facing = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${facing},1)`}>
    <rect x="-28" y="-10" width="56" height="18" fill={color} rx="5"/>
    <rect x="-18" y="-22" width="36" height="14" fill={color} rx="4"/>
    <rect x="-14" y="-20" width="13" height="10" fill="#aee6f7" opacity="0.9" rx="1"/>
    <rect x="2" y="-20" width="13" height="10" fill="#aee6f7" opacity="0.9" rx="1"/>
    <circle cx="-18" cy="8" r="6" fill="#222"/>
    <circle cx="-18" cy="8" r="3" fill="#555"/>
    <circle cx="18" cy="8" r="6" fill="#222"/>
    <circle cx="18" cy="8" r="3" fill="#555"/>
    <circle cx="-28" cy="-4" r="3" fill="#ffe066" opacity="0.9"/>
    <circle cx="28" cy="-4" r="3" fill="#e74c3c" opacity="0.8"/>
  </g>
);

const Person = ({ x, y, color = '#f5c6a0', shirt = '#3498db' }) => (
  <g transform={`translate(${x},${y})`}>
    <circle cx="0" cy="-26" r="7" fill={color}/>
    <rect x="-7" y="-18" width="14" height="16" fill={shirt} rx="3"/>
    <rect x="-5" y="-2" width="4" height="14" fill="#2c3e50" rx="2"/>
    <rect x="1" y="-2" width="4" height="14" fill="#2c3e50" rx="2"/>
    <line x1="-7" y1="-14" x2="-14" y2="-4" stroke={shirt} strokeWidth="3" strokeLinecap="round"/>
    <line x1="7" y1="-14" x2="14" y2="-2" stroke={shirt} strokeWidth="3" strokeLinecap="round"/>
  </g>
);

const Umbrella = ({ x, y, color = '#e74c3c' }) => (
  <g transform={`translate(${x},${y})`}>
    <path d="M 0,-30 Q -30,0 30,0 Q 0,-8 0,-30" fill={color} opacity="0.85"/>
    <line x1="0" y1="-30" x2="0" y2="20" stroke="#8b5e3c" strokeWidth="2.5" strokeLinecap="round"/>
  </g>
);

const Wave = ({ x, y, w = 80, opacity = 0.5 }) => (
  <path
    d={`M ${x},${y} Q ${x+w*0.25},${y-8} ${x+w*0.5},${y} Q ${x+w*0.75},${y+8} ${x+w},${y}`}
    fill="none" stroke="#74b9ff" strokeWidth="2.5" opacity={opacity} strokeLinecap="round"
  />
);

const Signpost = ({ x, y, text }) => (
  <g transform={`translate(${x},${y})`}>
    <rect x="-2" y="-40" width="4" height="50" fill="#8b7355" rx="1"/>
    <rect x="-28" y="-48" width="56" height="20" fill="#f9ca24" rx="3"/>
    <text x="0" y="-35" textAnchor="middle" fontSize="7" fill="#2c3e50" fontWeight="bold" fontFamily="sans-serif">{text}</text>
  </g>
);

const Cloud = ({ x, y, scale = 1, opacity = 0.8 }) => (
  <g transform={`translate(${x},${y}) scale(${scale})`} opacity={opacity}>
    <ellipse cx="0" cy="0" rx="30" ry="18" fill="white"/>
    <ellipse cx="-20" cy="4" rx="18" ry="13" fill="white"/>
    <ellipse cx="20" cy="4" rx="18" ry="13" fill="white"/>
  </g>
);

const PalmTree = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${scale})`}>
    <path d="M 0,0 Q 8,-30 4,-60 Q -2,-90 0,-110" stroke="#8b7355" strokeWidth="7" fill="none" strokeLinecap="round"/>
    <path d="M 4,-70 Q 30,-80 50,-65" stroke="#3a8a2a" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <path d="M 4,-70 Q -20,-85 -42,-74" stroke="#3a8a2a" strokeWidth="4" fill="none" strokeLinecap="round"/>
    <path d="M 4,-85 Q 25,-100 40,-92" stroke="#4a9a3a" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    <path d="M 4,-85 Q -18,-102 -35,-95" stroke="#4a9a3a" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    <path d="M 4,-100 Q 15,-115 22,-110" stroke="#3a8a2a" strokeWidth="3" fill="none" strokeLinecap="round"/>
  </g>
);

/* ── Sky gradient based on scene type ── */
const SKY_GRADIENTS = {
  city:    ['#87CEEB', '#b0d4f1', '#d4e9f7'],
  forest:  ['#5b8c5a', '#7aab78', '#a8d5a2'],
  beach:   ['#87CEEB', '#f9e4b7', '#ffe8a3'],
  night:   ['#0a0a2e', '#1a1a4e', '#2d2d6e'],
};

/* ── Scene layer builder ── */
function buildLayers(stages, journeyType = 'beach') {
  /* Returns an array of "rows" that get placed along the scroll journey.
     Each row has SVG elements at a given scrollY position */
  const rows = [];
  const w = 400; // viewBox width

  // Opening — city/departure
  rows.push({ y: 0,    elements: 'departure' });
  rows.push({ y: 600,  elements: 'road_city' });
  rows.push({ y: 1200, elements: 'transition_forest' });

  stages.forEach((stage, i) => {
    rows.push({ y: 1800 + i * 1400, elements: 'memory_stop', stage, index: i });
    rows.push({ y: 2200 + i * 1400, elements: 'road_between' });
  });

  rows.push({ y: 1800 + stages.length * 1400, elements: journeyType });
  return rows;
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
const Scene3Journey = ({ data, onNext }) => {
  const containerRef  = useRef(null);
  const svgRef        = useRef(null);
  const carRef        = useRef(null);
  const cameraYRef    = useRef(0);
  const targetYRef    = useRef(0);
  const rafRef        = useRef(null);
  const popupRef      = useRef(null);
  const popupTextRef  = useRef(null);
  const endBtnRef     = useRef(null);
  const introRef      = useRef(null);

  const [activeStage, setActiveStage]   = useState(null);
  const [reachedEnd, setReachedEnd]     = useState(false);
  const [started, setStarted]           = useState(false);
  const [carPos, setCarPos]             = useState({ x: 200, y: 0 }); // SVG coords

  const stages   = data?.stages || [];
  const destName = data?.destination || stages[stages.length - 1]?.label || 'La plage';
  const voiceLine = data?.voiceLine || 'Suis-moi, je t\'emmène quelque part…';

  // Total scroll height = 200px per 100 SVG units
  const SVG_TOTAL   = 1800 + Math.max(stages.length, 1) * 1400 + 800;
  const SCROLL_MULT = 0.45; // px scroll → SVG units

  // Where each stage marker sits on the SVG Y axis
  const STAGE_SVG_Y = stages.map((_, i) => 1900 + i * 1400);
  const END_SVG_Y   = STAGE_SVG_Y[STAGE_SVG_Y.length - 1] + 1200 || 3200;

  /* ── Smooth scroll / camera follow ── */
  useEffect(() => {
    if (!started) return;
    const onWheel = (e) => {
      e.preventDefault();
      targetYRef.current = Math.max(0, Math.min(targetYRef.current + e.deltaY * SCROLL_MULT, END_SVG_Y));
    };
    // Touch support
    let lastTouch = 0;
    const onTouchStart = (e) => { lastTouch = e.touches[0].clientY; };
    const onTouchMove  = (e) => {
      const dy = lastTouch - e.touches[0].clientY;
      lastTouch = e.touches[0].clientY;
      targetYRef.current = Math.max(0, Math.min(targetYRef.current + dy * SCROLL_MULT * 2, END_SVG_Y));
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [started, END_SVG_Y]);

  /* ── Animation loop: lerp camera, check stages ── */
  useEffect(() => {
    if (!started) return;
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      // Lerp
      cameraYRef.current += (targetYRef.current - cameraYRef.current) * 0.06;
      const cy = cameraYRef.current;

      // Move SVG viewBox
      if (svgRef.current) {
        svgRef.current.setAttribute('viewBox', `0 ${cy} 400 ${window.innerHeight * (400 / window.innerWidth)}`);
      }

      // Car bobs slightly
      const carY = cy + window.innerHeight * (400 / window.innerWidth) * 0.62;
      setCarPos({ x: 200, y: carY });

      // Check stage proximity
      let nearStage = null;
      STAGE_SVG_Y.forEach((sy, i) => {
        if (Math.abs(cy - sy + 200) < 150) nearStage = stages[i];
      });
      if (nearStage && nearStage !== activeStage) {
        setActiveStage(nearStage);
        if (popupRef.current) {
          gsap.fromTo(popupRef.current,
            { opacity: 0, y: 20, scale: 0.95 },
            { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power2.out' }
          );
        }
        if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
      } else if (!nearStage && activeStage) {
        setActiveStage(null);
        if (popupRef.current) gsap.to(popupRef.current, { opacity: 0, duration: 0.3 });
      }

      // End reached
      if (cy >= END_SVG_Y - 100 && !reachedEnd) {
        setReachedEnd(true);
        if (endBtnRef.current) gsap.fromTo(endBtnRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1, delay: 0.5 });
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [started, stages, STAGE_SVG_Y, activeStage, reachedEnd]);

  /* ── Intro entrance ── */
  useEffect(() => {
    if (!started) return;
    if (introRef.current) gsap.to(introRef.current, { opacity: 0, duration: 0.8, delay: 0.5 });
  }, [started]);

  const handleStart = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate([50, 40, 80]);
    gsap.to(introRef.current, { opacity: 0, scale: 0.95, duration: 0.5, onComplete: () => setStarted(true) });
  }, []);

  /* ── Sky color interpolated from scroll ── */
  const skyProgress = Math.min(cameraYRef.current / END_SVG_Y, 1);
  // Starts city blue → shifts to beach warm gold
  const skyTop    = `hsl(${200 - skyProgress * 30}, ${60 + skyProgress * 20}%, ${55 + skyProgress * 8}%)`;
  const skyBottom = `hsl(${180 - skyProgress * 40}, ${50 + skyProgress * 30}%, ${75 + skyProgress * 10}%)`;

  const vbH = 400 * (window.innerHeight / window.innerWidth);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden select-none touch-none"
         style={{ background: `linear-gradient(180deg, ${skyTop}, ${skyBottom})` }}>

      {/* ── Intro overlay ── */}
      {!started && (
        <div ref={introRef}
             className="absolute inset-0 z-30 flex flex-col items-center justify-center text-center px-8"
             style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}>
          <div className="mb-8 text-4xl">🚗</div>
          <p className="text-white/90 text-xl font-light leading-relaxed mb-2 max-w-xs"
             style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
            {voiceLine}
          </p>
          <p className="text-white/40 text-sm tracking-widest uppercase mb-12">
            Direction : {destName}
          </p>
          <button onClick={handleStart}
                  className="px-8 py-3 rounded-full text-sm tracking-[0.3em] uppercase transition-all duration-300 hover:scale-105"
                  style={{ border: '1px solid rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.85)',
                           background: 'rgba(0,0,0,0.4)' }}>
            On y va
          </button>
          <p className="mt-6 text-white/25 text-[10px] tracking-[0.4em] uppercase">
            Fais défiler pour avancer
          </p>
        </div>
      )}

      {/* ── Main SVG world ── */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 400 ${vbH}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ pointerEvents: 'none' }}
      >
        {/* ── Sky / background gradient (re-rendered as rect) ── */}
        <defs>
          <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={skyTop}/>
            <stop offset="100%" stopColor={skyBottom}/>
          </linearGradient>
          <linearGradient id="road-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#555"/>
            <stop offset="100%" stopColor="#444"/>
          </linearGradient>
        </defs>
        <rect x="0" y={cameraYRef.current - 50} width="400" height={SVG_TOTAL + 200}
              fill={`url(#sky-grad)`}/>

        {/* ── CLOUDS — far background ── */}
        {[0, 600, 1200, 1800, 2400, 3000, 3600].map((base, i) => (
          <g key={`clouds-${i}`}>
            <Cloud x={30 + (i*70)%300} y={base + 60}  scale={0.9} opacity={0.75}/>
            <Cloud x={200 + (i*90)%160} y={base + 120} scale={0.7} opacity={0.6}/>
          </g>
        ))}

        {/* ── FAR TREELINE ── */}
        {Array.from({length: 60}).map((_, i) => (
          <Tree key={`far-${i}`}
                x={10 + (i * 73) % 380}
                y={350 + Math.floor(i / 8) * 1400 - 60}
                scale={0.55}
                dark/>
        ))}

        {/* ── ROAD running full length ── */}
        {/* Road surface */}
        <rect x="130" y={-100} width="140" height={SVG_TOTAL + 400} fill="url(#road-grad)"/>
        {/* Road shoulders */}
        <rect x="126" y={-100} width="4"   height={SVG_TOTAL + 400} fill="#8b7355" opacity="0.5"/>
        <rect x="270" y={-100} width="4"   height={SVG_TOTAL + 400} fill="#8b7355" opacity="0.5"/>
        {/* Center dashes — animate with scroll */}
        {Array.from({length: Math.ceil(SVG_TOTAL / 80)}).map((_, i) => (
          <rect key={`dash-${i}`}
                x="197" y={i * 80 - 30} width="6" height="40"
                fill="rgba(255,255,200,0.55)" rx="2"/>
        ))}
        {/* Sidewalk left */}
        <rect x="100" y={-100} width="30"  height={SVG_TOTAL + 400} fill="#c8baa0" opacity="0.7"/>
        {/* Sidewalk right */}
        <rect x="270" y={-100} width="30"  height={SVG_TOTAL + 400} fill="#c8baa0" opacity="0.7"/>
        {/* Grass left */}
        <rect x="0"   y={-100} width="100" height={SVG_TOTAL + 400} fill="#5a8f3c" opacity="0.6"/>
        {/* Grass right */}
        <rect x="300" y={-100} width="100" height={SVG_TOTAL + 400} fill="#5a8f3c" opacity="0.6"/>

        {/* ── DEPARTURE SECTION (y≈0→600) ── */}
        <House x={55}  y={280} color="#e8d5b0"/>
        <House x={340} y={310} color="#d4c4a0"/>
        <House x={360} y={260} color="#c8b896"/>
        <Tree x={80}   y={360} scale={0.8}/>
        <Tree x={320}  y={340} scale={0.7}/>
        <Bush x={90}   y={368} scale={0.9}/>
        <Signpost x={95}  y={450} text="Départ"/>
        <Person x={95}  y={480} shirt="#e74c3c"/>
        <Person x={315} y={460} shirt="#3498db" color="#c8a882"/>

        {/* ── ROAD SECTION 1 — suburb (y≈600→1200) ── */}
        <House x={50}  y={750} color="#d4e8c2"/>
        <House x={355} y={800} color="#f0e6d2"/>
        <Car   x={310} y={820} color="#2ecc71" facing={-1}/>
        <Tree x={70}   y={850} scale={0.9}/>
        <Tree x={340}  y={870} scale={0.75}/>
        <Bush x={65}   y={862}/>
        <Person x={68} y={900} shirt="#9b59b6"/>
        <Signpost x={92} y={960} text="20 km"/>

        {/* ── ROAD SECTION 2 — countryside (y≈1200→1800) ── */}
        {Array.from({length: 6}).map((_,i) => (
          <Tree key={`ct-${i}`} x={55  + (i%2)*8} y={1250 + i*90} scale={1.1 - i*0.05}/>
        ))}
        {Array.from({length: 6}).map((_,i) => (
          <Tree key={`ctr-${i}`} x={345 - (i%2)*8} y={1280 + i*90} scale={1.0 - i*0.04}/>
        ))}
        <Car x={170} y={1500} color="#e74c3c"/>
        <Signpost x={93} y={1680} text={destName.substring(0,8)}/>

        {/* ── MEMORY STOPS ── */}
        {stages.map((stage, i) => {
          const sy = STAGE_SVG_Y[i];
          return (
            <g key={`stage-${i}`}>
              {/* Memory marker on road */}
              <circle cx="200" cy={sy} r="18" fill="rgba(212,175,55,0.25)" stroke="#D4AF37" strokeWidth="1.5"/>
              <circle cx="200" cy={sy} r="6"  fill="#D4AF37"/>
              <text x="200" y={sy - 28} textAnchor="middle" fontSize="9"
                    fill="#D4AF37" fontFamily="'Cormorant Garamond', Georgia, serif"
                    fontStyle="italic">{stage.label}</text>

              {/* Scenery around stop */}
              <Person x={70}  y={sy + 40} shirt={['#e74c3c','#3498db','#2ecc71'][i%3]}/>
              <Person x={330} y={sy + 20} shirt={['#9b59b6','#e67e22','#1abc9c'][i%3]} color="#c8a882"/>
              <Tree x={55}   y={sy + 80} scale={0.85}/>
              <Tree x={345}  y={sy + 60} scale={0.75}/>

              {/* After the beach stop, start adding beach scenery */}
              {i === stages.length - 1 && (
                <g>
                  <PalmTree x={60}  y={sy + 600} scale={0.9}/>
                  <PalmTree x={340} y={sy + 550} scale={0.8}/>
                  {[0,1,2,3,4,5,6].map(w => (
                    <Wave key={w} x={0} y={sy + 720 + w*30} w={400} opacity={0.3 + w*0.05}/>
                  ))}
                  <rect x="0" y={sy+700} width="400" height="400" fill="#74b9ff" opacity="0.18"/>
                  <Umbrella x={70}  y={sy + 780} color="#e74c3c"/>
                  <Umbrella x={320} y={sy + 800} color="#f9ca24"/>
                  <Person x={90}   y={sy + 820} shirt="#FFD700" color="#c8a060"/>
                  <Person x={300}  y={sy + 830} shirt="#ff7675" color="#dba060"/>
                  {/* Sand */}
                  <rect x="0" y={sy+730} width="400" height="60" fill="#f9e4b7" opacity="0.7"/>
                  <rect x="0" y={sy+760} width="400" height="30" fill="#ffe8a3" opacity="0.5"/>
                </g>
              )}
            </g>
          );
        })}

        {/* ── OUR CAR (player) ── */}
        <g ref={carRef}>
          <Car x={carPos.x} y={carPos.y} color="#c0392b"/>
        </g>
      </svg>

      {/* ── Memory popup (HTML overlay, readable) ── */}
      {activeStage && (
        <div ref={popupRef}
             className="absolute left-1/2 z-20 max-w-xs w-full px-6 py-5 rounded-2xl"
             style={{
               bottom: '18%',
               transform: 'translateX(-50%)',
               background: 'rgba(0,0,0,0.72)',
               backdropFilter: 'blur(16px)',
               border: '1px solid rgba(212,175,55,0.2)',
               opacity: 0,
             }}>
          <p className="text-[#D4AF37] text-xs tracking-[0.4em] uppercase mb-2">{activeStage.label}</p>
          <p className="text-white/90 font-light leading-relaxed mb-1"
             style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1.15rem' }}>
            {activeStage.voiceLine}
          </p>
          {activeStage.description && (
            <p className="text-white/45 text-sm leading-relaxed mt-2">{activeStage.description}</p>
          )}
        </div>
      )}

      {/* ── Scroll hint ── */}
      {started && !reachedEnd && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 pointer-events-none"
             style={{ opacity: 0.35 }}>
          <div className="w-px h-8 bg-white/40" style={{ animation: 'scrollPulse 1.8s ease-in-out infinite' }}/>
          <p className="text-white/40 text-[9px] tracking-[0.5em] uppercase">Défiler</p>
        </div>
      )}

      {/* ── End / arrived ── */}
      {reachedEnd && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center pb-16">
          <button ref={endBtnRef}
                  onClick={onNext}
                  className="px-10 py-4 rounded-full text-sm tracking-[0.35em] uppercase transition-all duration-300 hover:scale-105"
                  style={{ opacity: 0, background: 'rgba(0,0,0,0.7)',
                           border: '1px solid rgba(212,175,55,0.4)',
                           color: 'rgba(212,175,55,0.9)',
                           backdropFilter: 'blur(12px)' }}>
            On est arrivés ✦
          </button>
        </div>
      )}

      <style>{`
        @keyframes scrollPulse {
          0%,100% { transform: scaleY(1); opacity: 0.35; }
          50%      { transform: scaleY(1.4); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default Scene3Journey;
