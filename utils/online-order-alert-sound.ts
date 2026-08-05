/**
 * Web-only Online Order alert sound.
 * Uses /sounds/onlinesaleorder.mp3 from the public folder (works on static hosting).
 */

const SOUND_URL = '/sounds/onlinesaleorder.mp3';

let unlocked = false;
let audioEl: HTMLAudioElement | null = null;

function getAlertAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    return null;
  }
  if (!audioEl) {
    audioEl = new Audio(SOUND_URL);
    audioEl.preload = 'auto';
  }
  return audioEl;
}

function playFallbackBeep(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) {
    return;
  }
  const ctx = new Ctx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.22);
  void ctx.close().catch(() => undefined);
}

/** Must be called from a real click/tap. Returns true if audio can play. */
export async function unlockOnlineOrderAlertSound(): Promise<boolean> {
  const audio = getAlertAudio();
  if (!audio) {
    unlocked = false;
    return false;
  }
  try {
    audio.muted = true;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    unlocked = true;
    return true;
  } catch {
    unlocked = false;
    return false;
  }
}

export function playOnlineOrderAlertSound(): void {
  if (!unlocked) {
    return;
  }

  const audio = getAlertAudio();
  if (!audio) {
    playFallbackBeep();
    return;
  }

  try {
    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => {
      playFallbackBeep();
    });
  } catch {
    playFallbackBeep();
  }
}

export function isOnlineOrderAlertSoundUnlocked(): boolean {
  return unlocked;
}
