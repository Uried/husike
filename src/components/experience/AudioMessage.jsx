import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, ChevronRight, Mic } from 'lucide-react';

const AudioMessage = ({ data, onNext }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  // Simulation de la progression pour la V1
  useEffect(() => {
    let interval;
    if (isPlaying && progress < 100) {
      interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 1, 100));
      }, 150);
    } else if (progress >= 100) {
      setIsPlaying(false);
    }
    return () => clearInterval(interval);
  }, [isPlaying, progress]);

  const togglePlay = () => {
    if (progress >= 100) {
      setProgress(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen p-6 space-y-16"
    >
      <div className="text-center space-y-6 relative z-10 max-w-lg">
        <p className="text-2xl md:text-3xl text-white/70 font-light tracking-wide">
          {data.prompt}
        </p>
      </div>

      <div className="relative z-10 w-full max-w-xs">
        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Enregistrement</span>
            <Mic className="w-4 h-4 text-red-500/70" />
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-white flex-shrink-0 flex items-center justify-center hover:scale-105 transition-transform group"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-black fill-black" />
              ) : (
                <Play className="w-8 h-8 text-black fill-black ml-1" />
              )}
            </button>

            {/* Visualizer simulé */}
            <div className="flex items-center justify-center space-x-1 h-12 w-full">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    height: isPlaying ? [4, Math.random() * 30 + 4, 4] : 4,
                    backgroundColor: i < (progress / 5) ? '#FFFFFF' : '#FFFFFF44'
                  }}
                  transition={{ 
                    duration: 0.3 + Math.random() * 0.4,
                    repeat: isPlaying ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                  className="w-1 rounded-full"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: progress >= 100 ? 1 : 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ x: 5 }}
        onClick={onNext}
        className="flex items-center space-x-3 text-white/40 hover:text-white transition-all uppercase tracking-[0.3em] text-xs pt-12 group relative z-10"
      >
        <span>Découvrir la promesse</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </motion.button>
    </motion.div>
  );
};

export default AudioMessage;
