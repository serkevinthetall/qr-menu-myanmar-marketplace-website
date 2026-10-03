/**
 * Web-only App Order alert sound.
 * Prefers Web Audio beep (no file required). Optional MP3 if present.
 */

const SOUND_URL = '/sounds/onlinesaleorder.mp3';
const UNLOCK_KEY = '@qr_shop_web_alert_sound_unlocked';

let unlocked = false;
let audioEl: HTMLAudioElement | null = null;
let sharedCtx: AudioContext | null = null;

function readPersistedUnlock(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

function persistUnlock() {
  unlocked = true;
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    // ignore
  }
}

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

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

function playFallbackBeep(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  void ctx.resume().then(() => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }).catch(() => undefined);
}

/** Must be called from a real click/tap. Returns true if audio can play. */
export async function unlockOnlineOrderAlertSound(): Promise<boolean> {
  if (typeof window === 'undefined') {
    unlocked = false;
    return false;
  }

  // Prefer Web Audio unlock (does not depend on missing mp3).
  const ctx = getAudioContext();
  if (ctx) {
    try {
      await ctx.resume();
      persistUnlock();
      return true;
    } catch {
      // fall through to HTMLAudio
    }
  }

  const audio = getAlertAudio();
  if (!audio) {
    unlocked = readPersistedUnlock();
    return unlocked;
  }
  try {
    audio.muted = true;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    persistUnlock();
    return true;
  } catch {
    unlocked = readPersistedUnlock();
    return unlocked;
  }
}

/** Play alert. Always attempts beep; MP3 optional. */
export function playOnlineOrderAlertSound(): void {
  if (!unlocked && readPersistedUnlock()) {
    unlocked = true;
  }

  // Always try beep — works after any prior unlock / often after first gesture.
  playFallbackBeep();

  if (!unlocked) {
    return;
  }

  const audio = getAlertAudio();
  if (!audio) {
    return;
  }

  try {
    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  } catch {
    // beep already attempted
  }
}

export function isOnlineOrderAlertSoundUnlocked(): boolean {
  if (unlocked) return true;
  unlocked = readPersistedUnlock();
  return unlocked;
}
