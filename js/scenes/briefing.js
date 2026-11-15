/**
 * Misión Ares-I - js/scenes/briefing.js
 * Briefing inicial, dificultad y selección del objetivo científico.
 */

(function (window) {
  'use strict';

  const DIFICULTADES = [
    { id: 'novato', nombre: 'Novato', presupuesto: 700, descripcion: 'Presupuesto amplio para explorar.' },
    { id: 'ingeniero', nombre: 'Ingeniero', presupuesto: 500, descripcion: 'Un reto equilibrado.' },
    { id: 'director', nombre: 'Director', presupuesto: 400, descripcion: 'Recursos limitados; cada decisión cuenta.' }
  ];

  const OBJETIVOS = [
    {
      id: 'agua',
      nombre: 'Buscar agua antigua',
      descripcion: 'Investiga señales de agua y ambientes habitables en el pasado de Jezero.',
      bono: 'Bonifica Espectrómetro, Radar de subsuelo y Taladro.'
    },
    {
      id: 'mapeo',
      nombre: 'Mapear el cráter',
      descripcion: 'Crea un mapa geológico detallado del cráter Jezero.',
      bono: 'Bonifica las cámaras panorámica y de alta resolución.'
    },
    {
      id: 'economica',
      nombre: 'Misión económica',
      descripcion: 'Maximiza los resultados científicos con una arquitectura eficiente.',
      bono: 'Reduce el presupuesto disponible en 100 M$ y premia el ahorro.'
    }
  ];

  function obtenerObjetivo(estado) {
    return OBJETIVOS.find(objetivo => objetivo.id === estado?.objetivo) || OBJETIVOS[0];
  }

  function presupuestoBase(dificultad) {
    const config = window.DATA?.dificultades?.[dificultad];
    if (typeof config === 'number') return config;
    return Number(config?.presupuesto ?? DIFICULTADES.find(item => item.id === dificultad)?.presupuesto ?? 500);
  }

  function actualizarConfiguracion(estado) {
    if (!estado) return;
    const base = presupuestoBase(estado.dificultad);
    estado.presupuestoMax = Math.max(0, base - (estado.objetivo === 'economica' ? 100 : 0));

    const presupuesto = document.getElementById('briefing-presupuesto-disponible');
    if (presupuesto) presupuesto.textContent = `${estado.presupuestoMax} M$`;
    window.UI?.actualizarObjetivoActivo?.(estado.objetivo);
  }

  function dibujarTripulacion(canvas) {
    const sprites = window.Sprites;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !sprites?.dibujarAstronauta) return;

    const gradiente = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradiente.addColorStop(0, '#0b2254');
    gradiente.addColorStop(1, '#3b1710');
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    [
      { id: 'dan', x: 55 },
      { id: 'ana', x: 215 },
      { id: 'leo', x: 375 },
      { id: 'maya', x: 535 }
    ].forEach(persona => {
      sprites.dibujarAstronauta(ctx, persona.id, persona.x, 62, {
        escala: 3,
        estado: 'quieto',
        mostrarNombre: true
      });
    });
  }

  function render(container) {
    if (!container) return;

    const estado = window.estadoMision;
    const objetivoActual = obtenerObjetivo(estado);
    const dificultadActual = DIFICULTADES.some(item => item.id === estado?.dificultad)
      ? estado.dificultad
      : 'ingeniero';
    if (estado) {
      estado.dificultad = dificultadActual;
      estado.objetivo = objetivoActual.id;
    }

    container.innerHTML = `
      <div class="marco-nasa briefing-panel">
        <p class="briefing-kicker">NASA SPACE APPS CHALLENGE · MISIÓN ARES-I</p>
        <h1>Briefing de misión</h1>
        <p class="briefing-intro">
          Viajarás al cráter Jezero, en Marte, para investigar su historia y buscar
          señales de agua antigua. Diseña una nave capaz de llegar, operar con
          seguridad y devolver descubrimientos científicos.
        </p>

        <section class="briefing-tripulacion" aria-labelledby="briefing-tripulacion-titulo">
          <h2 id="briefing-tripulacion-titulo">DIRECCIÓN DE MISIÓN Y TRIPULACIÓN</h2>
          <p><strong>Directora de misión:</strong> tú lideras el diseño y las decisiones de la misión.</p>
          <canvas id="briefing-tripulacion-canvas" width="700" height="160"
                  aria-label="Tripulación: Dan, Ana, Leo y Maya"></canvas>
          <p class="briefing-caption">Dan · Ana · Leo · Maya — equipo de exploración de Jezero</p>
        </section>

        <section aria-labelledby="briefing-dificultad-titulo">
          <h2 id="briefing-dificultad-titulo">ELIGE LA DIFICULTAD</h2>
          <div class="briefing-options">
            ${DIFICULTADES.map(dificultad => `
              <button type="button" class="briefing-option"
                      data-dificultad="${dificultad.id}"
                      aria-pressed="${dificultad.id === dificultadActual}">
                <strong>${dificultad.nombre} · ${dificultad.presupuesto} M$</strong>
                <span>${dificultad.descripcion}</span>
              </button>
            `).join('')}
          </div>
        </section>

        <section aria-labelledby="briefing-objetivos-titulo">
          <h2 id="briefing-objetivos-titulo">ELIGE EL OBJETIVO CIENTÍFICO</h2>
          <div class="briefing-options">
            ${OBJETIVOS.map(objetivo => `
              <button type="button" class="briefing-option briefing-objective"
                      data-objetivo="${objetivo.id}"
                      aria-pressed="${objetivo.id === objetivoActual.id}">
                <strong>${objetivo.nombre}</strong>
                <span>${objetivo.descripcion}</span>
                <span class="briefing-bonus">${objetivo.bono}</span>
              </button>
            `).join('')}
          </div>
          <p class="briefing-budget" aria-live="polite">
            Presupuesto disponible para esta misión:
            <strong id="briefing-presupuesto-disponible"></strong>
          </p>
        </section>

        <p>En el taller elegirás el cohete, los subsistemas, los instrumentos y el relay.
          Cada decisión afecta la masa, la energía, los datos, el presupuesto y el tiempo.</p>
        <div class="briefing-acciones">
          <button type="button" class="btn btn-launch" id="btn-briefing-iniciar">
            IR AL TALLER DE DISEÑO
          </button>
        </div>
      </div>
    `;

    actualizarConfiguracion(estado);
    dibujarTripulacion(container.querySelector('#briefing-tripulacion-canvas'));

    container.querySelectorAll('[data-dificultad]').forEach(boton => {
      boton.addEventListener('click', () => {
        const dificultad = DIFICULTADES.find(item => item.id === boton.dataset.dificultad);
        if (!dificultad || !window.estadoMision) return;

        window.estadoMision.dificultad = dificultad.id;
        container.querySelectorAll('[data-dificultad]').forEach(opcion => {
          opcion.setAttribute('aria-pressed', String(opcion === boton));
        });
        actualizarConfiguracion(window.estadoMision);
        window.Sound?.playSelect?.();
      });
    });

    container.querySelectorAll('[data-objetivo]').forEach(boton => {
      boton.addEventListener('click', () => {
        const objetivo = OBJETIVOS.find(item => item.id === boton.dataset.objetivo);
        if (!objetivo || !window.estadoMision) return;

        window.estadoMision.objetivo = objetivo.id;
        container.querySelectorAll('[data-objetivo]').forEach(opcion => {
          opcion.setAttribute('aria-pressed', String(opcion === boton));
        });
        actualizarConfiguracion(window.estadoMision);
        window.Sound?.playSelect?.();
      });
    });

    container.querySelector('#btn-briefing-iniciar')?.addEventListener('click', () => {
      window.Sound?.playStepNext?.();
      actualizarConfiguracion(window.estadoMision);
      window.UI?.cambiarEscena('design');
    });
  }

  function iniciar() {
    if (window.estadoMision) window.estadoMision.escenaActual = 'briefing';
    render(document.getElementById('escena-briefing'));
  }

  window.BriefingScene = { iniciar, render };
})(typeof window !== 'undefined' ? window : this);
