/**
 * Misión Ares-I - js/scenes/briefing.js
 * Briefing inicial y selección del objetivo científico.
 */

(function (window) {
  'use strict';

  const OBJETIVOS = [
    {
      id: 'agua',
      nombre: 'Agua antigua',
      descripcion: 'Buscar señales de agua antigua y evaluar si Jezero pudo ser habitable.',
      enfoque: 'Prioriza instrumentos para estudiar el subsuelo y la composición de las rocas.'
    },
    {
      id: 'mapeo',
      nombre: 'Cartografía',
      descripcion: 'Cartografiar la geología del cráter Jezero con observaciones de alta resolución.',
      enfoque: 'Prioriza cámaras y cobertura de comunicaciones para devolver los datos.'
    },
    {
      id: 'economica',
      nombre: 'Misión eficiente',
      descripcion: 'Obtener resultados científicos útiles con una arquitectura de bajo costo.',
      enfoque: 'Equilibra la ciencia con el presupuesto y los recursos disponibles.'
    }
  ];

  function obtenerObjetivo(estado) {
    return OBJETIVOS.find(objetivo => objetivo.id === estado?.objetivo) || OBJETIVOS[0];
  }

  function render(container) {
    if (!container) return;

    const objetivoActual = obtenerObjetivo(window.estadoMision);
    container.innerHTML = `
      <div class="marco-nasa briefing-panel">
        <p class="briefing-kicker">NASA SPACE APPS CHALLENGE · MISIÓN ARES-I</p>
        <h1>Briefing de misión</h1>
        <p class="briefing-intro">
          Tu equipo viajará al cráter Jezero, en Marte. Diseña una nave capaz de
          llegar, operar con seguridad y devolver descubrimientos científicos.
        </p>

        <section aria-labelledby="briefing-objetivos-titulo">
          <h2 id="briefing-objetivos-titulo">OBJETIVO PRINCIPAL DE LA MISIÓN</h2>
          <div class="briefing-objectives">
            ${OBJETIVOS.map(objetivo => `
              <button type="button" class="briefing-objective"
                      data-objetivo="${objetivo.id}"
                      aria-pressed="${objetivo.id === objetivoActual.id}">
                <strong>${objetivo.nombre}</strong>
                <span>${objetivo.descripcion}</span>
              </button>
            `).join('')}
          </div>
          <p class="briefing-objetivo-activo" aria-live="polite">
            <strong>Enfoque seleccionado:</strong>
            <span id="briefing-enfoque">${objetivoActual.enfoque}</span>
          </p>
        </section>

        <p>En el taller elegirás el cohete, los subsistemas, los instrumentos y el relay.
          Cada decisión afecta la masa, la energía, los datos, el presupuesto y el tiempo.</p>
        <div class="briefing-acciones">
          <button type="button" class="btn btn-launch" id="btn-briefing-iniciar">
            INICIAR DISEÑO DE MISIÓN
          </button>
        </div>
      </div>
    `;

    container.querySelectorAll('[data-objetivo]').forEach(boton => {
      boton.addEventListener('click', () => {
        const objetivo = OBJETIVOS.find(item => item.id === boton.dataset.objetivo);
        if (!objetivo || !window.estadoMision) return;

        window.estadoMision.objetivo = objetivo.id;
        container.querySelectorAll('[data-objetivo]').forEach(opcion => {
          opcion.setAttribute('aria-pressed', String(opcion === boton));
        });
        const enfoque = container.querySelector('#briefing-enfoque');
        if (enfoque) enfoque.textContent = objetivo.enfoque;
      });
    });

    container.querySelector('#btn-briefing-iniciar')?.addEventListener('click', () => {
      window.UI?.cambiarEscena('design');
    });
  }

  function iniciar() {
    render(document.getElementById('escena-briefing'));
  }

  window.BriefingScene = { iniciar, render };
})(typeof window !== 'undefined' ? window : this);