/**
 * Misión Ares-I: Diseña, Lanza y Sobrevive
 * js/data.js - Constantes, especificaciones y catálogo de piezas
 * 
 * Expuesto globalmente en window.DATA para ejecución directa sin servidores.
 */

window.DATA = {
  // Configuración base de la cápsula / chasis Ares-I
  baseNave: {
    masa: 150,        // kg
    costo: 40,        // M€ / M$
    consumoW: 60,     // W base (aviónica, soporte vital mínimo, telemetría)
    meses: 10         // meses de ensamblaje base
  },

  // Ventana orbital máxima para el lanzamiento (meses antes de que se cierre la ventana Tierra-Marte)
  ventanaMeses: 28,

  // Presupuesto asignado según dificultad elegida
  dificultades: {
    novato: {
      id: 'novato',
      nombre: 'Novato',
      presupuesto: 700,
      costo: 700,
      valueOf() { return 700; }
    },
    ingeniero: {
      id: 'ingeniero',
      nombre: 'Ingeniero',
      presupuesto: 500,
      costo: 500,
      valueOf() { return 500; }
    },
    director: {
      id: 'director',
      nombre: 'Director',
      presupuesto: 400,
      costo: 400,
      valueOf() { return 400; }
    }
  },

  // Vehículos de lanzamiento (cohetes)
  cohetes: {
    ligero: {
      id: 'ligero',
      nombre: 'Cohete Ligero',
      capacidad: 400,   // kg
      costo: 60,        // M
      fiabilidad: 0.88, // 88%
      meses: 0          // meses de desarrollo adicional
    },
    medio: {
      id: 'medio',
      nombre: 'Cohete Medio',
      capacidad: 700,   // kg
      costo: 140,       // M
      fiabilidad: 0.94, // 94%
      meses: 2
    },
    pesado: {
      id: 'pesado',
      nombre: 'Cohete Pesado',
      capacidad: 1100,  // kg
      costo: 260,       // M
      fiabilidad: 0.97, // 97%
      meses: 5
    }
  },

  // Paneles solares (generación en órbita / superficie)
  paneles: {
    S: {
      id: 'S',
      nombre: 'Panel Solar S',
      masa: 30,         // kg
      costo: 10,        // M
      potenciaW: 200,   // W
      consumoW: 200,    // alias
      w: 200,
      meses: 0
    },
    M: {
      id: 'M',
      nombre: 'Panel Solar M',
      masa: 55,         // kg
      costo: 20,        // M
      potenciaW: 400,   // W
      consumoW: 400,
      w: 400,
      meses: 0
    },
    L: {
      id: 'L',
      nombre: 'Panel Solar L',
      masa: 90,         // kg
      costo: 35,        // M
      potenciaW: 700,   // W
      consumoW: 700,
      w: 700,
      meses: 2
    }
  },

  // Baterías recargables
  baterias: {
    basica: {
      id: 'basica',
      nombre: 'Batería Básica',
      masa: 25,         // kg
      costo: 8,         // M
      capacidadWh: 600, // Wh
      wh: 600,
      meses: 0
    },
    avanzada: {
      id: 'avanzada',
      nombre: 'Batería Avanzada',
      masa: 45,         // kg
      costo: 20,        // M
      capacidadWh: 1200,// Wh
      wh: 1200,
      meses: 1
    }
  },

  // Antenas de telecomunicaciones
  antenas: {
    baja: {
      id: 'baja',
      nombre: 'Antena Baja Ganancia',
      masa: 10,         // kg
      costo: 5,         // M
      datosUD: 20,      // Unidades de Datos (UD)
      ud: 20,
      consumoW: 20,     // W
      w: 20,
      meses: 0
    },
    alta: {
      id: 'alta',
      nombre: 'Antena Alta Ganancia',
      masa: 30,         // kg
      costo: 18,        // M
      datosUD: 50,      // Unidades de Datos (UD)
      ud: 50,
      consumoW: 60,     // W
      w: 60,
      meses: 1
    }
  },

  // Sistemas extras de protección y redundancia
  extras: {
    blindaje: {
      id: 'blindaje',
      nombre: 'Blindaje Antirradiación',
      masa: 15,         // kg
      costo: 12,        // M
      meses: 0
    },
    redundancia: {
      id: 'redundancia',
      nombre: 'Sistemas Redundantes',
      masa: 10,         // kg
      costo: 10,        // M
      meses: 1
    }
  },

  // Instrumentos científicos (máximo 4 seleccionables en diseño)
  instrumentos: {
    camaraPan: {
      id: 'camaraPan',
      nombre: 'Cámara Panorámica',
      masa: 12,         // kg
      consumoW: 25,     // W
      w: 25,
      costo: 15,        // M
      datosUD: 3,       // UD
      ud: 3,
      ciencia: 10,      // Puntos de ciencia
      meses: 0
    },
    camaraAlta: {
      id: 'camaraAlta',
      nombre: 'Cámara Alta Resolución',
      masa: 30,         // kg
      consumoW: 60,     // W
      w: 60,
      costo: 40,        // M
      datosUD: 10,      // UD
      ud: 10,
      ciencia: 25,      // Puntos de ciencia
      meses: 2
    },
    espectrometro: {
      id: 'espectrometro',
      nombre: 'Espectrómetro de Masas',
      masa: 18,         // kg
      consumoW: 40,     // W
      w: 40,
      costo: 30,        // M
      datosUD: 2,       // UD
      ud: 2,
      ciencia: 30,      // Puntos de ciencia
      meses: 2
    },
    radar: {
      id: 'radar',
      nombre: 'Radar de Subsuelo',
      masa: 35,         // kg
      consumoW: 55,     // W
      w: 55,
      costo: 50,        // M
      datosUD: 6,       // UD
      ud: 6,
      ciencia: 35,      // Puntos de ciencia
      meses: 3
    },
    meteo: {
      id: 'meteo',
      nombre: 'Estación Meteorológica',
      masa: 5,          // kg
      consumoW: 10,     // W
      w: 10,
      costo: 8,         // M
      datosUD: 1,       // UD
      ud: 1,
      ciencia: 8,       // Puntos de ciencia
      meses: 0
    },
    taladro: {
      id: 'taladro',
      nombre: 'Taladro de Perforación',
      masa: 40,         // kg
      consumoW: 70,     // W
      w: 70,
      costo: 45,        // M
      datosUD: 2,       // UD
      ud: 2,
      ciencia: 40,      // Puntos de ciencia
      meses: 3
    }
  },

  // Satélites de retransmisión (relays en órbita marciana)
  relays: {
    ninguno: {
      id: 'ninguno',
      nombre: 'Sin Relay Directo',
      masa: 0,          // kg
      costo: 0,         // M
      cobertura: 0.40,  // 40% de cobertura
      cob: 0.40,
      meses: 0
    },
    baja: {
      id: 'baja',
      nombre: 'Órbita Baja',
      masa: 25,         // kg
      costo: 25,        // M
      cobertura: 0.65,  // 65% de cobertura
      cob: 0.65,
      meses: 1
    },
    eliptica: {
      id: 'eliptica',
      nombre: 'Órbita Elíptica',
      masa: 30,         // kg
      costo: 32,        // M
      cobertura: 0.80,  // 80% de cobertura
      cob: 0.80,
      meses: 2
    },
    areoestacionaria: {
      id: 'areoestacionaria',
      nombre: 'Órbita Areoestacionaria',
      masa: 45,         // kg
      costo: 50,        // M
      cobertura: 0.95,  // 95% de cobertura
      cob: 0.95,
      meses: 3
    }
  }
};

