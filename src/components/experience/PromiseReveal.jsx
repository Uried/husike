import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import JewelryScene from './JewelryScene';

const PromiseReveal = ({ data, onNext }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen text-center p-6 space-y-12 overflow-hidden"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-xl relative"
      >
        <Suspense fallback={
          <div className="w-full h-[400px] flex items-center justify-center">
            <div className="w-12 h-12 border-2 border-white/20 border-t-purple-500 rounded-full animate-spin" />
          </div>
        }>
          <JewelryScene />
        </Suspense>
      </motion.div>

      <div className="space-y-8 max-w-lg relative z-20">
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, duration: 1.5 }}
          className="text-3xl md:text-4xl font-serif italic text-purple-100/90 drop-shadow-2xl px-4"
        >
          "{data.message}"
        </motion.p>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNext}
          className="px-10 py-3 rounded-full bg-white/10 border border-white/20 text-white font-light tracking-widest uppercase text-xs backdrop-blur-md transition-all group"
        >
          <span>{data.buttonText}</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default PromiseReveal;
