import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Scene1Opening = ({ data, onNext }) => {
  const [phase, setPhase] = useState(0);
  // phase 0: black silence
  // phase 1: heartbeat + distant light
  // phase 2: voice line text
  // phase 3: name SVG animation
  // phase 4: ready to proceed (tap anywhere)

  useEffect(() => {
    const timers = [];
    // Phase 1: heartbeat + light after 2s
    timers.push(setTimeout(() => setPhase(1), 2000));
    // Phase 2: voice line after 5s
    timers.push(setTimeout(() => setPhase(2), 5000));
    // Phase 3: name appears after 8s
    timers.push(setTimeout(() => setPhase(3), 8000));
    // Phase 4: can proceed after 11s
    timers.push(setTimeout(() => setPhase(4), 11000));

    return () => timers.forEach(clearTimeout);
  }, []);

  // Heartbeat audio simulation via vibration
  useEffect(() => {
    if (phase >= 1 && navigator.vibrate) {
      const interval = setInterval(() => {
        navigator.vibrate([100, 200, 100]);
      }, 1500);
      return () => {
        clearInterval(interval);
        navigator.vibrate(0);
      };
    }
  }, [phase]);

  const name = data?.recipientName || 'Toi';
  const voiceLine = data?.voiceLine || "Si tu entends ceci… c'est que tu as mis le collier.";

  const handleTap = () => {
    if (phase >= 4) {
      onNext();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
      className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden cursor-pointer select-none"
      onClick={handleTap}
    >
      {/* Heartbeat pulse ring */}
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            key="heartbeat-ring"
            className="absolute"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-[#D4AF37]/20"
                style={{
                  width: 120 + i * 80,
                  height: 120 + i * 80,
                  left: -(60 + i * 40),
                  top: -(60 + i * 40),
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0.05, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Distant light */}
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            key="distant-light"
            className="absolute"
            initial={{ opacity: 0, scale: 0.1 }}
            animate={{
              opacity: [0, 0.6, 0.4, 0.7, 0.5],
              scale: [0.1, 0.5, 0.4, 0.6, 0.5],
            }}
            transition={{
              duration: 4,
              ease: 'easeOut',
            }}
          >
            <div className="w-32 h-32 rounded-full bg-[#D4AF37]/20 blur-[60px]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-[#D4AF37] blur-[2px]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice line text */}
      <AnimatePresence>
        {phase >= 2 && phase < 3 && (
          <motion.p
            key="voiceline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="absolute text-white/70 text-lg md:text-xl font-light tracking-wide text-center px-8 max-w-md"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            {voiceLine}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Name SVG Animation */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            key="name-reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="absolute flex flex-col items-center space-y-8"
          >
            <svg
              viewBox={`0 0 ${name.length * 60} 80`}
              className="w-full max-w-sm h-auto overflow-visible"
            >
              <defs>
                <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#D4AF37" />
                  <stop offset="50%" stopColor="#FFD700" />
                  <stop offset="100%" stopColor="#D4AF37" />
                </linearGradient>
              </defs>
              {name.split('').map((char, i) => (
                <motion.text
                  key={i}
                  x={i * 60 + 30}
                  y="55"
                  textAnchor="middle"
                  fill="url(#gold-gradient)"
                  fontSize="48"
                  fontFamily="'Cormorant Garamond', Georgia, serif"
                  fontWeight="300"
                  letterSpacing="0.1em"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: i * 0.15,
                    duration: 0.8,
                    ease: 'easeOut',
                  }}
                >
                  {char}
                </motion.text>
              ))}
            </svg>

            {/* Subtle underline glow */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '60%', opacity: 1 }}
              transition={{ delay: name.length * 0.15 + 0.5, duration: 1.5 }}
              className="h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap to continue hint */}
      <AnimatePresence>
        {phase >= 4 && (
          <motion.p
            key="tap-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0.3, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute bottom-16 text-white/30 text-xs tracking-[0.4em] uppercase"
          >
            Touche l'écran
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Scene1Opening;
