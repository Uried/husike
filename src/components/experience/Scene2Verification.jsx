import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STAR_COUNT = 80;

const Star = ({ delay }) => {
  const size = Math.random() * 2 + 1;
  const x = Math.random() * 100;
  const y = Math.random() * 100;
  const duration = Math.random() * 3 + 2;

  return (
    <motion.div
      className="absolute rounded-full bg-white"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: `${y}%`,
      }}
      animate={{
        opacity: [0, 0.8, 0],
        scale: [0.5, 1, 0.5],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: 'easeInOut',
      }}
    />
  );
};

const GoldParticle = ({ index, total }) => {
  const angle = (index / total) * Math.PI * 2;
  const distance = 80 + Math.random() * 120;
  const size = Math.random() * 6 + 2;

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, #FFD700, #D4AF37)`,
        left: '50%',
        top: '50%',
        marginLeft: -size / 2,
        marginTop: -size / 2,
      }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
      animate={{
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        opacity: [1, 1, 0],
        scale: [0, 1.5, 0],
      }}
      transition={{
        duration: 1.5 + Math.random() * 0.5,
        ease: 'easeOut',
        delay: Math.random() * 0.3,
      }}
    />
  );
};

const Scene2Verification = ({ data, onNext }) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [readyToAdvance, setReadyToAdvance] = useState(false);
  const inputRef = useRef(null);

  const secretNickname = (data?.secretNickname || 'mon coeur').toLowerCase().trim();
  const voiceLine = data?.voiceLine || "Si c'est vraiment toi… écris le surnom que je te donne quand personne ne regarde.";
  const errorMessage = data?.errorMessage || "Hmm… essaie encore mon amour.";

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = useCallback(() => {
    const normalized = inputValue.toLowerCase().trim();
    if (normalized === secretNickname) {
      setSuccess(true);
      setShowParticles(true);
      setError(false);
      // Vibrate on success
      if (navigator.vibrate) {
        navigator.vibrate([50, 100, 50, 100, 200]);
      }
      // Ready to advance after particle animation
      setTimeout(() => setReadyToAdvance(true), 3000);
    } else {
      setError(true);
      if (navigator.vibrate) {
        navigator.vibrate([200]);
      }
      setTimeout(() => setError(false), 2000);
    }
  }, [inputValue, secretNickname]);

  const handleAdvance = () => {
    if (readyToAdvance) {
      onNext();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
      className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden"
    >
      {/* Starry background */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: STAR_COUNT }).map((_, i) => (
          <Star key={i} delay={i * 0.1} />
        ))}
      </div>

      {/* Subtle nebula glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-[100px]" />
      </div>

      <AnimatePresence mode="wait">
        {!success ? (
          <motion.div
            key="input-phase"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 1.2 }}
            className="relative z-10 flex flex-col items-center space-y-12 px-8 max-w-md w-full"
          >
            {/* Voice line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1.5 }}
              className="text-white/60 text-lg md:text-xl font-light tracking-wide text-center leading-relaxed"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              {voiceLine}
            </motion.p>

            {/* Input field */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 1 }}
              className="w-full max-w-xs"
            >
              <motion.input
                ref={inputRef}
                animate={{ x: error ? [-8, 8, -6, 6, -3, 3, 0] : 0 }}
                transition={{ duration: 0.5 }}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="..."
                className="w-full bg-transparent border-b border-white/15 pb-4 text-center text-2xl tracking-widest text-white/90 placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/40 transition-all"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </motion.div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-[#D4AF37]/60 text-sm font-light italic"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  {errorMessage}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit button - minimal */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: inputValue.length > 0 ? 0.6 : 0 }}
              whileHover={{ opacity: 1, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              className="px-8 py-3 rounded-full border border-[#D4AF37]/20 text-[#D4AF37]/60 text-xs tracking-[0.3em] uppercase transition-all"
            >
              Révéler
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="success-phase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="relative z-10 flex flex-col items-center justify-center"
            onClick={handleAdvance}
          >
            {/* Gold particle explosion */}
            {showParticles && (
              <div className="absolute pointer-events-none">
                {Array.from({ length: 40 }).map((_, i) => (
                  <GoldParticle key={i} index={i} total={40} />
                ))}
              </div>
            )}

            {/* Central glow */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="absolute w-64 h-64 rounded-full bg-[#D4AF37]/10 blur-[60px]"
            />

            {/* Success text */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 1.5 }}
              className="text-[#D4AF37] text-2xl font-light tracking-wide text-center"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              {data?.successVoiceLine || "C'est bien toi…"}
            </motion.p>

            {/* Continue hint */}
            {readyToAdvance && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.4, 0.2, 0.4] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute bottom-16 text-white/30 text-xs tracking-[0.4em] uppercase cursor-pointer"
              >
                Continuer
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Scene2Verification;
