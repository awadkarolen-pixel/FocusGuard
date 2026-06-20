let lastPlayedAt = 0;

/**
 * Plays a short triangle-wave "soft beep" alert.
 * Self-throttles to at most once every 2 seconds so repeated alert frames
 * don't stack up.
 */
export function playSoftBeep(): void {
  const now = Date.now();
  if (now - lastPlayedAt < 2000) return;
  lastPlayedAt = now;

  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  const audioCtx = new Ctx();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);

  gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.5);
}
