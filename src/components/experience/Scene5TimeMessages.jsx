import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, MessageCircle, Clock } from 'lucide-react';

const TimeUntil = ({ date }) => {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const calc = () => {
      const now = new Date().getTime();
      const target = new Date(date).getTime();
      const distance = target - now;

      if (distance <= 0) {
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        setTimeLeft(`${days}j ${hours}h`);
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${minutes}min`);
      }
    };

    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [date]);

  if (!timeLeft) return null;

  return (
    <span className="text-white/30 text-[10px] tracking-widest uppercase flex items-center space-x-1">
      <Clock className="w-3 h-3" />
      <span>{timeLeft}</span>
    </span>
  );
};

const MessageCard = ({ message, index, isUnlocked, onOpen }) => {
  const [isRevealed, setIsRevealed] = useState(false);

  const handleClick = () => {
    if (isUnlocked) {
      setIsRevealed(!isRevealed);
      if (onOpen) onOpen(message.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.2 + 0.5, duration: 0.8 }}
    >
      <motion.button
        onClick={handleClick}
        whileHover={isUnlocked ? { scale: 1.02 } : {}}
        whileTap={isUnlocked ? { scale: 0.98 } : {}}
        className={`w-full text-left rounded-2xl p-6 border transition-all duration-500 ${
          isUnlocked
            ? 'bg-[#D4AF37]/5 border-[#D4AF37]/20 cursor-pointer hover:bg-[#D4AF37]/10'
            : 'bg-white/[0.02] border-white/5 cursor-not-allowed opacity-50'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-lg">{message.icon || '✉️'}</span>
            <span
              className={`text-sm font-light tracking-wide ${
                isUnlocked ? 'text-[#D4AF37]/80' : 'text-white/30'
              }`}
            >
              {message.label}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {!isUnlocked && <TimeUntil date={message.unlockDate} />}
            {isUnlocked ? (
              <Unlock className="w-4 h-4 text-[#D4AF37]/60" />
            ) : (
              <Lock className="w-4 h-4 text-white/20" />
            )}
          </div>
        </div>

        {/* Locked state: blurred placeholder */}
        {!isUnlocked && (
          <div className="space-y-2">
            <div className="h-3 bg-white/5 rounded-full w-3/4 blur-sm" />
            <div className="h-3 bg-white/5 rounded-full w-1/2 blur-sm" />
          </div>
        )}

        {/* Unlocked but not yet revealed */}
        {isUnlocked && !isRevealed && (
          <motion.p
            className="text-white/30 text-xs tracking-widest uppercase"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Touche pour lire
          </motion.p>
        )}

        {/* Revealed content */}
        <AnimatePresence>
          {isUnlocked && isRevealed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p
                className="text-white/80 text-base font-light leading-relaxed italic"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                "{message.content}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
};

const Scene5TimeMessages = ({ data, dailyMessage }) => {
  const messages = data?.messages || [];
  const dailyMessagePrompt = data?.dailyMessagePrompt || 'Pensée du jour';
  const now = new Date().getTime();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
      className="fixed inset-0 bg-black overflow-y-auto"
    >
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.03)_0%,transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#D4AF37]/3 to-transparent" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center px-6 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="text-3xl mb-4"
          >
            🕰
          </motion.div>
          <h2
            className="text-2xl text-[#D4AF37]/80 font-light tracking-wide"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Messages du temps
          </h2>
          <p className="text-white/30 text-xs tracking-[0.3em] uppercase mt-3">
            L'expérience ne s'arrête pas ici
          </p>
        </motion.div>

        {/* Daily message card */}
        {dailyMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="w-full max-w-md mb-10"
          >
            <div className="bg-[#D4AF37]/5 backdrop-blur-sm rounded-2xl p-8 border border-[#D4AF37]/10 text-center space-y-4">
              <div className="flex items-center justify-center space-x-2 text-[#D4AF37]/40">
                <MessageCircle className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-[0.3em] font-semibold">
                  {dailyMessagePrompt}
                </span>
              </div>
              <p
                className="text-white/80 text-lg italic leading-relaxed"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                "{dailyMessage}"
              </p>
            </div>
          </motion.div>
        )}

        {/* Time-locked messages */}
        <div className="w-full max-w-md space-y-4">
          {/* Section title */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-white/20 text-[10px] tracking-[0.4em] uppercase font-semibold mb-6 text-center"
          >
            Messages à venir
          </motion.p>

          {messages.map((msg, i) => {
            const unlockTime = new Date(msg.unlockDate).getTime();
            const isUnlocked = now >= unlockTime;

            return (
              <MessageCard
                key={msg.id}
                message={msg}
                index={i}
                isUnlocked={isUnlocked}
              />
            );
          })}
        </div>

        {/* Bottom breathing element */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="mt-16 text-center"
        >
          <motion.div
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-[#D4AF37]/30 text-xs tracking-[0.5em] uppercase"
          >
            Je reviens
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Scene5TimeMessages;
