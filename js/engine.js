/**
 * Misión Ares-I: Diseña, Lanza y Sobrevive
 * js/engine.js - Motor de simulación y evaluación técnica de la nave
 * 
 * Expone window.Engine con funciones matemáticas y objetos de prueba.
 */

(function (window) {
  'use strict';

  /**
   * Resuelve una referencia de componente que puede venir como clave (string) o como objeto directo.
   */
  function resolverPieza(catalogo, ref) {
    if (!ref) return null;
    if (typeof ref === 'string') {
      return catalogo && catalogo[ref] ? catalogo[ref] : null;
    }
    return ref;
  }

  /**
   * Evalúa la configuración técnica de un diseño de nave.
   * 
   * @param {Object} diseno - Configuración de componentes de la nave.
   * @param {number|Object} presupuestoMax - Presupuesto máximo disponible (default 500 M).
   * @param {boolean} tormentaPolvo - Si hay tormenta de polvo marciana activa (reduce solar 50%).
   * @returns {Object} Métricas calculadas (masa, costo, meses, validez, energía, datos y ciencia).
   */
  function evaluarDiseno(diseno, presupuestoMax = 500, tormentaPolvo = false) {
    const data = window.DATA || {};
    const base = data.baseNave || { masa: 150, costo: 40, consumoW: 60, meses: 10 };
    const ventana = data.ventanaMeses || 28;

    // Aceptar tanto un objeto diseño directo como el objeto estadoMision
    const d = (diseno && diseno.diseno) ? diseno.diseno : (diseno || {});

    // Normalizar presupuesto si se pasa un objeto de dificultad o si viene en estadoMision
    let presupuestoEfectivo = presupuestoMax;
    if (presupuestoMax === 500 && diseno && typeof diseno.presupuestoMax === 'number') {
      presupuestoEfectivo = diseno.presupuestoMax;
    }
    const limitePresupuesto = (typeof presupuestoEfectivo === 'object' && presupuestoEfectivo !== null)
      ? (presupuestoEfectivo.presupuesto || Number(presupuestoEfectivo) || 500)
      : Number(presupuestoEfectivo);

    // 1. Resolver componentes elegidos
    const cohete = resolverPieza(data.cohetes, d.cohete);
    const panel = resolverPieza(data.paneles, d.panel);
    const bateria = resolverPieza(data.baterias, d.bateria);
    const antena = resolverPieza(data.antenas, d.antena);
    const relay = resolverPieza(data.relays, d.relay) || (data.relays && data.relays.ninguno) || { masa: 0, costo: 0, cob: 0.40, meses: 0 };

    // Extras (puede ser array de keys, mapa { blindaje: true } o booleanos d.blindaje / d.redundancia)
    let extrasElegidos = [];
    if (Array.isArray(d.extras)) {
      extrasElegidos = d.extras
        .map(ref => resolverPieza(data.extras, ref))
        .filter(Boolean);
    } else if (d.extras && typeof d.extras === 'object') {
      extrasElegidos = Object.entries(d.extras)
        .filter(([_, activo]) => Boolean(activo))
        .map(([key]) => resolverPieza(data.extras, key))
        .filter(Boolean);
    }

    // Compatibilidad con booleanos directos de estadoMision (blindaje, redundancia)
    if (d.blindaje && !extrasElegidos.some(e => e.id === 'blindaje')) {
      const p = resolverPieza(data.extras, 'blindaje');
      if (p) extrasElegidos.push(p);
    }
    if (d.redundancia && !extrasElegidos.some(e => e.id === 'redundancia')) {
      const p = resolverPieza(data.extras, 'redundancia');
      if (p) extrasElegidos.push(p);
    }

    // Instrumentos (máximo 4 seleccionables)
    let instrumentosElegidos = [];
    if (Array.isArray(d.instrumentos)) {
      instrumentosElegidos = d.instrumentos
        .map(ref => resolverPieza(data.instrumentos, ref))
        .filter(Boolean);
    } else if (d.instrumentos && typeof d.instrumentos === 'object') {
      instrumentosElegidos = Object.entries(d.instrumentos)
        .filter(([_, activo]) => Boolean(activo))
        .map(([key]) => resolverPieza(data.instrumentos, key))
        .filter(Boolean);
    }

    // Lista consolidada de todas las piezas elegidas instaladas en la nave
    const piezasElegidas = [
      panel,
      bateria,
      antena,
      relay,
      ...extrasElegidos,
      ...instrumentosElegidos
    ].filter(Boolean);

    // Helpers de extracción de propiedades con soporte para distintas nomenclaturas
    const getMasa = (p) => Number(p?.masa || 0);
    const getCosto = (p) => Number(p?.costo || 0);
    const getMeses = (p) => Number(p?.meses || 0);
    const getW = (p) => Number(p?.consumoW ?? p?.potenciaW ?? p?.w ?? 0);
    const getWh = (p) => Number(p?.capacidadWh ?? p?.wh ?? 0);
    const getUD = (p) => Number(p?.datosUD ?? p?.ud ?? 0);
    const getCob = (p) => Number(p?.cobertura ?? p?.cob ?? 0);
    const getCiencia = (p) => Number(p?.ciencia || 0);

    // --- FÓRMULAS EXACTAS DE ESPECIFICACIÓN ---

    // masaTotal = 150 + suma(masas de piezas elegidas)
    const masaTotal = base.masa + piezasElegidas.reduce((acc, p) => acc + getMasa(p), 0);

    // costoTotal = 40 + costoCohete + suma(costos de piezas)
    const costoCohete = cohete ? getCosto(cohete) : 0;
    const costoTotal = base.costo + costoCohete + piezasElegidas.reduce((acc, p) => acc + getCosto(p), 0);

    // meses = 10 + mesesCohete + suma(meses de piezas)
    const mesesCohete = cohete ? getMeses(cohete) : 0;
    const meses = base.meses + mesesCohete + piezasElegidas.reduce((acc, p) => acc + getMeses(p), 0);

    // capacidadCohete
    const capacidadCohete = cohete ? Number(cohete.capacidad || 0) : 0;

    // valido = masaTotal <= capacidadCohete && costoTotal <= presupuestoMax && meses <= 28
    const valido = (masaTotal <= capacidadCohete) &&
                   (costoTotal <= limitePresupuesto) &&
                   (meses <= ventana);

    // genMarte = W_paneles * 0.45 * (tormentaPolvo ? 0.5 : 1)
    const W_paneles = panel ? getW(panel) : 0;
    const genMarte = W_paneles * 0.45 * (tormentaPolvo ? 0.5 : 1);

    // consumo = 60 + W_antena + suma(W_instrumentos)
    const W_antena = antena ? getW(antena) : 0;
    const W_instrumentos = instrumentosElegidos.reduce((acc, inst) => acc + getW(inst), 0);
    const consumo = base.consumoW + W_antena + W_instrumentos;

    // factorEnergia = Math.min(1, (genMarte + 0.08 * Wh_bateria) / consumo)
    const Wh_bateria = bateria ? getWh(bateria) : 0;
    const factorEnergia = consumo === 0 ? 1 : Math.min(1, (genMarte + 0.08 * Wh_bateria) / consumo);

    // datosGenerados = suma(UD_instrumentos)
    const datosGenerados = instrumentosElegidos.reduce((acc, inst) => acc + getUD(inst), 0);

    // capacidadTx = UD_antena * coberturaRelay
    const UD_antena = antena ? getUD(antena) : 0;
    const coberturaRelay = relay ? getCob(relay) : 0;
    const capacidadTx = UD_antena * coberturaRelay;

    // datosEntregados = datosGenerados === 0 ? 0 : Math.min(1, capacidadTx / datosGenerados)
    const datosEntregados = datosGenerados === 0 ? 0 : Math.min(1, capacidadTx / datosGenerados);

    // ciencia = suma(ciencia_instrumentos) * factorEnergia * datosEntregados
    const sumaCiencia = instrumentosElegidos.reduce((acc, inst) => acc + getCiencia(inst), 0);
    const ciencia = sumaCiencia * factorEnergia * datosEntregados;

    return {
      masaTotal,
      costoTotal,
      meses,
      valido,
      capacidadCohete,
      genMarte: Math.round(genMarte * 100) / 100,
      consumo: Math.round(consumo * 100) / 100,
      factorEnergia: Math.round(factorEnergia * 1000) / 1000,
      datosGenerados,
      capacidadTx: Math.round(capacidadTx * 100) / 100,
      datosEntregados: Math.round(datosEntregados * 1000) / 1000,
      ciencia: Math.round(ciencia * 100) / 100
    };
  }

  /**
   * Calcula la puntuación final de la misión sobre un total de 1000 puntos.
   * 
   * @param {Object} estadoMision - Estado global de la misión
   * @returns {Object} Desglose completo de puntuación, rango y datos para radar
   */
  function calcularPuntuacionFinal(estadoMision) {


    const estado = estadoMision || window.estadoMision || {};
    const diseno = (estado.diseno) ? estado.diseno : estado;
    const evaluacion = estado.evaluacionActual || evaluarDiseno(diseno, estado.presupuestoMax || 500);
    const objetivo = estado.objetivo || 'agua';
    const presupuestoMax = estado.presupuestoMax || 500;

    // ------------------------------------------------------------------------
    // 1. Éxito de misión (máx 400 pts)
    // Llegada (100) + datos entregados proporcional (150) + éxito en Decisión 3 (150)
    // ------------------------------------------------------------------------
    const ptsLlegada = (estado.llegadaExitosa === false) ? 0 : 100;
    const ratioDatos = evaluacion.datosGenerados === 0 ? 1 : Math.min(1, evaluacion.datosEntregados);
    const ptsDatos = Math.round(ratioDatos * 150);
    
    let ptsDecision3 = 150;
    if (estado.decision3Fallo === true) {
      ptsDecision3 = 30; // Fallo por deslizamiento en cornisa
    } else if (estado.decision3 === 'retirada_segura') {
      ptsDecision3 = 140; // Prudencia y supervivencia garantizada
    } else if (estado.decision3 === 'relay_equipo') {
      ptsDecision3 = 150; // Sinergia orbital exitosa
    } else if (estado.decision3 === 'extraccion_limite') {
      ptsDecision3 = 150; // Éxito extraordinario
    }
    const ptsExitoMision = ptsLlegada + ptsDatos + ptsDecision3;

    // ------------------------------------------------------------------------
    // 2. Valor científico (máx 300 pts)
    // Ciencia final / ciencia máxima posible según objetivo
    // ------------------------------------------------------------------------
    const metasPorObjetivo = {
      agua: 120,      // Enfoque en taladro, radar y espectrómetro
      mapeo: 95,      // Enfoque en cámara alta, radar y cámara panorámica
      economica: 65   // Enfoque en bajo costo con sensores esenciales
    };
    const cienciaMeta = metasPorObjetivo[objetivo] || 120;

    // Bonos por alineación estratégica de instrumentos
    let bonoAlineacion = 0;
    const insts = Array.isArray(diseno.instrumentos) ? diseno.instrumentos : [];
    if (objetivo === 'agua' && insts.includes('taladro')) bonoAlineacion += 10;
    if (objetivo === 'mapeo' && insts.includes('camaraAlta')) bonoAlineacion += 10;
    if (objetivo === 'economica' && evaluacion.costoTotal <= 300) bonoAlineacion += 10;

    const cienciaFinal = evaluacion.ciencia + bonoAlineacion;
    const ratioCiencia = Math.min(1.0, Math.max(0, cienciaFinal / cienciaMeta));
    const ptsValorCientifico = Math.round(ratioCiencia * 300);

    // ------------------------------------------------------------------------
    // 3. Eficiencia de recursos (máx 150 pts)
    // Presupuesto sobrante (50) + uso eficiente de masa (50) + margen de energía (50)
    // ------------------------------------------------------------------------
    // Presupuesto (50 pts)
    let ptsPresupuesto = 0;
    if (evaluacion.costoTotal <= presupuestoMax) {
      const ahorro = Math.max(0, (presupuestoMax - evaluacion.costoTotal) / presupuestoMax);
      ptsPresupuesto = 25 + Math.round(25 * ahorro);
    }

    // Masa vs Capacidad cohete (50 pts)
    let ptsMasa = 0;
    const capCohete = evaluacion.capacidadCohete || 400;
    const ratioMasa = evaluacion.masaTotal / capCohete;
    if (evaluacion.masaTotal <= capCohete) {
      if (ratioMasa >= 0.50 && ratioMasa <= 0.95) {
        ptsMasa = 50; // Óptimo aprovechamiento sin riesgo de sobrecarga
      } else if (ratioMasa < 0.50) {
        ptsMasa = 35; // Subutilizado (cohete excesivo para la carga)
      } else {
        ptsMasa = 40; // Próximo al 100% pero válido
      }
    }

    // Margen de energía (50 pts)
    let ptsEnergia = 0;
    if (evaluacion.factorEnergia >= 1.0) {
      ptsEnergia = 50;
    } else if (evaluacion.factorEnergia >= 0.85) {
      ptsEnergia = 40;
    } else if (evaluacion.factorEnergia >= 0.50) {
      ptsEnergia = 20;
    } else {
      ptsEnergia = 0;
    }

    const ptsEficienciaRecursos = ptsPresupuesto + ptsMasa + ptsEnergia;

    // ------------------------------------------------------------------------
    // 4. Calidad de decisiones (máx 150 pts)
    // Manejo del riesgo (75) + Coherencia con el objetivo (75)
    // ------------------------------------------------------------------------
    // Manejo de riesgo (75 pts)
    const coheteId = diseno.cohete || 'medio';
    const ptsCohete = coheteId === 'pesado' ? 25 : (coheteId === 'medio' ? 24 : 20);
    const tieneBlindaje = Boolean(diseno.blindaje) || (Array.isArray(diseno.extras) && diseno.extras.includes('blindaje'));
    const tieneRedundancia = Boolean(diseno.redundancia) || (Array.isArray(diseno.extras) && diseno.extras.includes('redundancia'));
    const ptsBlindaje = tieneBlindaje ? 20 : 0;
    const ptsRedundancia = tieneRedundancia ? 15 : 0;
    const ptsSinIncidentes = (estado.eventosOcurridos?.length || 0) <= 1 ? 15 : 5;
    const ptsManejoRiesgo = Math.min(75, ptsCohete + ptsBlindaje + ptsRedundancia + ptsSinIncidentes);

    // Coherencia con el objetivo (75 pts)
    let ptsCoherencia = 0;
    if (objetivo === 'agua') {
      if (insts.includes('taladro')) ptsCoherencia += 35;
      if (insts.includes('espectrometro')) ptsCoherencia += 25;
      if (insts.includes('radar')) ptsCoherencia += 15;
    } else if (objetivo === 'mapeo') {
      if (insts.includes('camaraAlta')) ptsCoherencia += 35;
      if (insts.includes('radar')) ptsCoherencia += 25;
      if (insts.includes('camaraPan')) ptsCoherencia += 15;
    } else if (objetivo === 'economica') {
      if (evaluacion.costoTotal <= 250) ptsCoherencia = 75;
      else if (evaluacion.costoTotal <= 320) ptsCoherencia = 55;
      else ptsCoherencia = 35;
    }
    ptsCoherencia = Math.min(75, ptsCoherencia);
    const ptsCalidadDecisiones = ptsManejoRiesgo + ptsCoherencia;

    // ------------------------------------------------------------------------
    // PUNTUACIÓN TOTAL Y RANGO
    // ------------------------------------------------------------------------
    const puntuacionTotal = Math.min(1000, Math.max(0,
      ptsExitoMision + ptsValorCientifico + ptsEficienciaRecursos + ptsCalidadDecisiones
    ));

    // Rangos: >= 850 "Misión histórica", 600–849 "Éxito", 350–599 "Éxito parcial", < 350 "Misión perdida"
    let rango = 'Misión perdida';
    let rangoClase = 'perdida';
    let descripcionRango = 'La nave sufrió fallos irreversibles y no logró consolidar la presencia científica en Marte.';

    if (puntuacionTotal >= 850) {
      rango = 'Misión histórica';
      rangoClase = 'historica';
      descripcionRango = '¡Logro sin precedentes! Tu misión sienta las bases definitivas para la colonización marciana.';
    } else if (puntuacionTotal >= 600) {
      rango = 'Éxito';
      rangoClase = 'exito';
      descripcionRango = 'Misión cumplida. Se alcanzaron los objetivos principales con un alto retorno científico.';
    } else if (puntuacionTotal >= 350) {
      rango = 'Éxito parcial';
      rangoClase = 'parcial';
      descripcionRango = 'La sonda sobrevivió y envió datos útiles, aunque con degradación de subsistemas y presupuesto ajustado.';
    }

    return {
      puntuacionTotal,
      rango,
      rangoClase,
      descripcionRango,
      evaluacion,
      categorias: {
        exitoMision: {
          nombre: 'Éxito de la Misión',
          puntos: ptsExitoMision,
          maximo: 400,
          desglose: `Llegada: ${ptsLlegada}/100 • Datos entregados: ${ptsDatos}/150 • Descenso EDL: ${ptsDecision3}/150`
        },
        valorCientifico: {
          nombre: 'Valor Científico',
          puntos: ptsValorCientifico,
          maximo: 300,
          desglose: `Ciencia: ${evaluacion.ciencia} pts (Meta ${objetivo}: ${cienciaMeta} pts) • Bono alineación: +${bonoAlineacion}`
        },
        eficienciaRecursos: {
          nombre: 'Eficiencia de Recursos',
          puntos: ptsEficienciaRecursos,
          maximo: 150,
          desglose: `Presupuesto: ${ptsPresupuesto}/50 • Carga masa: ${ptsMasa}/50 • Margen energía: ${ptsEnergia}/50`
        },
        calidadDecisiones: {
          nombre: 'Calidad de Decisiones',
          puntos: ptsCalidadDecisiones,
          maximo: 150,
          desglose: `Manejo del riesgo: ${ptsManejoRiesgo}/75 • Coherencia con objetivo '${objetivo}': ${ptsCoherencia}/75`
        }
      },
      ejesRadar: [
        { label: 'Éxito Misión', valor: ptsExitoMision, max: 400, pct: Math.round((ptsExitoMision / 400) * 100) },
        { label: 'Valor Ciencia', valor: ptsValorCientifico, max: 300, pct: Math.round((ptsValorCientifico / 300) * 100) },
        { label: 'Eficiencia', valor: ptsEficienciaRecursos, max: 150, pct: Math.round((ptsEficienciaRecursos / 150) * 100) },
        { label: 'Decisiones', valor: ptsCalidadDecisiones, max: 150, pct: Math.round((ptsCalidadDecisiones / 150) * 100) }
      ]
    };
  }

  // --- OBJETOS DE PRUEBA DE ESTRATEGIAS ---

  // Estrategia 1: Ligera (objetivo: aprox 250 kg / 176 M / 12 m)
  const estrategiaLigera = {
    nombre: 'Estrategia Ligera',
    cohete: 'ligero',
    panel: 'S',
    bateria: 'basica',
    antena: 'baja',
    relay: 'ninguno',
    extras: [],
    instrumentos: ['camaraPan', 'espectrometro', 'meteo']
  };

  // Estrategia 2: Equilibrada (objetivo: aprox 375 kg / 366 M / 19 m)
  const estrategiaEquilibrada = {
    nombre: 'Estrategia Equilibrada',
    cohete: 'medio',
    panel: 'M',
    bateria: 'basica',
    antena: 'alta',
    relay: 'baja',
    extras: ['blindaje', 'redundancia'],
    instrumentos: ['camaraPan', 'camaraAlta', 'espectrometro', 'meteo']
  };

  // Estrategia 3: Extrema (objetivo: aprox 463 kg / 443 M / 27 m)
  const estrategiaExtrema = {
    nombre: 'Estrategia Extrema',
    cohete: 'medio',
    panel: 'L',
    bateria: 'avanzada',
    antena: 'alta',
    relay: 'baja',
    extras: [],
    instrumentos: ['camaraAlta', 'espectrometro', 'radar', 'taladro']
  };

  // Exposición en el espacio de nombres global window.Engine
  window.Engine = {
    evaluarDiseno,
    calcularPuntuacionFinal,
    estrategiaLigera,
    estrategiaEquilibrada,
    estrategiaExtrema,
    pruebas: {
      estrategiaLigera,
      estrategiaEquilibrada,
      estrategiaExtrema
    }
  };

  // --- VERIFICACIÓN AUTOMÁTICA EN CONSOLA ---
  try {
    const resLigera = evaluarDiseno(estrategiaLigera);
    const resEquilibrada = evaluarDiseno(estrategiaEquilibrada);
    const resExtrema = evaluarDiseno(estrategiaExtrema);

    console.log(
      '%c🚀 [MISIÓN ARES-I] Motor de Simulación Inicializado - Verificación de Diseños de Referencia:',
      'background: #0f172a; color: #38bdf8; font-size: 13px; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
    );

    console.table({
      'Estrategia Ligera (~250kg / 176M / 12m)': {
        'Masa (kg)': `${resLigera.masaTotal} / 400`,
        'Costo (M)': `${resLigera.costoTotal} / 500`,
        'Meses (m)': `${resLigera.meses} / 28`,
        Válido: resLigera.valido ? '✅ SÍ' : '❌ NO',
        'Gen Marte (W)': resLigera.genMarte,
        'Consumo (W)': resLigera.consumo,
        'Factor Energía': resLigera.factorEnergia,
        'Datos Gen (UD)': resLigera.datosGenerados,
        'Cap Tx (UD)': resLigera.capacidadTx,
        'Tx Ratio': resLigera.datosEntregados,
        'Ciencia Total': resLigera.ciencia
      },
      'Estrategia Equilibrada (~375kg / 366M / 19m)': {
        'Masa (kg)': `${resEquilibrada.masaTotal} / 700`,
        'Costo (M)': `${resEquilibrada.costoTotal} / 500`,
        'Meses (m)': `${resEquilibrada.meses} / 28`,
        Válido: resEquilibrada.valido ? '✅ SÍ' : '❌ NO',
        'Gen Marte (W)': resEquilibrada.genMarte,
        'Consumo (W)': resEquilibrada.consumo,
        'Factor Energía': resEquilibrada.factorEnergia,
        'Datos Gen (UD)': resEquilibrada.datosGenerados,
        'Cap Tx (UD)': resEquilibrada.capacidadTx,
        'Tx Ratio': resEquilibrada.datosEntregados,
        'Ciencia Total': resEquilibrada.ciencia
      },
      'Estrategia Extrema (~463kg / 443M / 27m)': {
        'Masa (kg)': `${resExtrema.masaTotal} / 700`,
        'Costo (M)': `${resExtrema.costoTotal} / 500`,
        'Meses (m)': `${resExtrema.meses} / 28`,
        Válido: resExtrema.valido ? '✅ SÍ' : '❌ NO',
        'Gen Marte (W)': resExtrema.genMarte,
        'Consumo (W)': resExtrema.consumo,
        'Factor Energía': resExtrema.factorEnergia,
        'Datos Gen (UD)': resExtrema.datosGenerados,
        'Cap Tx (UD)': resExtrema.capacidadTx,
        'Tx Ratio': resExtrema.datosEntregados,
        'Ciencia Total': resExtrema.ciencia
      }
    });
  } catch (err) {
    console.error('Error al inicializar o verificar el motor de Ares-I:', err);
  }
})(typeof window !== 'undefined' ? window : this);

