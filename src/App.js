import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ExperienceEngine from './components/experience/ExperienceEngine';

function App() {
  return (
    <Router>
      <Routes>
        {/* Route principale pour l'expérience du bijou */}
        <Route path="/experience/:token" element={<ExperienceEngine />} />
        
        {/* Page d'accueil temporaire / redirection */}
        <Route path="/" element={
          <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 text-center">
            <h1 className="text-4xl font-light tracking-[0.5em] mb-4 uppercase">Husike</h1>
            <p className="text-gray-500 italic max-w-sm mb-8">
              Scannez le code QR de votre bijou pour commencer l'expérience.
            </p>
            <div className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-xl">✨</span>
            </div>
          </div>
        } />

        {/* Redirection par défaut vers l'accueil */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
