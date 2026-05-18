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
import Scene3Journey from './Scene3Journey';
import Scene4Intimate from './Scene4Intimate';
import Scene5TimeMessages from './Scene5TimeMessages';
import CosmosBackground from './CosmosBackground';
import { getDailyMood } from './DailyMood';

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

  const mood = getDailyMood();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white bg-black">
        <CosmosBackground />
        <div className="relative z-10 flex flex-col items-center gap-6">
          {/* Breathing orb */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-xl"
                 style={{ background: `${mood.primaryColor}20`, animation: 'breathePulse 2s ease-in-out infinite' }}/>
            <div className="w-14 h-14 rounded-full border flex items-center justify-center"
                 style={{ borderColor: `${mood.primaryColor}30`, background: 'rgba(0,0,0,0.6)' }}>
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                   style={{ borderColor: `${mood.primaryColor}60`, borderTopColor: 'transparent' }}/>
            </div>
          </div>
          <p className="text-xs tracking-[0.5em] uppercase"
             style={{ color: `${mood.primaryColor}50` }}>
            Connexion à votre univers…
          </p>
          <p className="text-[9px] tracking-[0.3em] uppercase text-white/15 animate-pulse">
            {mood.label}
          </p>
        </div>
        <style>{`@keyframes breathePulse { 0%,100% { transform:scale(1); opacity:0.3; } 50% { transform:scale(1.4); opacity:0.7; } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white bg-black p-6">
        <CosmosBackground />
        <div className="relative z-10 max-w-md text-center space-y-8 p-10 rounded-3xl backdrop-blur-xl"
             style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${mood.primaryColor}15` }}>
          <div className="text-5xl" style={{ filter: `drop-shadow(0 0 16px ${mood.primaryColor})` }}>✦</div>
          <p className="text-white/50 font-light text-lg leading-relaxed">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 rounded-full text-xs tracking-[0.3em] uppercase transition-all"
            style={{ border: `1px solid ${mood.primaryColor}20`, color: `${mood.primaryColor}60` }}
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
      case 'scene3-universe':    return <Scene3Journey data={stepData} onNext={handleNext} />;
      case 'scene4-intimate':    return <Scene4Intimate data={stepData} onNext={handleNext} />;
      case 'scene5-timemessages':return <Scene5TimeMessages data={stepData} dailyMessage={dailyMessage} />;
      default:                   return null;
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Persistent cosmos — always behind everything */}
      {!isImmersive && <CosmosBackground />}

      {/* Mood-colored progress bar */}
      <div className="fixed top-0 left-0 w-full z-50"
           style={{ height: isImmersive ? '1.5px' : '2px', background: 'rgba(255,255,255,0.03)' }}>
        <div
          ref={progressRef}
          style={{
            height: '100%',
            width: '0%',
            background: isImmersive
              ? `linear-gradient(90deg, ${mood.primaryColor}60, ${mood.accentColor}30)`
              : `linear-gradient(90deg, ${mood.primaryColor}, ${mood.accentColor})`,
            boxShadow: `0 0 8px ${mood.primaryColor}40`,
          }}
        />
      </div>

      <main ref={wrapperRef} className="relative z-10 min-h-screen">
        {renderStep()}
      </main>

      {/* Husike watermark */}
      <div className={`fixed bottom-5 left-5 z-50 select-none transition-opacity duration-700 ${isImmersive ? 'opacity-[0.06]' : 'opacity-[0.15]'}`}>
        <span className="text-[9px] tracking-[0.6em] font-light uppercase"
              style={{ color: mood.primaryColor }}>Husike</span>
      </div>
    </div>
  );
};

export default ExperienceEngine;
