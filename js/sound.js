/**
 * Misión Ares-I: Diseña, Lanza y Sobrevive
 * js/sound.js - Motor de Audio y Música Retro 8-Bit (Web Audio API)
 *
 * Características:
 * - Banda sonora retro espacial chiptune 8-bit sintetizada en tiempo real.
 * - Sonido continuo de aceleración de cohete (empuje modulado en frecuencia y volumen).
 * - Sonido de aspas de helicóptero para el rescate en el océano.
 * - SFX retro: clics, avance/retroceso de pasos, ignición, alarma, radar, taladro, muestras y victoria.
 * - Control de silencio (mute/unmute) con persistencia en localStorage y botón en pantalla.
 * - Desbloqueo transparente de AudioContext en cualquier interacción del usuario.
 */

(function (window) {
  'use strict';

  let audioCtx = null;
  let masterGain = null;
  let bgmGain = null;
  let sfxGain = null;

  // Estado del audio
  let isMuted = false;
  try {
    isMuted = localStorage.getItem('ares1_audio_muted') === 'true';
  } catch (e) {
    isMuted = false;
  }

  let bgmRunning = false;
  let schedulerTimer = null;
  let currentStep = 0;
  let nextStepTime = 0;

  // Nodos para efectos continuos
  let thrusterNodes = null;   // Aceleración de cohete
  let helicopterNodes = null; // Aspas de helicóptero

  // Configuración musical
  const BPM = 118;
  const STEP_DURATION = (60 / BPM) / 4; // ~0.127s por semicorchea
  const TOTAL_STEPS = 32;               // 2 compases de 16 semicorcheas

  // Frecuencias de notas (Hz)
  const N = {
    REST: 0,
    C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, Bb2: 116.54, B2: 123.47,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, Bb3: 233.08, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, Bb4: 466.16, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, Bb5: 932.33, C6: 1046.50
  };

  // Melodía principal 8-bit (Lead épico de exploración espacial)
  const MELODY_PATTERN = [
    // Compás 1: Dm
    N.D4, N.REST, N.F4, N.G4, N.A4, N.REST, N.C5, N.A4,
    // Compás 2: Dm
    N.G4, N.F4, N.G4, N.A4, N.F4, N.REST, N.D4, N.REST,
    // Compás 3: Bb
    N.F4, N.REST, N.A4, N.Bb4, N.C5, N.REST, N.D5, N.C5,
    // Compás 4: C -> Am
    N.Bb4, N.A4, N.G4, N.A4, N.C5, N.REST, N.D4, N.REST
  ];

  // Arpegios rápidos estilo NES
  const ARP_CHORDS = [
    [N.D3, N.F3, N.A3, N.D4],   // Dm
    [N.Bb2, N.D3, N.F3, N.Bb3], // Bb
    [N.C3, N.E3, N.G3, N.C4],   // C
    [N.A2, N.C3, N.E3, N.A3]    // Am
  ];

  // Bajo staccato con ritmo activo
  const BASS_PATTERN = [
    N.D2, N.REST, N.D2, N.F2, N.D2, N.REST, N.D2, N.A2,
    N.Bb2, N.REST, N.Bb2, N.D2, N.Bb2, N.REST, N.Bb2, N.F2,
    N.C2, N.REST, N.C2, N.E2, N.C2, N.REST, N.C2, N.G2,
    N.A2, N.REST, N.A2, N.C2, N.D2, N.REST, N.A2, N.REST
  ];

  // Percusión retro: 1 = Hi-hat, 2 = Snare, 3 = Kick
  const DRUM_PATTERN = [
    3, 1, 1, 1, 2, 1, 1, 1, 3, 1, 3, 1, 2, 1, 1, 1,
    3, 1, 1, 1, 2, 1, 1, 1, 3, 1, 3, 1, 2, 1, 2, 1
  ];

  /* ───────────────────────── AudioContext & Inicialización ───────────────────────── */

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioCtx = new AudioContextClass();

      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : 1, audioCtx.currentTime);

      bgmGain = audioCtx.createGain();
      bgmGain.gain.setValueAtTime(0.25, audioCtx.currentTime); // Nivel óptimo y claro
      bgmGain.connect(masterGain);

      sfxGain = audioCtx.createGain();
      sfxGain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      sfxGain.connect(masterGain);

      masterGain.connect(audioCtx.destination);
    }
    return audioCtx;
  }

  function asegurarAudioContext() {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  /* ───────────────────────── Síntesis de notas BGM ───────────────────────── */

  function playTone(freq, duration, type, volume, time, destGain) {
    if (!freq || freq <= 0) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, time);

      const peakVol = volume || 0.1;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(peakVol, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gain);
      gain.connect(destGain || sfxGain);

      osc.start(time);
      osc.stop(time + duration + 0.02);
    } catch (e) {}
  }

  function playNoise(duration, time, isSnare) {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const bufferSize = Math.max(128, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = isSnare ? 'bandpass' : 'highpass';
      filter.frequency.setValueAtTime(isSnare ? 1200 : 5500, time);
      filter.Q.setValueAtTime(1.5, time);

      const gain = ctx.createGain();
      const vol = isSnare ? 0.16 : 0.08;
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(bgmGain);

      noise.start(time);
      noise.stop(time + duration);

      if (isSnare) {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, time);
        osc.frequency.exponentialRampToValueAtTime(60, time + duration * 0.7);
        oscGain.gain.setValueAtTime(0.12, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.7);
        osc.connect(oscGain).connect(bgmGain);
        osc.start(time);
        osc.stop(time + duration * 0.7);
      }
    } catch (e) {}
  }

  function playKick(time) {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(32, time + 0.1);

      gain.gain.setValueAtTime(0.24, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

      osc.connect(gain).connect(bgmGain);
      osc.start(time);
      osc.stop(time + 0.12);
    } catch (e) {}
  }

  /* ───────────────────────── Secuenciador Lookahead BGM ───────────────────────── */

  function programarPaso(step, time) {
    // 1. Melodía principal
    const notaLead = MELODY_PATTERN[step];
    if (notaLead && notaLead > 0) {
      playTone(notaLead, STEP_DURATION * 1.8, 'square', 0.14, time, bgmGain);
    }

    // 2. Arpegios 8-bit rápidos
    const acordeIdx = Math.floor(step / 8);
    const notasAcorde = ARP_CHORDS[acordeIdx] || ARP_CHORDS[0];
    const notaArp = notasAcorde[step % 4];
    if (notaArp) {
      playTone(notaArp, STEP_DURATION * 0.75, 'square', 0.06, time, bgmGain);
    }

    // 3. Bajo
    const notaBajo = BASS_PATTERN[step];
    if (notaBajo && notaBajo > 0) {
      playTone(notaBajo, STEP_DURATION * 0.9, 'triangle', 0.18, time, bgmGain);
    }

    // 4. Percusión retro
    const drum = DRUM_PATTERN[step];
    if (drum === 1) {
      playNoise(0.035, time, false); // Hi-hat
    } else if (drum === 2) {
      playNoise(0.09, time, true);  // Snare
    } else if (drum === 3) {
      playKick(time);               // Kick
    }
  }

  function bucleSecuenciador() {
    if (!bgmRunning) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      while (nextStepTime < ctx.currentTime + 0.1) {
        programarPaso(currentStep, nextStepTime);
        nextStepTime += STEP_DURATION;
        currentStep = (currentStep + 1) % TOTAL_STEPS;
      }
    } catch (err) {
      console.warn('Audio scheduler tick:', err);
    }
  }

  function iniciarBGM() {
    const ctx = asegurarAudioContext();
    if (!ctx) return;
    if (bgmRunning) return;

    bgmRunning = true;
    currentStep = 0;
    nextStepTime = ctx.currentTime + 0.05;

    if (schedulerTimer) clearInterval(schedulerTimer);
    schedulerTimer = setInterval(bucleSecuenciador, 35);
    actualizarBotonesUI();
  }

  function detenerBGM() {
    bgmRunning = false;
    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
    actualizarBotonesUI();
  }

  /* ───────────────────────── Sonido de Aceleración del Cohete (Thrusters) ───────────────────────── */

  /**
   * Inicia el rugido del motor del cohete modulable en tiempo real.
   * @param {number} powerRatio - Nivel de empuje de 0.0 a 1.0.
   */
  function startThruster(powerRatio = 0.5) {
    asegurarAudioContext();
    const ctx = getAudioContext();
    if (!ctx || isMuted) return;

    if (!thrusterNodes) {
      try {
        // Buffer de ruido blanco continuo (2 segundos en loop)
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        // Filtro paso bajo resonante
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220, ctx.currentTime);
        filter.Q.setValueAtTime(3.5, ctx.currentTime);

        // Oscilador de graves para vibración del chasis
        const subOsc = ctx.createOscillator();
        subOsc.type = 'sawtooth';
        subOsc.frequency.setValueAtTime(65, ctx.currentTime);

        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.08, ctx.currentTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        subOsc.connect(subGain);
        subGain.connect(gain);
        gain.connect(sfxGain);

        noise.start();
        subOsc.start();

        thrusterNodes = { noise, filter, subOsc, gain, subGain };
      } catch (e) {
        console.warn('Error al iniciar thruster:', e);
      }
    }

    updateThruster(powerRatio);
  }

  /**
   * Modula el tono y volumen según el nivel de empuje actual.
   * @param {number} powerRatio - Nivel de 0.0 a 1.0.
   */
  function updateThruster(powerRatio = 0.5) {
    if (!thrusterNodes || !audioCtx) return;
    try {
      const p = Math.max(0, Math.min(1, Number(powerRatio) || 0));
      const now = audioCtx.currentTime;
      // Frecuencia del filtro sube con la potencia (200Hz a 800Hz)
      const targetFreq = 200 + p * 600;
      thrusterNodes.filter.frequency.setTargetAtTime(targetFreq, now, 0.05);
      // Tono de motor grave sube con la potencia (50Hz a 130Hz)
      const targetSub = 50 + p * 80;
      thrusterNodes.subOsc.frequency.setTargetAtTime(targetSub, now, 0.05);
      // Ganancia modulada
      const targetVol = 0.12 + p * 0.28;
      thrusterNodes.gain.gain.setTargetAtTime(targetVol, now, 0.05);
    } catch (e) {}
  }

  /**
   * Detiene el sonido del cohete suavemente.
   */
  function stopThruster() {
    if (!thrusterNodes || !audioCtx) return;
    try {
      const nodes = thrusterNodes;
      thrusterNodes = null;
      const now = audioCtx.currentTime;
      nodes.gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
      setTimeout(() => {
        try {
          nodes.noise.stop();
          nodes.noise.disconnect();
          nodes.subOsc.stop();
          nodes.subOsc.disconnect();
          nodes.gain.disconnect();
        } catch (e) {}
      }, 100);
    } catch (e) {
      thrusterNodes = null;
    }
  }

  /* ───────────────────────── Sonido de Aspas de Helicóptero (Rescate) ───────────────────────── */

  /**
   * Inicia el sonido rítmico "whop-whop-whop" de helicóptero de rescate.
   */
  function startHelicopter() {
    asegurarAudioContext();
    const ctx = getAudioContext();
    if (!ctx || isMuted) return;

    if (!helicopterNodes) {
      try {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(280, ctx.currentTime);
        filter.Q.setValueAtTime(2.0, ctx.currentTime);

        // LFO para modular las pulsaciones de las aspas (~5.5 Hz)
        const lfo = ctx.createOscillator();
        lfo.type = 'sawtooth';
        lfo.frequency.setValueAtTime(5.6, ctx.currentTime);

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.25, ctx.currentTime);

        const pulseGain = ctx.createGain();
        pulseGain.gain.setValueAtTime(0.18, ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(pulseGain.gain);

        // Sub-tono sordo característico de motor turboeje
        const engineOsc = ctx.createOscillator();
        engineOsc.type = 'triangle';
        engineOsc.frequency.setValueAtTime(95, ctx.currentTime);
        const engineGain = ctx.createGain();
        engineGain.gain.setValueAtTime(0.12, ctx.currentTime);

        const masterHeliGain = ctx.createGain();
        masterHeliGain.gain.setValueAtTime(0.001, ctx.currentTime);
        masterHeliGain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.3);

        noise.connect(filter);
        filter.connect(pulseGain);
        pulseGain.connect(masterHeliGain);
        engineOsc.connect(engineGain);
        engineGain.connect(masterHeliGain);
        masterHeliGain.connect(sfxGain);

        noise.start();
        lfo.start();
        engineOsc.start();

        helicopterNodes = { noise, lfo, engineOsc, masterHeliGain };
      } catch (e) {
        console.warn('Error al iniciar helicóptero:', e);
      }
    }
  }

  /**
   * Detiene el sonido del helicóptero.
   */
  function stopHelicopter() {
    if (!helicopterNodes || !audioCtx) return;
    try {
      const nodes = helicopterNodes;
      helicopterNodes = null;
      const now = audioCtx.currentTime;
      nodes.masterHeliGain.gain.linearRampToValueAtTime(0.001, now + 0.3);
      setTimeout(() => {
        try {
          nodes.noise.stop();
          nodes.lfo.stop();
          nodes.engineOsc.stop();
          nodes.masterHeliGain.disconnect();
        } catch (e) {}
      }, 350);
    } catch (e) {
      helicopterNodes = null;
    }
  }

  /* ───────────────────────── Mute / Unmute & UI ───────────────────────── */

  function setMuted(muted) {
    isMuted = Boolean(muted);
    try {
      localStorage.setItem('ares1_audio_muted', String(isMuted));
    } catch (e) {}

    const ctx = getAudioContext();
    if (ctx && masterGain) {
      masterGain.gain.setValueAtTime(isMuted ? 0 : 1, ctx.currentTime);
    }

    if (!isMuted && !bgmRunning) {
      iniciarBGM();
    }
    actualizarBotonesUI();
  }

  function alternarMute() {
    asegurarAudioContext();
    setMuted(!isMuted);
    if (!isMuted) {
      playSelect();
      if (!bgmRunning) iniciarBGM();
    }
    return !isMuted;
  }

  function actualizarBotonesUI() {
    const btns = document.querySelectorAll('#btn-toggle-audio, .btn-audio-toggle');
    btns.forEach(btn => {
      if (isMuted) {
        btn.innerHTML = '🔇 AUDIO: OFF';
        btn.classList.add('muted');
        btn.setAttribute('aria-pressed', 'false');
        btn.title = 'Activar música y efectos retro';
      } else {
        btn.innerHTML = '🔊 AUDIO: ON';
        btn.classList.remove('muted');
        btn.setAttribute('aria-pressed', 'true');
        btn.title = 'Silenciar música y efectos';
      }
    });
  }

  /* ───────────────────────── Efectos de Sonido (SFX) Retro ───────────────────────── */

  function playBeep(frequency = 520, duration = 80) {
    asegurarAudioContext();
    const ctx = getAudioContext();
    if (!ctx || isMuted) return;
    playTone(frequency, duration / 1000, 'square', 0.16, ctx.currentTime, sfxGain);
  }

  function playSelect() {
    asegurarAudioContext();
    const ctx = getAudioContext();
    if (!ctx || isMuted) return;
    const now = ctx.currentTime;
    playTone(587.33, 0.05, 'square', 0.18, now, sfxGain);
    playTone(880.00, 0.08, 'square', 0.20, now + 0.05, sfxGain);
  }

  function playDeselect() {
    asegurarAudioContext();
    const ctx = getAudioContext();
    if (!ctx || isMuted) return;
    const now = ctx.currentTime;
    playTone(659.25, 0.04, 'square', 0.14, now, sfxGain);
    playTone(440.00, 0.06, 'square', 0.12, now + 0.04, sfxGain);
  }

  function playStepNext() {
    asegurarAudioContext();
    const ctx = getAudioContext();
    if (!ctx || isMuted) return;
    const now = ctx.currentTime;
    playTone(440.00, 0.06, 'triangle', 0.22, now, sfxGain);
    playTone(554.37, 0.06, 'triangle', 0.24, now + 0.06, sfxGain);
    playTone(659.25, 0.12, 'square', 0.26, now + 0.12, sfxGain);
  }

  function playStepBack() {
    asegurarAudioContext();
    const ctx = getAudioContext();
    if (!ctx || isMuted) return;
    const now = ctx.currentTime;
    playTone(554.37, 0.06, 'triangle', 0.18, now, sfxGain);
    playTone(440.00, 0.08, 'triangle', 0.18, now + 0.06, sfxGain);
  }

  function playLaunch() {
    asegurarAudioContext();
    const ctx = getAudioContext();
    if (!ctx || isMuted) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.6);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc.connect(gain).connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.7);

    playNoise(0.5, now + 0.1, false);
  }

  function playAlarm() {
    asegurarAudioContext();
    const ctx = getAudioContext();
    if (!ctx || isMuted) return;
    const now = ctx.currentTime;
    [350, 700, 350, 700].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0.001, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.14);
      osc.connect(gain).connect(sfxGain);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.15);
    });
  }

  function playPulse() {
    asegurarAudioContext();
    const ctx = getAudioContext();
    if (!ctx || isMuted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.25);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain).connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  function playDrill() {
    asegurarAudioContext();
    const ctx = getAudioContext();
    if (!ctx || isMuted) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      playTone(180 + (i % 2) * 60, 0.04, 'sawtooth', 0.18, now + i * 0.05, sfxGain);
    }
  }

  function playSample() {
    asegurarAudioContext();
    const ctx = getAudioContext();
    if (!ctx || isMuted) return;
    const now = ctx.currentTime;
    const notas = [N.C5, N.E5, N.G5, N.C6];
    notas.forEach((freq, idx) => {
      playTone(freq, 0.12, 'square', 0.22, now + idx * 0.08, sfxGain);
    });
  }

  function playSuccess() {
    asegurarAudioContext();
    const ctx = getAudioContext();
    if (!ctx || isMuted) return;
    const now = ctx.currentTime;
    const notas = [N.G4, N.C5, N.E5, N.G5, N.C6];
    notas.forEach((freq, idx) => {
      playTone(freq, idx === notas.length - 1 ? 0.45 : 0.1, 'triangle', 0.28, now + idx * 0.1, sfxGain);
    });
  }

  /* ───────────────────────── Desbloqueo Automático por Gesto ───────────────────────── */

  function autoIniciarAudio() {
    asegurarAudioContext();
    if (!isMuted && !bgmRunning) {
      iniciarBGM();
    }
  }

  ['click', 'keydown', 'pointerdown', 'touchstart'].forEach(ev => {
    document.addEventListener(ev, autoIniciarAudio, { passive: true });
  });

  document.addEventListener('DOMContentLoaded', () => {
    actualizarBotonesUI();
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#btn-toggle-audio, .btn-audio-toggle');
      if (btn) {
        alternarMute();
      }
    });
  });

  /* ───────────────────────── Exposición Global ───────────────────────── */

  window.Sound = {
    iniciarBGM,
    detenerBGM,
    alternarMute,
    setMuted,
    isMuted: () => isMuted,
    actualizarBotonesUI,
    startThruster,
    updateThruster,
    stopThruster,
    startHelicopter,
    stopHelicopter,
    playBeep,
    playSelect,
    playDeselect,
    playStepNext,
    playStepBack,
    playLaunch,
    playAlarm,
    playPulse,
    playDrill,
    playSample,
    playSuccess
  };

})(typeof window !== 'undefined' ? window : this);
