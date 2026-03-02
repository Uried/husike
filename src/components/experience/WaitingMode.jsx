import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

const WaitingMode = ({ data }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const countdownDate = new Date(data.countdownDate).getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = countdownDate - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [data.countdownDate]);

  const isCounting = timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen text-center p-6 space-y-12 relative overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05)_0%,transparent_70%)]" />
      </div>

      {isCounting && (
        <div className="grid grid-cols-4 gap-4 sm:gap-6 relative z-10">
          {[
            { label: 'Jours', value: timeLeft.days },
            { label: 'Heures', value: timeLeft.hours },
            { label: 'Min', value: timeLeft.minutes },
            { label: 'Sec', value: timeLeft.seconds },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 + 0.5 }}
              className="flex flex-col items-center space-y-2"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-2xl">
                <span className="text-2xl sm:text-3xl font-light text-white">{String(item.value).padStart(2, '0')}</span>
              </div>
              <span className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-medium">{item.label}</span>
            </motion.div>
          ))}
        </div>
      )}

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: isCounting ? 1 : 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-black/20 backdrop-blur-3xl p-10 rounded-3xl flex flex-col items-center space-y-6 border border-white/10">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-purple-400">
            <MessageCircle className="w-6 h-6" />
          </div>
          
          <div className="space-y-3">
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-semibold">{data.dailyMessagePrompt}</p>
            <p className="text-xl md:text-2xl italic text-white/90 leading-relaxed font-serif">
              "{data.dailyMessage}"
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WaitingMode;
