/**
 * Misión Ares-I – js/cosmos.js
 * Capa de Fondo Espacial Profundo con Partículas Cósmicas Flotantes (16-bit Pixel Art)
 * Motor ligero de estrellas parpadeantes y motas de polvo estelar/marciano.
 */
(function (window) {
  'use strict';

  let canvas = null;
  let ctx = null;
  let animId = null;
  let visible = true;
  let estrellas = [];
  let motasPolvo = [];

  const NUM_ESTRELLAS = 95;
  const NUM_MOTAS = 32;

  // Paleta de colores cósmicos pixel-art
  const COLORES_ESTRELLAS = ['#ffffff', '#f8fafc', '#e2e8f0', '#fef08a', '#93c5fd', '#38bdf8'];
  const COLORES_POLVO = [
    'rgba(248, 250, 252, 0.45)', // Blanco estelar
    'rgba(56, 189, 248, 0.40)',  // Azul nebulosa
    'rgba(253, 224, 71, 0.35)',  // Oro cósmico
    'rgba(251, 146, 60, 0.40)',  // Polvo marciano naranja
    'rgba(239, 68, 68, 0.30)'    // Óxido marciano
  ];

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function crearEstrellas(w, h) {
    const list = [];
    for (let i = 0; i < NUM_ESTRELLAS; i++) {
      list.push({
        x: rand(0, w),
        y: rand(0, h),
        size: Math.random() < 0.8 ? 1 : 2, // 1px o 2px pixel-art
        color: COLORES_ESTRELLAS[Math.floor(Math.random() * COLORES_ESTRELLAS.length)],
        baseAlpha: rand(0.25, 0.95),
        alpha: rand(0.2, 0.9),
        speed: rand(0.8, 2.5),
        fase: rand(0, Math.PI * 2)
      });
    }
    return list;
  }

  function crearMotasPolvo(w, h) {
    const list = [];
    for (let i = 0; i < NUM_MOTAS; i++) {
      list.push({
        x: rand(0, w),
        y: rand(0, h),
        size: Math.random() < 0.7 ? 2 : 3, // Cuadraditos de 2px a 3px
        color: COLORES_POLVO[Math.floor(Math.random() * COLORES_POLVO.length)],
        vx: rand(-0.15, 0.15),
        vy: rand(-0.35, -0.08), // Flotan suavemente hacia arriba
        wobble: rand(0, Math.PI * 2),
        wobbleSpeed: rand(0.5, 1.5)
      });
    }
    return list;
  }

  function redimensionar() {
    if (!canvas) return;
    const w = window.innerWidth || document.documentElement.clientWidth || 1920;
    const h = window.innerHeight || document.documentElement.clientHeight || 1080;
    canvas.width = w;
    canvas.height = h;

    if (estrellas.length === 0) {
      estrellas = crearEstrellas(w, h);
      motasPolvo = crearMotasPolvo(w, h);
    }
  }

  function render(tiempo) {
    if (!visible) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const tSegundos = tiempo / 1000;

    // 1. Dibujar estrellas con parpadeo suave
    for (let i = 0; i < estrellas.length; i++) {
      const e = estrellas[i];
      const twinkle = Math.sin(tSegundos * e.speed + e.fase);
      const a = Math.max(0.12, Math.min(1.0, e.baseAlpha + twinkle * 0.35));

      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = e.color;
      ctx.fillRect(Math.floor(e.x), Math.floor(e.y), e.size, e.size);
      ctx.restore();
    }

    // 2. Dibujar motas de polvo cósmico / marciano en deriva lenta
    for (let i = 0; i < motasPolvo.length; i++) {
      const p = motasPolvo[i];
      p.x += p.vx + Math.sin(tSegundos * p.wobbleSpeed + p.wobble) * 0.18;
      p.y += p.vy;

      // Wrap around en los bordes de la pantalla
      if (p.y < -10) p.y = h + 5;
      if (p.y > h + 10) p.y = -5;
      if (p.x < -10) p.x = w + 5;
      if (p.x > w + 10) p.x = -5;

      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    }

    animId = requestAnimationFrame(render);
  }

  function iniciar() {
    // Buscar o inyectar el canvas #capa-cosmos
    canvas = document.getElementById('capa-cosmos');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'capa-cosmos';
      document.body.prepend(canvas);
    }

    ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    redimensionar();
    window.addEventListener('resize', redimensionar, { passive: true });

    // Ahorro de recursos al cambiar de pestaña
    document.addEventListener('visibilitychange', () => {
      visible = !document.hidden;
      if (visible) {
        if (!animId) animId = requestAnimationFrame(render);
      } else {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      }
    });

    if (animId === null) {
      animId = requestAnimationFrame(render);
    }
  }

  // Inicializar en DOMContentLoaded o inmediatamente si el DOM ya está listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

  window.CapaCosmos = { iniciar, redimensionar };
})(typeof window !== 'undefined' ? window : this);
