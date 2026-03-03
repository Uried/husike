import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Import components
import Intro from './Intro';
import AudioMessage from './AudioMessage';
import PromiseReveal from './PromiseReveal';
import SecretWord from './SecretWord';
import WaitingMode from './WaitingMode';

// "Je Reviens" experience scenes
import Scene1Opening from './Scene1Opening';
import Scene2Verification from './Scene2Verification';
import Scene3Universe from './Scene3Universe';
import Scene4Intimate from './Scene4Intimate';
import Scene5TimeMessages from './Scene5TimeMessages';

const ExperienceEngine = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [experience, setExperience] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dailyMessage, setDailyMessage] = useState("");

  useEffect(() => {
    const loadExperience = async () => {
      try {
        setLoading(true);
        // On vérifie que le token contient seulement des caractères valides
        if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
          throw new Error("Token invalide");
        }

        // Chargement dynamique du JSON basé sur le token
        const data = await import(`../../data/${token}.json`);
        
        if (data && data.default) {
          const expData = data.default;
          setExperience(expData);
          
          // Calcul du jour actuel depuis "startDate"
          if (expData.startDate && expData.dailyMessages) {
            const start = new Date(expData.startDate);
            const now = new Date();
            const diffTime = Math.abs(now - start);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            // On récupère le message correspondant au jour (boucle si on dépasse le nombre de messages)
            const messageIndex = diffDays % expData.dailyMessages.length;
            setDailyMessage(expData.dailyMessages[messageIndex]);
          }
          
          setError(null);
        } else {
          setError("Expérience introuvable. Veuillez vérifier votre code QR.");
        }
      } catch (err) {
        console.error("Erreur de chargement:", err);
        // Si c'est une erreur de module non trouvé (import dynamique)
        if (err.message && (err.message.includes('Cannot find module') || err.code === 'MODULE_NOT_FOUND')) {
          setError("Ce bijou n'est pas encore activé ou le code QR est erroné.");
        } else {
          setError("Une erreur est survenue lors du chargement de l'expérience.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadExperience();
    }
  }, [token]);

  const handleNext = () => {
    if (currentStep < experience.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white bg-black">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-sm tracking-widest uppercase opacity-40">Connexion à votre Husike...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white bg-black p-6">
        <div className="max-w-md text-center space-y-8 p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
          <div className="text-4xl">🛸</div>
          <h2 className="text-2xl font-light">{error}</h2>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const step = experience.steps[currentStep];

  // "Je Reviens" scenes are fully immersive — hide default UI chrome
  const isImmersiveScene = step.type.startsWith('scene');

  const renderStep = () => {
    // On fusionne les données de l'étape avec le dailyMessage pour le WaitingMode
    const stepData = step.type === 'waiting' 
      ? { ...step, dailyMessage: dailyMessage } 
      : step;

    switch (step.type) {
      case 'intro':
        return <Intro data={stepData} onNext={handleNext} />;
      case 'secret':
        return <SecretWord data={stepData} onNext={handleNext} onBack={handlePrevious} />;
      case 'audio':
        return <AudioMessage data={stepData} onNext={handleNext} onBack={handlePrevious} />;
      case 'promise':
        return <PromiseReveal data={stepData} onNext={handleNext} onBack={handlePrevious} />;
      case 'waiting':
        return <WaitingMode data={stepData} onBack={handlePrevious} />;
      // "Je Reviens" — Collier de Promesse scenes
      case 'scene1-opening':
        return <Scene1Opening data={stepData} onNext={handleNext} />;
      case 'scene2-verification':
        return <Scene2Verification data={stepData} onNext={handleNext} />;
      case 'scene3-universe':
        return <Scene3Universe data={stepData} onNext={handleNext} />;
      case 'scene4-intimate':
        return <Scene4Intimate data={stepData} onNext={handleNext} />;
      case 'scene5-timemessages':
        return <Scene5TimeMessages data={stepData} dailyMessage={dailyMessage} />;
      default:
        return <div>Étape inconnue</div>;
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white selection:bg-purple-500/30">
      {/* Background Cosmic Elements — hidden for immersive scenes */}
      {!isImmersiveScene && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
        </div>
      )}

      {/* Progress Bar — subtle gold for immersive scenes */}
      {!isImmersiveScene ? (
        <div className="fixed top-0 left-0 w-full h-1 bg-white/5 z-50">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / experience.steps.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 50 }}
          />
        </div>
      ) : (
        <div className="fixed top-0 left-0 w-full h-[2px] bg-transparent z-50">
          <motion.div
            className="h-full bg-gradient-to-r from-[#D4AF37]/40 to-[#FFD700]/20"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / experience.steps.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 50 }}
          />
        </div>
      )}

      <main className="relative z-10 min-h-screen">
        <AnimatePresence mode="wait" key={currentStep}>
            {renderStep()}
        </AnimatePresence>
      </main>

      {/* Branding — more subtle for immersive scenes */}
      <div className={`fixed bottom-6 left-6 z-50 hover:opacity-100 transition-opacity cursor-default select-none ${
        isImmersiveScene ? 'opacity-10' : 'opacity-20'
      }`}>
        <span className={`text-xs tracking-[0.4em] font-light uppercase ${
          isImmersiveScene ? 'text-[#D4AF37]/50' : 'text-white'
        }`}>Husike</span>
      </div>
    </div>
  );
};

export default ExperienceEngine;
