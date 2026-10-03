/**
 * Web alert sound — uses an embedded loud WAV (no network) plus optional MP3.
 * Test sound must be wired to a native HTML click (not only RN Paper onPress).
 */

const EMBEDDED_ALERT_WAV = 'data:audio/wav;base64,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';
const MP3_URL = '/sounds/onlinesaleorder.mp3';
const UNLOCK_KEY = '@qr_shop_web_alert_sound_unlocked';
const AUDIO_DOM_ID = 'qr-shop-alert-audio';
const SOUND_PREF_KEY = '@qr_shop_web_alert_sound_id';

export type AlertSoundId = 'beep' | 'bell' | 'chime' | 'order';

export type AlertSoundOption = {
  id: AlertSoundId;
  label: string;
  description: string;
};

/** Available notify sounds shown in Settings. */
export const ALERT_SOUND_OPTIONS: readonly AlertSoundOption[] = [
  {
    id: 'beep',
    label: 'Beep',
    description: 'Short POS-style double beep',
  },
  {
    id: 'bell',
    label: 'Bell',
    description: 'Clear desk-bell ring',
  },
  {
    id: 'chime',
    label: 'Chime',
    description: 'Longer embedded alert tone',
  },
  {
    id: 'order',
    label: 'Order tone',
    description: 'Online order MP3 (if available)',
  },
] as const;

const DEFAULT_SOUND_ID: AlertSoundId = 'beep';

function isAlertSoundId(value: string): value is AlertSoundId {
  return ALERT_SOUND_OPTIONS.some(option => option.id === value);
}

export function readAlertSoundId(): AlertSoundId {
  if (typeof window === 'undefined') return DEFAULT_SOUND_ID;
  try {
    const raw = window.localStorage.getItem(SOUND_PREF_KEY);
    if (raw && isAlertSoundId(raw)) return raw;
  } catch {
    // ignore
  }
  return DEFAULT_SOUND_ID;
}

export function writeAlertSoundId(id: AlertSoundId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_PREF_KEY, id);
  } catch {
    // ignore
  }
}


let audioUnlocked = false;
let sharedCtx: AudioContext | null = null;

function markUnlocked() {
  audioUnlocked = true;
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    // ignore
  }
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

/** Ensure a real <audio> node exists in the document (most reliable on Chrome). */
export function ensureAlertAudioElement(): HTMLAudioElement | null {
  if (typeof document === 'undefined') return null;
  let el = document.getElementById(AUDIO_DOM_ID) as HTMLAudioElement | null;
  if (!el) {
    el = document.createElement('audio');
    el.id = AUDIO_DOM_ID;
    el.preload = 'auto';
    el.setAttribute('playsinline', 'true');
    el.style.display = 'none';
    document.body.appendChild(el);
  }
  // Prefer embedded WAV so first play never waits on network.
  if (el.getAttribute('data-src') !== 'embedded') {
    el.src = EMBEDDED_ALERT_WAV;
    el.setAttribute('data-src', 'embedded');
  }
  return el;
}

async function playDomAudio(src: string): Promise<boolean> {
  const el = ensureAlertAudioElement();
  if (!el) return false;
  try {
    if (el.getAttribute('data-playing-src') !== src) {
      el.src = src;
      el.setAttribute('data-playing-src', src);
      if (src === EMBEDDED_ALERT_WAV) el.setAttribute('data-src', 'embedded');
    }
    el.muted = false;
    el.volume = 1;
    el.currentTime = 0;
    await el.play();
    markUnlocked();
    return true;
  } catch {
    return false;
  }
}

async function playBeep(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === 'suspended') await ctx.resume();
    if (ctx.state !== 'running') return false;
    const now = ctx.currentTime;
    // Classic short POS double-beep.
    for (const [offset, freq] of [
      [0, 1000],
      [0.14, 1000],
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.32, now + offset + 0.01);
      gain.gain.linearRampToValueAtTime(0, now + offset + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.1);
    }
    markUnlocked();
    return true;
  } catch {
    return false;
  }
}

/** Soft metallic desk-bell (decaying harmonics). */
async function playBell(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === 'suspended') await ctx.resume();
    if (ctx.state !== 'running') return false;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.55, now + 0.01);
    master.gain.exponentialRampToValueAtTime(0.001, now + 1.35);
    master.connect(ctx.destination);

    // Partial ratios approximate a small hand/desk bell.
    const partials: Array<[number, number]> = [
      [880, 0.55],
      [1760, 0.28],
      [2340, 0.16],
      [3520, 0.08],
    ];
    for (const [freq, amp] of partials) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(amp, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 1.4);
    }
    markUnlocked();
    return true;
  } catch {
    return false;
  }
}

async function playSelectedAlertSound(id: AlertSoundId): Promise<boolean> {
  if (id === 'beep') {
    if (await playBeep()) return true;
    return playDomAudio(EMBEDDED_ALERT_WAV);
  }
  if (id === 'bell') {
    if (await playBell()) return true;
    if (await playBeep()) return true;
    return playDomAudio(EMBEDDED_ALERT_WAV);
  }
  if (id === 'order') {
    if (await playDomAudio(MP3_URL)) return true;
    if (await playBell()) return true;
    if (await playBeep()) return true;
    return playDomAudio(EMBEDDED_ALERT_WAV);
  }
  // chime
  if (await playDomAudio(EMBEDDED_ALERT_WAV)) return true;
  if (await playBell()) return true;
  if (await playBeep()) return true;
  return playDomAudio(MP3_URL);
}

/** Call from native HTML onClick / pointerdown only. */
export function startAlertSoundFromUserGesture(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  const soundId = readAlertSoundId();
  void getAudioContext()?.resume();

  if (soundId === 'beep') {
    return playBeep().then(async ok => {
      if (ok) return true;
      return playDomAudio(EMBEDDED_ALERT_WAV);
    });
  }

  if (soundId === 'bell') {
    return playBell().then(async ok => {
      if (ok) return true;
      if (await playBeep()) return true;
      return playDomAudio(EMBEDDED_ALERT_WAV);
    });
  }

  const src = soundId === 'order' ? MP3_URL : EMBEDDED_ALERT_WAV;
  const el = ensureAlertAudioElement();
  // Fire play() synchronously inside the user gesture.
  if (el) {
    try {
      el.src = src;
      el.setAttribute('data-src', soundId === 'chime' ? 'embedded' : soundId);
      el.setAttribute('data-playing-src', src);
      el.muted = false;
      el.volume = 1;
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.then === 'function') {
        return p
          .then(() => {
            markUnlocked();
            return true;
          })
          .catch(async () => playSelectedAlertSound(soundId));
      }
      markUnlocked();
      return Promise.resolve(true);
    } catch {
      // fall through
    }
  }

  return playSelectedAlertSound(soundId);
}

export async function unlockOnlineOrderAlertSound(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  ensureAlertAudioElement();
  try {
    await getAudioContext()?.resume();
  } catch {
    // ignore
  }
  // Quiet unlock: play embedded wav muted then stop.
  const el = ensureAlertAudioElement();
  if (el) {
    try {
      el.src = EMBEDDED_ALERT_WAV;
      el.muted = true;
      await el.play();
      el.pause();
      el.currentTime = 0;
      el.muted = false;
      markUnlocked();
      return true;
    } catch {
      // ignore
    }
  }
  if (await playBeep()) return true;
  return audioUnlocked;
}

export async function playOnlineOrderAlertSound(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  return playSelectedAlertSound(readAlertSoundId());
}

let lastNotifySoundAt = 0;

/** Play for a new-order / badge notify. Debounced so badge+snackbar don't double-blast. */
export async function playSoundForNotifyPopup(): Promise<boolean> {
  const now = Date.now();
  if (now - lastNotifySoundAt < 500) {
    return true;
  }
  lastNotifySoundAt = now;
  return playOnlineOrderAlertSound();
}

export function preloadOnlineOrderAlertSound(): void {
  ensureAlertAudioElement();
  try {
    const warm = new Audio(MP3_URL);
    warm.preload = 'auto';
  } catch {
    // ignore
  }
}

export function isOnlineOrderAlertSoundUnlocked(): boolean {
  return audioUnlocked;
}
