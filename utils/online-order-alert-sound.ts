/**
 * Web-only Online Order alert sound.
 * Plays assets/sounds/onlinesaleorder.mp3; falls back to a short beep if needed.
 */

let unlocked = false;
let audioEl: HTMLAudioElement | null = null;

function resolveAssetUrl(asset: unknown): string {
  if (typeof asset === 'string') {
    return asset;
  }
  if (asset && typeof asset === 'object') {
    const row = asset as { default?: unknown; uri?: unknown };
    if (typeof row.default === 'string') {
      return row.default;
    }
    if (typeof row.uri === 'string') {
      return row.uri;
    }
  }
  return '';
}

function getAlertAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') {
    return null;
  }
  if (!audioEl) {
    // Metro/Expo resolves this to a URL on web.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const asset = require('@/assets/sounds/onlinesaleorder.mp3');
    const src = resolveAssetUrl(asset);
    if (!src) {
      return null;
    }
    audioEl = new Audio(src);
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

/** Call once after a user gesture so browsers allow playback. */
export async function unlockOnlineOrderAlertSound(): Promise<void> {
  const audio = getAlertAudio();
  if (!audio) {
    unlocked = true;
    return;
  }
  try {
    audio.muted = true;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    unlocked = true;
  } catch {
    // Still mark unlocked so we try real play later after another gesture.
    unlocked = true;
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
