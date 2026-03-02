import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const Intro = ({ data, onNext }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.5,
        delayChildren: 0.5 
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 1.5, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
      className="relative flex flex-col items-center justify-center min-h-screen text-center p-6 overflow-hidden bg-black"
    >
      {/* --- BACKGROUND --- */}
      <div className="absolute inset-0 z-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(46,16,101,0.15)_0%,transparent_60%)]" />

      {/* --- CONTENT --- */}
      <div className="relative z-10 flex flex-col items-center space-y-16">
        
        <motion.div variants={itemVariants} className="relative">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.4, 0.7, 0.4] 
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-[-20px] bg-purple-500/20 blur-3xl rounded-full"
          />
          <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center bg-black/30 backdrop-blur-md">
            <Sparkles className="w-10 h-10 text-purple-300" />
          </div>
        </motion.div>

        <motion.h1 
          variants={itemVariants}
          className="text-3xl md:text-4xl font-light text-white/80 leading-relaxed tracking-wide"
        >
          {data.prompt}
        </motion.h1>

        <motion.div variants={itemVariants}>
          <motion.button
            whileHover={{ 
              scale: 1.05, 
              boxShadow: "0 0 40px rgba(139, 92, 246, 0.3)"
            }}
            whileTap={{ scale: 0.95 }}
            onClick={onNext}
            className="px-12 py-4 rounded-full bg-white/10 border border-white/20 text-white font-light tracking-widest uppercase text-sm backdrop-blur-md transition-all duration-300"
          >
            {data.buttonText}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Intro;
