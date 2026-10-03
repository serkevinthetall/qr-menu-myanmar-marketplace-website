/**
 * Web-only App Order / member-request alert sound.
 *
 * Browsers block audio until a real user gesture. After unlock, HTMLAudio
 * (and a short beep fallback) can play from notify polls together with the snackbar.
 */

const SOUND_URL = '/sounds/onlinesaleorder.mp3';
const UNLOCK_KEY = '@qr_shop_web_alert_sound_unlocked';

let audioUnlocked = false;
let audioEl: HTMLAudioElement | null = null;
let sharedCtx: AudioContext | null = null;

function getAlertAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    return null;
  }
  if (!audioEl) {
    audioEl = new Audio(SOUND_URL);
    audioEl.preload = 'auto';
    audioEl.volume = 1;
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

function markUnlocked() {
  audioUnlocked = true;
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    // ignore
  }
}

async function playBeep(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (ctx.state !== 'running') return false;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.linearRampToValueAtTime(0, now + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.34);
    return true;
  } catch {
    return false;
  }
}

async function playMp3(): Promise<boolean> {
  const base = getAlertAudio();
  if (!base) return false;

  // Fresh element per play — more reliable when notifies fire while idle.
  try {
    const audio = base.cloneNode(true) as HTMLAudioElement;
    audio.volume = 1;
    audio.muted = false;
    await audio.play();
    return true;
  } catch {
    // fall through to shared element
  }

  try {
    base.pause();
    base.currentTime = 0;
    base.volume = 1;
    base.muted = false;
    await base.play();
    return true;
  } catch {
    return false;
  }
}

/** Warm the MP3 so notify + Test sound start faster. */
export function preloadOnlineOrderAlertSound(): void {
  const audio = getAlertAudio();
  if (!audio) return;
  try {
    audio.load();
  } catch {
    // ignore
  }
}

/**
 * Call from a click/tap (Settings toggle, Test sound, or first page click).
 * Unlocks audio for the rest of this tab session.
 */
export async function unlockOnlineOrderAlertSound(): Promise<boolean> {
  if (typeof window === 'undefined') {
    audioUnlocked = false;
    return false;
  }

  preloadOnlineOrderAlertSound();

  const ctx = getAudioContext();
  if (ctx) {
    try {
      await ctx.resume();
    } catch {
      // continue — HTMLAudio may still unlock
    }
  }

  const audio = getAlertAudio();
  if (audio) {
    try {
      audio.muted = true;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      markUnlocked();
      return true;
    } catch {
      // fall through
    }
  }

  if (ctx && ctx.state === 'running') {
    markUnlocked();
    return true;
  }

  const beepOk = await playBeep();
  if (beepOk) {
    markUnlocked();
    return true;
  }

  return audioUnlocked;
}

/** Play alert sound (notify popup / Test sound / member request). */
export async function playOnlineOrderAlertSound(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (await playMp3()) {
    markUnlocked();
    return true;
  }

  if (await playBeep()) {
    markUnlocked();
    return true;
  }

  return false;
}

/**
 * Pair snackbar notify with sound. Call whenever a new-order / member toast shows.
 * Returns whether audio actually started.
 */
export async function playSoundForNotifyPopup(): Promise<boolean> {
  return playOnlineOrderAlertSound();
}

export function isOnlineOrderAlertSoundUnlocked(): boolean {
  return audioUnlocked;
}
