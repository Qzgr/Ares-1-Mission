// sound.js - Retro sound effects using Web Audio API
// No external audio files; generates tones on the fly.
(function (window) {
  'use strict';

  // Singleton AudioContext
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  /**
   * Play a beep sound.
   * @param {number} frequency - Frequency in Hz.
   * @param {number} duration - Duration in ms.
   */
  function playBeep(frequency = 440, duration = 100) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration / 1000);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration / 1000);
  }

  /**
   * Play an alarm sound (e.g., storm warning).
   */
  function playAlarm() {
    // Three quick rising beeps
    const now = audioCtx.currentTime;
    [220, 440, 660].forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.3);
      gain.gain.setValueAtTime(0.001, now + i * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.3 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.3 + 0.3);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now + i * 0.3);
      osc.stop(now + i * 0.3 + 0.3);
    });
  }

  /**
   * Play a short pulse when the rover scanner is activated.
   */
  function playPulse() {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Expose to global window for other modules
  window.Sound = {
    playBeep,
    playAlarm,
    playPulse
  };
})(typeof window !== 'undefined' ? window : this);
