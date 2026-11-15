/**
 * Misión Ares-I: Diseña, Lanza y Sobrevive
 * js/state.js - Gestión de estado global de la misión
 *
 * Expose window.estadoMision and window.reiniciarEstado().
 * Single source of truth for all screens.
 */

(function (window) {
  'use strict';

  // Genera la estructura de estado inicial con valores válidos por defecto.
  function crearEstadoInicial() {
    return {
      // 1. Configuración inicial
      modo: 'solo',                // 'solo' o 'equipo'
      dificultad: 'ingeniero',     // 'novato', 'ingeniero', 'director'
      objetivo: 'agua',            // 'agua', 'mapeo', 'economica'
      presupuestoMax: 500,         // Según dificultad
      metasRoles: {},              // Metas privadas por rol (modo equipo)
      metaCumplida: false,         // Bonus de decisión si se cumplen metas

      // 2. Diseño actual (valores válidos)
      diseno: {
        cohete: 'medio',
        panel: 'M',
        bateria: 'basica',
        antena: 'baja',
        blindaje: false,
        redundancia: false,
        instrumentos: ['camaraPan', 'meteo'],
        relay: 'ninguno'
      },

      // 3. Variables dinámicas durante la misión
      bateriaActual: 100,
      danoPaneles: 0,
      datosTransito: 0,
      muestrasRecolectadas: 0,
      decision2: null,
      decision3: null,
      eventosOcurridos: [],
      historialCausaEfecto: []   // { etapa, eleccion, consecuencia, explicacion }
    };
  }

  // Parse URL hash for shared design
  const parseHashDesign = () => {
    const hash = window.location.hash;
    if (!hash) return null;
    const match = hash.match(/#d=([^&]+)/);
    if (!match) return null;
    const parts = match[1].split(',');
    const [cohete, panel, bateria, antena, blindaje, redundancia, instrumentosStr, relay] = parts;
    const instrumentos = instrumentosStr ? instrumentosStr.split('|') : [];
    return {
      cohete,
      panel,
      bateria,
      antena,
      blindaje: blindaje === 'true',
      redundancia: redundancia === 'true',
      instrumentos,
      relay
    };
  };

  // Instancia global única
  const estado = crearEstadoInicial();
  const hashDesign = parseHashDesign();
  if (hashDesign) {
    Object.assign(estado.diseno, hashDesign);
  }

  // Proxies para acceso directo a piezas de diseño
  const piezasDiseno = ['cohete', 'panel', 'bateria', 'antena', 'blindaje', 'redundancia', 'instrumentos', 'relay'];
  piezasDiseno.forEach(prop => {
    Object.defineProperty(estado, prop, {
      get() { return this.diseno?.[prop]; },
      set(val) {
        if (!this.diseno) this.diseno = {};
        this.diseno[prop] = val;
      },
      enumerable: true,
      configurable: true
    });
  });

  // Helpers de registro
  estado.registrarCausaEfecto = function (etapa, eleccion, consecuencia, explicacion) {
    this.historialCausaEfecto.push({ etapa, eleccion, consecuencia, explicacion, timestamp: Date.now() });
  };

  estado.registrarEvento = function (evento) {
    this.eventosOcurridos.push(evento);
  };

  // Reinicia el estado manteniendo la referencia original
  function reiniciarEstado(overrides = {}) {
    const fresh = crearEstadoInicial();
    const disenoActual = estado.diseno;
    const eventosActuales = estado.eventosOcurridos;
    const historialActual = estado.historialCausaEfecto;
    const disenoInicial = { ...fresh.diseno, ...(overrides.diseno || {}) };
    piezasDiseno.forEach(prop => {
      if (Object.prototype.hasOwnProperty.call(overrides, prop)) {
        disenoInicial[prop] = overrides[prop];
      }
    });

    Object.keys(estado).forEach(prop => {
      if (!(prop in fresh) && !piezasDiseno.includes(prop) &&
          prop !== 'registrarCausaEfecto' && prop !== 'registrarEvento') {
        delete estado[prop];
      }
    });

    Object.keys(disenoActual).forEach(prop => {
      if (!(prop in disenoInicial)) delete disenoActual[prop];
    });
    Object.assign(disenoActual, disenoInicial);

    eventosActuales.splice(0, eventosActuales.length, ...(overrides.eventosOcurridos || []));
    historialActual.splice(0, historialActual.length, ...(overrides.historialCausaEfecto || []));

    Object.assign(estado, fresh, overrides, {
      diseno: disenoActual,
      eventosOcurridos: eventosActuales,
      historialCausaEfecto: historialActual
    });
    return estado;
  }

  // Exponer al entorno global
  window.estadoMision = estado;
  window.reiniciarEstado = reiniciarEstado;
})(window);
