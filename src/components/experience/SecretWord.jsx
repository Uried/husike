import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronRight } from 'lucide-react';

const SecretWord = ({ data, onNext }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState(false);

  const handleUnlock = () => {
    if (inputValue.toUpperCase() === data.secretWord.toUpperCase()) {
      setIsUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 1200);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen p-6 space-y-12"
    >
      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          <motion.div
            key="locked"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-sm text-center space-y-10"
          >
            <p className="text-2xl text-white/70 font-light tracking-wide">{data.prompt}</p>
            
            <div className="relative">
              <motion.input
                animate={{ x: error ? [-5, 5, -5, 5, 0] : 0 }}
                transition={{ duration: 0.5 }}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                placeholder="••••••••"
                className={`w-full bg-transparent border-b ${error ? 'border-red-500/70' : 'border-white/20'} pb-3 text-center text-3xl tracking-[0.5em] text-white placeholder:text-white/10 focus:outline-none focus:border-purple-400 transition-all uppercase`}
              />
            </div>

            <div className="flex flex-col items-center space-y-6 pt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleUnlock}
                className="px-10 py-3 rounded-full bg-white text-black font-semibold tracking-widest uppercase text-xs shadow-lg shadow-white/10"
              >
                Révéler
              </motion.button>

              <button 
                onClick={() => setShowHint(!showHint)}
                className="flex items-center space-x-2 text-white/30 hover:text-white/60 transition-colors text-[10px] uppercase tracking-widest"
              >
                <HelpCircle className="w-3 h-3" />
                <span>Indice</span>
              </button>

              <AnimatePresence>
                {showHint && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-gray-500 italic text-sm font-serif"
                  >
                    "{data.hint}"
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="unlocked"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-8 text-center"
          >
            <p className="text-lg text-white/50">Le mot secret est</p>
            <h3 className="text-6xl font-light text-purple-300 tracking-[0.3em] ml-[0.3em] uppercase">
              {data.secretWord}
            </h3>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              whileHover={{ x: 5 }}
              onClick={onNext}
              className="flex items-center space-x-3 text-white/40 hover:text-white transition-all uppercase tracking-[0.3em] text-[10px] pt-12 group"
            >
              <span>Écouter le message</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SecretWord;
