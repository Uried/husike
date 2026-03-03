import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PARTICLE_COUNT = 60;

const SoundParticle = ({ index, total, isActive, intensity }) => {
  const angle = (index / total) * Math.PI * 2;
  const baseRadius = 100;
  const maxOffset = 60;
  const offset = isActive ? Math.sin(Date.now() / 300 + index) * maxOffset * intensity : 0;
  const radius = baseRadius + offset;
  const size = 2 + (isActive ? intensity * 4 : 0);

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, rgba(212,175,55,${0.6 + intensity * 0.4}), rgba(255,215,0,${0.3 + intensity * 0.3}))`,
        left: '50%',
        top: '50%',
        marginLeft: -size / 2,
        marginTop: -size / 2,
      }}
      animate={{
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        opacity: isActive ? [0.3, 0.8, 0.3] : 0.15,
        scale: isActive ? [0.8, 1.2, 0.8] : 0.5,
      }}
      transition={{
        duration: isActive ? 0.5 + Math.random() * 0.5 : 2,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: index * 0.02,
      }}
    />
  );
};

const Scene4Intimate = ({ data, onNext }) => {
  const [phase, setPhase] = useState(0);
  // phase 0: "Pose ton doigt ici" + circle
  // phase 1: finger is touching - vibration + heartbeat intensifies
  // phase 2: music playing, particles reacting, message revealed
  // phase 3: ready to continue

  const [isTouching, setIsTouching] = useState(false);
  const [intensity, setIntensity] = useState(0);
  const [heartbeatSpeed, setHeartbeatSpeed] = useState(1.5);
  const touchTimerRef = useRef(null);
  const progressRef = useRef(0);

  const voiceLine = data?.voiceLine || "Pose ton doigt ici.";
  const revealMessage = data?.revealMessage || "Peu importe la distance… tu es là.";

  // Touch handlers
  const handleTouchStart = useCallback(() => {
    if (phase >= 2) return;
    setIsTouching(true);
    setPhase(1);

    // Start vibration pattern
    if (navigator.vibrate) {
      navigator.vibrate([100, 100, 100, 100, 200]);
    }

    // Progressive intensity buildup
    touchTimerRef.current = setInterval(() => {
      progressRef.current += 1;
      const newIntensity = Math.min(progressRef.current / 30, 1);
      setIntensity(newIntensity);
      setHeartbeatSpeed(Math.max(1.5 - newIntensity * 1, 0.5));

      // Continuous vibration
      if (navigator.vibrate && progressRef.current % 3 === 0) {
        const vibeStrength = Math.floor(50 + newIntensity * 150);
        navigator.vibrate([vibeStrength]);
      }

      // Transition to phase 2 after enough touch time
      if (progressRef.current >= 30) {
        clearInterval(touchTimerRef.current);
        setPhase(2);
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100, 50, 300]);
        }
        // Phase 3 after message reveal
        setTimeout(() => setPhase(3), 4000);
      }
    }, 100);
  }, [phase]);

  const handleTouchEnd = useCallback(() => {
    setIsTouching(false);
    if (touchTimerRef.current) {
      clearInterval(touchTimerRef.current);
    }
    // Don't reset if already revealed
    if (phase < 2) {
      progressRef.current = Math.max(0, progressRef.current - 5);
      setIntensity(Math.min(progressRef.current / 30, 1));
    }
  }, [phase]);

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearInterval(touchTimerRef.current);
      if (navigator.vibrate) navigator.vibrate(0);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
      className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden select-none"
    >
      {/* Background particles - react to sound/touch */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
          <SoundParticle
            key={i}
            index={i}
            total={PARTICLE_COUNT}
            isActive={phase >= 1}
            intensity={intensity}
          />
        ))}
      </div>

      {/* Heartbeat pulse background */}
      <motion.div
        className="absolute w-96 h-96 rounded-full bg-[#D4AF37]/5 blur-[80px]"
        animate={{
          scale: [1, 1.15, 1, 1.1, 1],
          opacity: [0.05, 0.15, 0.05, 0.12, 0.05],
        }}
        transition={{
          duration: heartbeatSpeed,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Voice line */}
      <AnimatePresence>
        {phase < 2 && (
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 1 }}
            className="absolute top-24 text-white/50 text-lg font-light tracking-wide text-center px-8"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            {voiceLine}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Touch circle */}
      <div className="relative z-10">
        {/* Outer glow rings */}
        {[0, 1, 2].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border border-[#D4AF37]"
            style={{
              width: 120 + ring * 40,
              height: 120 + ring * 40,
              left: -(60 + ring * 20) + 60,
              top: -(60 + ring * 20) + 60,
            }}
            animate={{
              opacity: isTouching
                ? [0.1 + intensity * 0.2, 0.3 + intensity * 0.3, 0.1 + intensity * 0.2]
                : [0.05, 0.1, 0.05],
              scale: isTouching ? [1, 1.05, 1] : 1,
              borderColor: isTouching
                ? `rgba(212, 175, 55, ${0.2 + intensity * 0.3})`
                : 'rgba(212, 175, 55, 0.1)',
            }}
            transition={{
              duration: heartbeatSpeed,
              repeat: Infinity,
              delay: ring * 0.2,
            }}
          />
        ))}

        {/* Main touch circle */}
        <motion.div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          animate={{
            scale: isTouching ? 0.95 : 1,
            boxShadow: isTouching
              ? `0 0 ${40 + intensity * 60}px rgba(212, 175, 55, ${0.2 + intensity * 0.3})`
              : '0 0 20px rgba(212, 175, 55, 0.1)',
          }}
          transition={{ duration: 0.3 }}
          className="w-[120px] h-[120px] rounded-full border-2 border-[#D4AF37]/30 bg-[#D4AF37]/5 flex items-center justify-center cursor-pointer backdrop-blur-sm"
        >
          {/* Inner pulse */}
          <motion.div
            animate={{
              scale: [1, 1.3, 1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3, 0.5, 0.3],
            }}
            transition={{
              duration: heartbeatSpeed,
              repeat: Infinity,
            }}
            className="w-8 h-8 rounded-full bg-[#D4AF37]/40"
          />

          {/* Progress ring */}
          {phase < 2 && (
            <svg
              className="absolute w-full h-full"
              viewBox="0 0 120 120"
            >
              <circle
                cx="60"
                cy="60"
                r="58"
                fill="none"
                stroke="rgba(212,175,55,0.1)"
                strokeWidth="2"
              />
              <motion.circle
                cx="60"
                cy="60"
                r="58"
                fill="none"
                stroke="#D4AF37"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={364.4}
                animate={{ strokeDashoffset: 364.4 * (1 - intensity) }}
                transition={{ duration: 0.2 }}
                style={{
                  transformOrigin: 'center',
                  transform: 'rotate(-90deg)',
                }}
              />
            </svg>
          )}
        </motion.div>
      </div>

      {/* Revealed message */}
      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 2, ease: 'easeOut' }}
            className="absolute bottom-32 text-center px-8 max-w-md"
          >
            <p
              className="text-[#D4AF37] text-2xl md:text-3xl font-light tracking-wide leading-relaxed"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              "{revealMessage}"
            </p>
            {data?.senderName && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2, duration: 1.5 }}
                className="mt-6 text-white/30 text-sm tracking-[0.3em] uppercase"
              >
                — {data.senderName}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue button */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            whileHover={{ opacity: 1, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNext}
            className="absolute bottom-12 px-8 py-3 rounded-full border border-[#D4AF37]/20 text-[#D4AF37]/40 text-xs tracking-[0.3em] uppercase transition-all"
          >
            Continuer
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Scene4Intimate;
