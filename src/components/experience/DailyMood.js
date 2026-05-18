/**
 * DailyMood — every day the universe breathes differently.
 * Returns a mood object based on the current day + hour.
 * The user never gets exactly the same atmosphere twice in a day.
 */

const MOODS = [
  {
    id: 'dawn',
    label: 'Aube',
    primaryColor: '#D4AF37',
    accentColor: '#FF8C42',
    nebulaColor: '212,100,55',
    ambientIntensity: 0.6,
    starSpeed: 0.3,
    particleColor: '#FFB347',
    skyGradient: 'radial-gradient(ellipse at 50% 100%, rgba(212,100,55,0.15) 0%, rgba(0,0,0,1) 60%)',
    breathingMessage: "Le matin te ressemble — doux et plein de lumière.",
    bloomStrength: 1.8,
    fogDensity: 0.008,
  },
  {
    id: 'morning',
    label: 'Matin',
    primaryColor: '#D4AF37',
    accentColor: '#FFF0A0',
    nebulaColor: '212,175,55',
    ambientIntensity: 0.8,
    starSpeed: 0.4,
    particleColor: '#FFD700',
    skyGradient: 'radial-gradient(ellipse at 50% 80%, rgba(212,175,55,0.1) 0%, rgba(0,0,0,1) 55%)',
    breathingMessage: "Chaque matin, ma première pensée porte ton prénom.",
    bloomStrength: 1.4,
    fogDensity: 0.005,
  },
  {
    id: 'afternoon',
    label: 'Après-midi',
    primaryColor: '#C0A840',
    accentColor: '#88CCFF',
    nebulaColor: '136,180,255',
    ambientIntensity: 0.7,
    starSpeed: 0.5,
    particleColor: '#A8D8FF',
    skyGradient: 'radial-gradient(ellipse at 30% 40%, rgba(136,180,255,0.08) 0%, rgba(0,0,0,1) 60%)',
    breathingMessage: "Le soleil me rappelle ta chaleur. Je t'aime en silence.",
    bloomStrength: 1.2,
    fogDensity: 0.004,
  },
  {
    id: 'dusk',
    label: 'Crépuscule',
    primaryColor: '#D4AF37',
    accentColor: '#FF6B9D',
    nebulaColor: '255,107,157',
    ambientIntensity: 0.9,
    starSpeed: 0.6,
    particleColor: '#FF8CB8',
    skyGradient: 'radial-gradient(ellipse at 70% 90%, rgba(255,107,157,0.12) 0%, rgba(0,0,0,1) 55%)',
    breathingMessage: "Ce soir, le ciel saigne de tes couleurs.",
    bloomStrength: 1.6,
    fogDensity: 0.007,
  },
  {
    id: 'night',
    label: 'Nuit',
    primaryColor: '#D4AF37',
    accentColor: '#9B59B6',
    nebulaColor: '155,89,182',
    ambientIntensity: 1.0,
    starSpeed: 0.8,
    particleColor: '#C39BD3',
    skyGradient: 'radial-gradient(ellipse at 50% 50%, rgba(155,89,182,0.1) 0%, rgba(0,0,0,1) 50%)',
    breathingMessage: "La nuit te garde. Je veille sur toi de là où je suis.",
    bloomStrength: 2.0,
    fogDensity: 0.01,
  },
  {
    id: 'midnight',
    label: 'Minuit',
    primaryColor: '#8B7CB0',
    accentColor: '#4A90D9',
    nebulaColor: '74,144,217',
    ambientIntensity: 1.2,
    starSpeed: 1.0,
    particleColor: '#7EC8E3',
    skyGradient: 'radial-gradient(ellipse at 50% 50%, rgba(74,144,217,0.1) 0%, rgba(0,0,0,1) 45%)',
    breathingMessage: "Minuit. Tu dors peut-être. Moi, je rêve de toi.",
    bloomStrength: 2.2,
    fogDensity: 0.012,
  },
];

const DAILY_VARIATIONS = [
  "Aujourd'hui, l'univers a pris ta teinte.",
  "Quelque chose dans l'air me murmure ton nom.",
  "Je sens ta présence, même de là-bas.",
  "Ce bijou vibre parce que tu le portes.",
  "L'espace entre nous ne fait que grandir mon amour.",
  "Tu manques à la lumière quand tu n'es pas là.",
  "Chaque étoile ici porte un de mes souvenirs avec toi.",
];

export function getDailyMood() {
  const now = new Date();
  const hour = now.getHours();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);

  let moodIndex;
  if (hour >= 5 && hour < 8)       moodIndex = 0; // dawn
  else if (hour >= 8 && hour < 12) moodIndex = 1; // morning
  else if (hour >= 12 && hour < 18) moodIndex = 2; // afternoon
  else if (hour >= 18 && hour < 21) moodIndex = 3; // dusk
  else if (hour >= 21 && hour < 24) moodIndex = 4; // night
  else                               moodIndex = 5; // midnight

  const mood = { ...MOODS[moodIndex] };
  mood.dailyVariation = DAILY_VARIATIONS[dayOfYear % DAILY_VARIATIONS.length];
  mood.shootingStarFrequency = (dayOfYear % 3 === 0) ? 'high' : (dayOfYear % 2 === 0) ? 'medium' : 'low';
  mood.nebulaRotation = (dayOfYear * 13.7) % 360;

  return mood;
}

export function getDayIndex(startDate) {
  if (!startDate) return 0;
  return Math.floor(Math.abs(new Date() - new Date(startDate)) / 86400000);
}
