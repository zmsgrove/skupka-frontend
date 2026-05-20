// Темы оформления SKUPKA CRM
export const themes = {
  dark: {
    bg: '#0f0f13',
    surface: '#1a1a22',
    surface2: '#22222e',
    border: '#2e2e3e',
    text: '#f0f0f5',
    text2: '#9090a8',
    text3: '#c0c0d8',
    accent: '#f0b429',
    accentBg: 'rgba(240,180,41,0.15)',
    headerBg: '#1a1a22',
    cardBg: '#22222e',
    inputBg: '#22222e',
    overlayBg: 'rgba(0,0,0,0.8)',
    shadow: '0 4px 24px rgba(0,0,0,0.4)',
  },
  light: {
    bg: '#f0f2f5',
    surface: '#ffffff',
    surface2: '#f7f8fa',
    border: '#e2e8f0',
    text: '#1a1a2e',
    text2: '#64748b',
    text3: '#475569',
    accent: '#e0a000',
    accentBg: 'rgba(224,160,0,0.12)',
    headerBg: '#ffffff',
    cardBg: '#ffffff',
    inputBg: '#f7f8fa',
    overlayBg: 'rgba(0,0,0,0.5)',
    shadow: '0 4px 24px rgba(0,0,0,0.1)',
  },
};

export function getTheme() {
  const saved = localStorage.getItem('skupka_theme');
  return saved === 'light' ? 'light' : 'dark';
}

export function saveTheme(theme) {
  localStorage.setItem('skupka_theme', theme);
}
