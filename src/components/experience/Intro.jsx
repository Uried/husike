import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const Intro = ({ data, onNext }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="relative flex flex-col items-center justify-center min-h-screen text-center p-6 overflow-hidden bg-black"
    >
      {/* --- BACKGROUND --- */}
      <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

      {/* --- CONTENT --- */}
      <div className="relative z-10 flex flex-col items-center space-y-16">
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 1.2, ease: "easeOut" }}
          className="relative"
        >
          <div className="absolute inset-[-20px] bg-purple-500/20 blur-3xl rounded-full animate-pulse" />
          <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center bg-black/30 backdrop-blur-md">
            <Sparkles className="w-10 h-10 text-purple-300" />
          </div>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 1.2, ease: "easeOut" }}
          className="text-3xl font-light text-white leading-relaxed tracking-wide"
        >
          {data?.prompt || "Une promesse vous attend."}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 1.2, ease: "easeOut" }}
        >
          <motion.button
            whileHover={{ 
              scale: 1.05, 
              boxShadow: "0 0 40px rgba(139, 92, 246, 0.3)"
            }}
            whileTap={{ scale: 0.95 }}
            onClick={onNext}
            className="px-12 py-4 rounded-full bg-white/10 border border-white/20 text-white font-light tracking-widest uppercase text-sm backdrop-blur-md transition-all"
          >
            {data?.buttonText || "Ouvrir"}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Intro;
