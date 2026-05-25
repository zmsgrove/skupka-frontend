export function playSound(eventKey, userSettings) {
  if (!userSettings?.sound_enabled) return;
  const soundFile = userSettings?.sound_settings?.[eventKey] || 'OK.mp3';
  const audio = new Audio(`/sound/${soundFile}`);
  audio.volume = (userSettings?.sound_volume ?? 100) / 100;
  audio.play().catch(() => {});
}
