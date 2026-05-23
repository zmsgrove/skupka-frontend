export const themes = {
  dark: {
    name: '🌑 Тёмная',
    bg: '#0f0f13', surface: '#1a1a22', surface2: '#22222e',
    border: '#2e2e3e', text: '#f0f0f5', text2: '#9090a8', text3: '#c0c0d8',
    accent: '#f0b429', accentBg: 'rgba(240,180,41,0.15)',
    headerBg: '#1a1a22', cardBg: '#22222e', inputBg: '#22222e',
    overlayBg: 'rgba(0,0,0,0.8)', shadow: '0 4px 24px rgba(0,0,0,0.4)',
  },
  midnight: {
    name: '🌌 Полночь',
    bg: '#070711', surface: '#111118', surface2: '#18181f',
    border: '#222230', text: '#e8e8ff', text2: '#7070a0', text3: '#a0a0c8',
    accent: '#7c6af7', accentBg: 'rgba(124,106,247,0.15)',
    headerBg: '#111118', cardBg: '#18181f', inputBg: '#18181f',
    overlayBg: 'rgba(0,0,0,0.9)', shadow: '0 4px 24px rgba(0,0,0,0.6)',
  },
  ocean: {
    name: '🌊 Океан',
    bg: '#0a1628', surface: '#0f2040', surface2: '#132850',
    border: '#1e3a6e', text: '#e0f0ff', text2: '#6090c0', text3: '#90c0e0',
    accent: '#38bdf8', accentBg: 'rgba(56,189,248,0.15)',
    headerBg: '#0f2040', cardBg: '#132850', inputBg: '#132850',
    overlayBg: 'rgba(0,0,0,0.8)', shadow: '0 4px 24px rgba(0,0,0,0.5)',
  },
  forest: {
    name: '🌲 Лес',
    bg: '#0a1a0f', surface: '#0f2418', surface2: '#142e1e',
    border: '#1e4a2e', text: '#e0ffe8', text2: '#60a070', text3: '#90c8a0',
    accent: '#4ade80', accentBg: 'rgba(74,222,128,0.15)',
    headerBg: '#0f2418', cardBg: '#142e1e', inputBg: '#142e1e',
    overlayBg: 'rgba(0,0,0,0.8)', shadow: '0 4px 24px rgba(0,0,0,0.5)',
  },
  sunset: {
    name: '🌅 Закат',
    bg: '#1a0a0f', surface: '#2a1018', surface2: '#341420',
    border: '#4e2030', text: '#fff0f0', text2: '#b06070', text3: '#d09090',
    accent: '#f87171', accentBg: 'rgba(248,113,113,0.15)',
    headerBg: '#2a1018', cardBg: '#341420', inputBg: '#341420',
    overlayBg: 'rgba(0,0,0,0.8)', shadow: '0 4px 24px rgba(0,0,0,0.5)',
  },
  grey: {
    name: '🩶 Серая',
    bg: '#181818', surface: '#222222', surface2: '#2a2a2a',
    border: '#383838', text: '#f0f0f0', text2: '#888888', text3: '#b0b0b0',
    accent: '#f0b429', accentBg: 'rgba(240,180,41,0.15)',
    headerBg: '#222222', cardBg: '#2a2a2a', inputBg: '#2a2a2a',
    overlayBg: 'rgba(0,0,0,0.8)', shadow: '0 4px 24px rgba(0,0,0,0.4)',
  },
  dimlight: {
    name: '🌤️ Пасмурно',
    bg: '#d8dce8', surface: '#e8ecf4', surface2: '#f0f2f8',
    border: '#c0c8d8', text: '#1a1a2e', text2: '#506080', text3: '#304060',
    accent: '#4060c0', accentBg: 'rgba(64,96,192,0.12)',
    headerBg: '#e8ecf4', cardBg: '#f0f2f8', inputBg: '#f0f2f8',
    overlayBg: 'rgba(0,0,0,0.5)', shadow: '0 4px 24px rgba(0,0,0,0.15)',
  },
  sand: {
    name: '🏜️ Песок',
    bg: '#f5f0e8', surface: '#fffdf7', surface2: '#fdf8ee',
    border: '#e0d8c8', text: '#2a2010', text2: '#806040', text3: '#604820',
    accent: '#c07820', accentBg: 'rgba(192,120,32,0.12)',
    headerBg: '#fffdf7', cardBg: '#fdf8ee', inputBg: '#fdf8ee',
    overlayBg: 'rgba(0,0,0,0.4)', shadow: '0 4px 24px rgba(0,0,0,0.1)',
  },
  clean: {
    name: '🤍 Чистая',
    bg: '#f0f2f5', surface: '#ffffff', surface2: '#f7f8fa',
    border: '#e2e8f0', text: '#1a1a2e', text2: '#64748b', text3: '#475569',
    accent: '#e0a000', accentBg: 'rgba(224,160,0,0.12)',
    headerBg: '#ffffff', cardBg: '#ffffff', inputBg: '#f7f8fa',
    overlayBg: 'rgba(0,0,0,0.5)', shadow: '0 4px 24px rgba(0,0,0,0.1)',
  },
  light: {
    name: '☀️ Светлая',
    bg: '#ffffff', surface: '#f8f9fa', surface2: '#f0f1f3',
    border: '#dde1e7', text: '#111827', text2: '#6b7280', text3: '#374151',
    accent: '#d97706', accentBg: 'rgba(217,119,6,0.1)',
    headerBg: '#ffffff', cardBg: '#f8f9fa', inputBg: '#f0f1f3',
    overlayBg: 'rgba(0,0,0,0.4)', shadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
};

export function getTheme() {
  const saved = localStorage.getItem('skupka_theme');
  return themes[saved] ? saved : 'dark';
}

export function saveTheme(theme) {
  localStorage.setItem('skupka_theme', theme);
}

export const fib = {
  xs: 8, sm: 13, md: 21, lg: 34, xl: 55, xxl: 89,
};

export const radius = {
  sm: 8, md: 13, lg: 21, xl: 34,
};

export const fontSize = {
  xs: 8, sm: 13, md: 21, lg: 34,
};

export const glass = {
  light:  { backdropFilter: 'blur(10px)',  border: '1px solid rgba(255,255,255,0.10)' },
  medium: { backdropFilter: 'blur(16px)',  border: '1px solid rgba(255,255,255,0.14)' },
  strong: { backdropFilter: 'blur(24px)',  border: '1px solid rgba(255,255,255,0.18)' },
};
