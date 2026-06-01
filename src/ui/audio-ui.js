// File-based sound effects. Some actions choose randomly from a small group
// so repeated chopping/bridge placement does not sound identical every time.
const SOUND_PATHS = {
  click: ['./assets/audio/click_002.ogg'],
  toggle: ['./assets/audio/toggle_002.ogg'],
  bridge: [
    './assets/audio/impactMetal_heavy_003.ogg',
    './assets/audio/impactMetal_heavy_004.ogg'
  ],
  chop: [
    './assets/audio/impactPunch_medium_001.ogg',
    './assets/audio/impactPunch_medium_002.ogg',
    './assets/audio/impactPunch_medium_003.ogg',
    './assets/audio/impactPunch_medium_004.ogg'
  ],
  pickupLog: ['./assets/audio/impactWood_light_003.ogg']
};

// Notes used by the Web Audio API synth effects.
const NOTE_FREQUENCIES = {
  re6: 1174.66,
  mi6: 1318.51,
  sol5: 783.99,
  la5: 880.0,
  ti5: 987.77,
  sol6: 1567.98
};

// Central audio controller. It combines HTMLAudioElement sound effects with
// synthetic sine-wave tones created through the Web Audio API.
export function createAudioController({ getSettings }) {
  const audioPools = new Map();
  let audioContext = null;
  let lastSliderPreviewAt = 0;

  function getAudioContext() {
    if (!window.AudioContext && !window.webkitAudioContext) {
      return null;
    }

    if (!audioContext) {
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContextConstructor();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }

    return audioContext;
  }

  function getEffectiveSettings(overrides = {}) {
    const settings = getSettings?.() ?? {};

    return {
      enabled: overrides.enabled ?? settings.soundEnabled ?? true,
      volume: clampVolume(overrides.volume ?? settings.soundVolume ?? 0.7)
    };
  }

  function canPlay(options = {}) {
    const { enabled } = getEffectiveSettings(options);
    return options.force || enabled;
  }

  // Plays one of the loaded .ogg sounds while respecting current sound settings.
  function playSound(name, options = {}) {
    if (!canPlay(options)) return;

    const paths = SOUND_PATHS[name];
    if (!paths?.length) return;

    const path = paths[Math.floor(Math.random() * paths.length)];
    const audio = getAudioElement(path);
    const { volume } = getEffectiveSettings(options);

    audio.pause();
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => {});
  }

  // A cached base audio element is cloned so the same sound can overlap itself.
  function getAudioElement(path) {
    if (!audioPools.has(path)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      audioPools.set(path, audio);
    }

    return audioPools.get(path).cloneNode(true);
  }

  // Generates a short sine-wave melody with oscillators and gain envelopes.
  function playToneSequence(notes, options = {}) {
    if (!canPlay(options)) return;

    const context = getAudioContext();
    if (!context) return;

    const { volume } = getEffectiveSettings(options);
    const now = context.currentTime + 0.01;
    const noteDuration = options.noteDuration ?? 0.16;
    const gap = options.gap ?? 0.04;
    const baseGain = 0.12 * volume;

    notes.forEach((frequency, index) => {
      const start = now + index * (noteDuration + gap);
      const end = start + noteDuration;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, baseGain), start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    });
  }

  // Rate-limited preview tone for dragging/clicking the volume slider.
  function playSliderPreview(options = {}) {
    const now = performance.now();
    if (now - lastSliderPreviewAt < 220) return;

    lastSliderPreviewAt = now;
    playToneSequence([NOTE_FREQUENCIES.la5, NOTE_FREQUENCIES.mi6], {
      ...options,
      noteDuration: 0.11,
      gap: 0.025
    });
  }

  function playWinMelody() {
    playToneSequence([
      NOTE_FREQUENCIES.sol5,
      NOTE_FREQUENCIES.ti5,
      NOTE_FREQUENCIES.re6,
      NOTE_FREQUENCIES.sol6
    ], {
      noteDuration: 0.18,
      gap: 0.04
    });
  }

  return {
    playClick: () => playSound('click'),
    playToggle: () => playSound('toggle', { force: true }),
    playBridge: () => playSound('bridge'),
    playChop: () => playSound('chop'),
    playPickupLog: () => playSound('pickupLog'),
    playSliderPreview,
    playWinMelody
  };
}

// Keeps stored volume values inside the valid 0..1 range.
function clampVolume(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0.7;
  }

  return Math.min(1, Math.max(0, number));
}
