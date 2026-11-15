/**
 * Misión Ares-I – js/scenes/celebration.js
 * Fase 6.3: Gran Celebración en la Tierra estilo Terraria / NASA
 *
 * - Canvas grande de 960x420 dentro de un .marco-nasa.
 * - SOLO UN globo de diálogo a la vez (el del astronauta activo).
 * - El botón "VER INFORME FINAL" (y la tecla Espacio) detienen la animación,
 *   activan #escena-report y arrancan ReportScene.iniciar().
 *
 * Diseño de la escena (para js/sprites.js → dibujarCelebracionTerraria):
 *   centro del canvas = w / 2
 *   Presidente: centro - 150 · Dan: centro - 75 · Ana: centro · Leo: centro + 75 · Maya: centro + 150
 *
 * Compatibilidad: si js/sprites.js todavía tiene la versión antigua de
 * dibujarCelebracionTerraria (5 parámetros), esta escena la sigue usando
 * sin romperse.
 */
(function (window) {
  'use strict';

  const CW = 960;
  const CH = 420;

  const ORDEN = ['dan', 'ana', 'leo', 'maya'];
  const NOMBRES = { dan: 'Dan', ana: 'Ana', leo: 'Leo', maya: 'Maya' };

  // Posición X de cada astronauta, medida desde el centro del canvas
  const OFFSETS_NUEVOS = { dan: -75, ana: 0, leo: 75, maya: 150 };
  const OFFSETS_ANTIGUOS = { dan: -50, ana: -10, leo: 30, maya: 70 };

  const frasesPorPersonaje = {
    dan: [
      '¡Muestras de Jezero aseguradas!',
      '¡Orgulloso de toda la tripulación!',
      '¡Primeros pasos firmes en Marte!'
    ],
    ana: [
      '¡Gran éxito científico en Marte!',
      '¡Minerales y agua fósil listos para análisis!',
      '¡El cráter guarda secretos milenarios!'
    ],
    leo: [
      '¡La nave resistió toda la misión!',
      '¡Los sistemas y paneles rindieron al 100%!',
      '¡Ingeniería espacial de primera categoría!'
    ],
    maya: [
      '¡Telemetría enlazada con la Tierra!',
      '¡Cada bit de datos llegó a salvo al DSN!',
      '¡Comunicación orbital impecable!'
    ]
  };

  let rafId = null;
  let listeners = [];
  let yaNavego = false;

  // Estado de la escena
  let personajeActivo = 'dan';
  let indiceFrase = { dan: 0, ana: 0, leo: 0, maya: 0 };
  let fraseActiva = frasesPorPersonaje.dan[0];

  /* ───────────────────────── Utilidades ───────────────────────── */

  function escuchar(elemento, evento, handler, opciones) {
    if (!elemento) return;
    elemento.addEventListener(evento, handler, opciones);
    listeners.push({ elemento, evento, handler, opciones });
  }

  function limpiarListeners() {
    listeners.forEach(({ elemento, evento, handler, opciones }) => {
      elemento.removeEventListener(evento, handler, opciones);
    });
    listeners = [];
  }

  function detener() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    limpiarListeners();
  }

  /** ¿js/sprites.js ya tiene la versión nueva (6 parámetros)? */
  function usaSpritesNuevos() {
    const f = window.Sprites && window.Sprites.dibujarCelebracionTerraria;
    return typeof f === 'function' && f.length >= 6;
  }

  function activarPersonaje(clave) {
    if (clave === personajeActivo) {
      // Mismo astronauta: pasa a su siguiente frase
      indiceFrase[clave] = (indiceFrase[clave] + 1) % frasesPorPersonaje[clave].length;
    } else {
      personajeActivo = clave;
    }
    fraseActiva = frasesPorPersonaje[clave][indiceFrase[clave]];
  }

  /* ───────────────────────── Navegación al informe ───────────────────────── */

  /**
   * Detiene la animación, activa #escena-report y arranca el informe.
   * Se hace a mano (sin depender de UI.cambiarEscena) para que nunca
   * se quede la pantalla vacía.
   */
  function irAlReporte() {
    if (yaNavego) return;
    yaNavego = true;
    detener();

    document.querySelectorAll('.escena').forEach((s) => s.classList.remove('activa'));
    const escenaReport = document.getElementById('escena-report');
    if (escenaReport) escenaReport.classList.add('activa');
    window.scrollTo(0, 0);

    if (window.ReportScene && typeof window.ReportScene.iniciar === 'function') {
      window.ReportScene.iniciar();
    } else {
      console.error('ReportScene no está disponible: revisa que js/scenes/report.js se cargue en index.html.');
    }
  }

  /* ───────────────────────── Render ───────────────────────── */

  function render(contenedor) {
    if (!contenedor) return;
    detener();
    yaNavego = false;
    personajeActivo = 'dan';
    indiceFrase = { dan: 0, ana: 0, leo: 0, maya: 0 };
    fraseActiva = frasesPorPersonaje.dan[0];
    if (window.Sound?.playSuccess) window.Sound.playSuccess();

    contenedor.innerHTML = `
      <div class="marco-nasa" id="celebracion-wrapper" style="text-align:center;">
        <span class="badge-tag">FASE 6.3 · HOMENAJE AEROESPACIAL</span>
        <h1>¡MISIÓN COMPLETADA! TRIPULACIÓN ARES-I HA REGRESADO A SALVO</h1>
        <p class="briefing-caption" style="text-align:center; margin:0 0 12px;">
          Haz clic sobre Dan, Ana, Leo o Maya para escuchar sus testimonios de la misión.
        </p>

        <canvas id="canvas-celebracion" class="canvas-grande" width="${CW}" height="${CH}"
                style="cursor:pointer;"
                aria-label="Gran celebración de bienvenida en la Tierra con el Presidente, los astronautas y fuegos artificiales"></canvas>

        <div style="margin-top:14px; display:flex; justify-content:center; gap:16px; flex-wrap:wrap;">
          <button type="button" class="btn btn-launch" id="btn-ver-informe-celebracion">
            VER INFORME FINAL ➔
          </button>
        </div>
        <p class="briefing-caption" style="text-align:center; margin:10px 0 0;">Pulsa [ESPACIO] para continuar</p>
      </div>
    `;

    const canvas = contenedor.querySelector('#canvas-celebracion');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const sprites = window.Sprites;

    if (!ctx || !sprites || typeof sprites.dibujarCelebracionTerraria !== 'function') {
      console.error('Celebración: falta Sprites.dibujarCelebracionTerraria. Se pasa directo al informe.');
      irAlReporte();
      return;
    }

    let tick = 0;
    let tickUltimoCambio = 0;
    let errorDibujo = false;

    // Clic sobre un astronauta → cambia el globo de diálogo
    escuchar(canvas, 'click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const escala = canvas.width / rect.width;
      const clickX = (e.clientX - rect.left) * escala;
      const centro = CW / 2;
      const nuevos = usaSpritesNuevos();
      const offsets = nuevos ? OFFSETS_NUEVOS : OFFSETS_ANTIGUOS;
      const tolerancia = nuevos ? 34 : 22;

      for (let i = 0; i < ORDEN.length; i++) {
        const clave = ORDEN[i];
        const xPersonaje = centro + offsets[clave] + (nuevos ? 0 : 10);
        if (Math.abs(clickX - xPersonaje) < tolerancia) {
          activarPersonaje(clave);
          tickUltimoCambio = tick;
          break;
        }
      }
    });

    // Botón y tecla Espacio → informe final
    escuchar(contenedor.querySelector('#btn-ver-informe-celebracion'), 'click', irAlReporte);
    escuchar(window, 'keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        irAlReporte();
      }
    });

    function dibujarFrame() {
      if (usaSpritesNuevos()) {
        // Versión nueva: UN solo globo (personaje activo + su frase)
        sprites.dibujarCelebracionTerraria(ctx, CW, CH, tick, personajeActivo, fraseActiva);
      } else {
        // Versión antigua de sprites.js: solo se envía la frase del astronauta activo
        const frases = { dan: '', ana: '', leo: '', maya: '' };
        frases[personajeActivo] = fraseActiva;
        sprites.dibujarCelebracionTerraria(ctx, CW, CH, tick, frases);
      }
    }

    function animar() {
      tick++;

      // Cada ~7 s, si nadie hace clic, habla el siguiente astronauta
      if (tick - tickUltimoCambio > 420) {
        const siguiente = ORDEN[(ORDEN.indexOf(personajeActivo) + 1) % ORDEN.length];
        personajeActivo = siguiente;
        fraseActiva = frasesPorPersonaje[siguiente][indiceFrase[siguiente]];
        tickUltimoCambio = tick;
      }

      try {
        dibujarFrame();
      } catch (err) {
        if (!errorDibujo) {
          errorDibujo = true;
          console.error('Error dibujando la celebración:', err);
        }
        // Se detiene la animación pero el botón al informe sigue funcionando
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(animar);
    }

    rafId = requestAnimationFrame(animar);
  }

  function iniciar() {
    const contenedor = document.getElementById('escena-celebration');
    if (contenedor) {
      render(contenedor);
    }
  }

  window.CelebrationScene = {
    iniciar,
    render,
    detener
  };

})(typeof window !== 'undefined' ? window : this);