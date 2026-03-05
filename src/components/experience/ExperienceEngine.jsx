import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';

import Intro from './Intro';
import AudioMessage from './AudioMessage';
import PromiseReveal from './PromiseReveal';
import SecretWord from './SecretWord';
import WaitingMode from './WaitingMode';

import Scene1Opening from './Scene1Opening';
import Scene2Verification from './Scene2Verification';
import Scene3Universe from './Scene3Universe';
import Scene4Intimate from './Scene4Intimate';
import Scene5TimeMessages from './Scene5TimeMessages';

const dataModules = import.meta.glob('/src/data/*.json');

const ExperienceEngine = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [experience, setExperience] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dailyMessage, setDailyMessage] = useState('');
  const wrapperRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    const loadExperience = async () => {
      try {
        setLoading(true);
        if (!/^[a-zA-Z0-9_-]+$/.test(token)) throw new Error('Token invalide');

        const path = `/src/data/${token}.json`;
        if (!dataModules[path]) throw new Error('Cannot find module');
        const mod = await dataModules[path]();
        const expData = mod.default;
        setExperience(expData);

        if (expData.startDate && expData.dailyMessages) {
          const diffDays = Math.floor(Math.abs(new Date() - new Date(expData.startDate)) / 86400000);
          setDailyMessage(expData.dailyMessages[diffDays % expData.dailyMessages.length]);
        }
        setError(null);
      } catch (err) {
        console.error('Erreur de chargement:', err);
        setError(
          err.message.includes('Cannot find module') || err.message.includes('Token')
            ? 'Ce bijou n\'est pas encore activé ou le code QR est erroné.'
            : 'Une erreur est survenue lors du chargement de l\'expérience.'
        );
      } finally {
        setLoading(false);
      }
    };
    if (token) loadExperience();
  }, [token]);

  const transitionTo = useCallback((fn) => {
    if (!wrapperRef.current) { fn(); return; }
    gsap.to(wrapperRef.current, {
      opacity: 0,
      y: -12,
      duration: 0.45,
      ease: 'power2.in',
      onComplete: () => {
        fn();
        gsap.fromTo(wrapperRef.current,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.65, ease: 'power2.out' }
        );
      },
    });
  }, []);

  const handleNext = useCallback(() => {
    if (!experience) return;
    if (currentStep < experience.steps.length - 1) {
      transitionTo(() => setCurrentStep(prev => prev + 1));
    }
  }, [currentStep, experience, transitionTo]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      transitionTo(() => setCurrentStep(prev => prev - 1));
    }
  }, [currentStep, transitionTo]);

  useEffect(() => {
    if (!experience || !progressRef.current) return;
    const pct = ((currentStep + 1) / experience.steps.length) * 100;
    gsap.to(progressRef.current, { width: `${pct}%`, duration: 0.6, ease: 'power2.out' });
  }, [currentStep, experience]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
          <p className="text-xs tracking-[0.4em] uppercase text-[#D4AF37]/40">Connexion à votre Husike…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white bg-black p-6">
        <div className="max-w-md text-center space-y-8 p-10 rounded-3xl bg-white/[0.03] border border-[#D4AF37]/10 backdrop-blur-xl">
          <div className="text-5xl" style={{ filter: 'drop-shadow(0 0 16px #D4AF37)' }}>✦</div>
          <p className="text-white/50 font-light text-lg leading-relaxed">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 rounded-full border border-[#D4AF37]/20 text-[#D4AF37]/60 text-xs tracking-[0.3em] uppercase hover:border-[#D4AF37]/50 hover:text-[#D4AF37] transition-all"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const step = experience.steps[currentStep];
  const isImmersive = step.type.startsWith('scene');
  const stepData = step.type === 'waiting' ? { ...step, dailyMessage } : step;

  const renderStep = () => {
    switch (step.type) {
      case 'intro':              return <Intro data={stepData} onNext={handleNext} />;
      case 'secret':             return <SecretWord data={stepData} onNext={handleNext} onBack={handlePrevious} />;
      case 'audio':              return <AudioMessage data={stepData} onNext={handleNext} onBack={handlePrevious} />;
      case 'promise':            return <PromiseReveal data={stepData} onNext={handleNext} onBack={handlePrevious} />;
      case 'waiting':            return <WaitingMode data={stepData} onBack={handlePrevious} />;
      case 'scene1-opening':     return <Scene1Opening data={stepData} onNext={handleNext} />;
      case 'scene2-verification':return <Scene2Verification data={stepData} onNext={handleNext} />;
      case 'scene3-universe':    return <Scene3Universe data={stepData} onNext={handleNext} />;
      case 'scene4-intimate':    return <Scene4Intimate data={stepData} onNext={handleNext} />;
      case 'scene5-timemessages':return <Scene5TimeMessages data={stepData} dailyMessage={dailyMessage} />;
      default:                   return null;
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Gold progress bar */}
      <div className="fixed top-0 left-0 w-full z-50" style={{ height: isImmersive ? '2px' : '3px', background: 'rgba(255,255,255,0.04)' }}>
        <div
          ref={progressRef}
          style={{
            height: '100%',
            width: '0%',
            background: isImmersive
              ? 'linear-gradient(90deg, rgba(212,175,55,0.5), rgba(255,215,0,0.25))'
              : 'linear-gradient(90deg, #D4AF37, #FFD700)',
          }}
        />
      </div>

      {/* Ambient nebula — only for non-immersive steps */}
      {!isImmersive && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-15%] left-[-15%] w-[50%] h-[50%] bg-[#D4AF37]/[0.04] blur-[140px] rounded-full" />
          <div className="absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] bg-[#D4AF37]/[0.03] blur-[140px] rounded-full" />
        </div>
      )}

      <main ref={wrapperRef} className="relative z-10 min-h-screen">
        {renderStep()}
      </main>

      {/* Husike watermark */}
      <div className={`fixed bottom-5 left-5 z-50 select-none transition-opacity duration-700 ${isImmersive ? 'opacity-[0.08]' : 'opacity-[0.18]'}`}>
        <span className="text-[10px] tracking-[0.5em] font-light uppercase text-[#D4AF37]">Husike</span>
      </div>
    </div>
  );
};

export default ExperienceEngine;
