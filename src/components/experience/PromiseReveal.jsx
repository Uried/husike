import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const MediaDisplay = ({ media, active }) => {
  if (!media) return null;

  const variants = {
    inactive: { opacity: 0, scale: 0.9, y: 20 },
    active: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } },
  };

  return (
    <motion.div
      variants={variants}
      animate={active ? 'active' : 'inactive'}
      className="absolute inset-0 flex items-center justify-center"
    >
      {media.type === 'image' && (
        <motion.img src={media.url} alt={media.alt} className="max-w-full max-h-full rounded-lg shadow-2xl" />
      )}
      {media.type === 'video' && (
        <video src={media.url} autoPlay loop muted className="max-w-full max-h-full rounded-lg shadow-2xl" />
      )}
    </motion.div>
  );
};

const PromiseReveal = ({ data, onNext }) => {
  const [activeStep, setActiveStep] = useState(0);
  const dragX = useMotionValue(0);
  const containerRef = useRef(null);

  // Mappez la progression du glissement (0 à 1) aux étapes
  const progress = useTransform(dragX, [0, -300], [0, 1]); // -300 est la distance de glissement
  
  progress.onChange(p => {
    if (p < 0.33) setActiveStep(0);
    else if (p < 0.66) setActiveStep(1);
    else setActiveStep(2);
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex flex-col items-center justify-center min-h-screen text-center p-6 overflow-hidden"
    >
      {/* Voix off */}
      <p className="absolute top-24 font-light text-lg text-white/70">Suis-moi.</p>

      {/* Conteneur pour les médias */}
      <div className="relative w-full h-64 mb-16">
        {data.steps.map((step, index) => (
          <MediaDisplay key={index} media={step.media} active={activeStep === index} />
        ))}
      </div>

      {/* Chemin lumineux interactif */}
      <div ref={containerRef} className="relative w-full max-w-sm h-20 flex items-center justify-center">
        <svg width="100%" height="2" className="absolute">
          <line x1="0" y1="1" x2="100%" y2="1" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="2" />
        </svg>
        
        <motion.div
          drag="x"
          dragConstraints={{ left: -300, right: 0 }}
          style={{ x: dragX }}
          className="w-10 h-10 bg-purple-500 rounded-full shadow-lg cursor-grab active:cursor-grabbing"
        />
      </div>

      {/* Texte de l'étape actuelle */}
      <div className="h-24 mt-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={activeStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-white/80"
          >
            {data.steps[activeStep].voiceLine}
          </motion.p>
        </AnimatePresence>
      </div>
      
      {/* Bouton pour continuer */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: activeStep === data.steps.length - 1 ? 1 : 0 }}
        transition={{ delay: 0.5 }}
        onClick={onNext}
        className="mt-12 px-8 py-3 rounded-full bg-white/10 border border-white/20 text-white"
      >
        Continuer <ChevronRight className="inline-block w-4 h-4" />
      </motion.button>
    </motion.div>
  );
};

export default PromiseReveal;
