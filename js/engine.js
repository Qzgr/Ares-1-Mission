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

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
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
    const diseno = estado.diseno || estado;
    const presupuestoMax = Math.max(0, finiteNumber(estado.presupuestoMax, 500));
    const evaluacion = estado.evaluacionActual || evaluarDiseno(diseno, presupuestoMax || 500);
    const objetivo = ['agua', 'mapeo', 'economica'].includes(estado.objetivo) ? estado.objetivo : 'agua';
    const clamp = (value, min, max) => Math.min(max, Math.max(min, finiteNumber(value, 0)));
    const muestras = Math.max(0, finiteNumber(estado.muestrasRecolectadas, 0));
    const fraccionMuestras = Math.min(1, muestras / 3);
    const instrumentos = Array.isArray(diseno.instrumentos) ? diseno.instrumentos : [];
    const extras = Array.isArray(diseno.extras) ? diseno.extras : [];
    const tieneBlindaje = Boolean(diseno.blindaje) || extras.includes('blindaje');
    const tieneRedundancia = Boolean(diseno.redundancia) || extras.includes('redundancia');
    const relayId = diseno.relay || 'ninguno';
    const tieneTaladro = instrumentos.includes('taladro');
    const costoTotal = Math.max(0, finiteNumber(evaluacion.costoTotal, 0));

    // 1. Éxito de misión: lanzamiento, EDL y transmisión de muestras (1000 pts).
    const ptsLanzamientoRaw = clamp(estado.lanzamientoBonus, 0, 100);
    const ptsEDLRaw = clamp(estado.edlPuntos, 0, 150);
    const ptsTransmision = muestras === 0 ? 0 : Math.min(150, Math.round((muestras / 3) * 150));
    const ptsExitoMision = ptsLanzamientoRaw + ptsEDLRaw + ptsTransmision;

    // 2. Ciencia: rendimiento del diseño ajustado por muestras y por el objetivo.
    const metasPorObjetivo = { agua: 120, mapeo: 95, economica: 65 };
    const cienciaMeta = metasPorObjetivo[objetivo];
    let factorObjetivo = 1;
    if (objetivo === 'agua') {
      factorObjetivo += ['espectrometro', 'radar', 'taladro']
        .filter(instrumento => instrumentos.includes(instrumento)).length * 0.1;
    } else if (objetivo === 'mapeo') {
      factorObjetivo += ['camaraPan', 'camaraAlta']
        .filter(instrumento => instrumentos.includes(instrumento)).length * 0.1;
    } else if (presupuestoMax > 0) {
      const ahorro = clamp((presupuestoMax - costoTotal) / presupuestoMax, 0, 1);
      factorObjetivo += ahorro * 0.1;
    }
    const cienciaDiseno = Math.max(0, finiteNumber(evaluacion.ciencia, 0));
    const tieneTelemetria = finiteNumber(estado.datosTransito, 0) > 0 || Boolean(estado.decision2);
    const ptsValorCientifico = muestras === 0
      ? (tieneTelemetria ? 30 : 0)
      : Math.min(300, Math.round((cienciaDiseno * fraccionMuestras / cienciaMeta) * factorObjetivo * 300));

    // 3. Recursos: batería restante, presupuesto disponible y salud de paneles.
    const bateria = clamp(estado.bateriaActual, 0, 100);
    const danoPaneles = clamp(estado.danoPaneles, 0, 100);
    const ptsBateria = Math.round(bateria / 2);
    const ptsPresupuesto = presupuestoMax > 0
      ? Math.round(clamp((presupuestoMax - costoTotal) / presupuestoMax, 0, 1) * 50)
      : 0;
    const ptsPaneles = Math.round((100 - danoPaneles) / 2);
    const ptsEficienciaRecursos = ptsBateria + ptsPresupuesto + ptsPaneles;

    // 4. Decisiones: coherencia con hardware y penalización por cada tramo abandonado.
    let ptsDecision2 = 0;
    if (estado.decision2 === 'modo_seguro') {
      ptsDecision2 = 75;
    } else if (estado.decision2 === 'maniobra_inteligente') {
      ptsDecision2 = diseno.antena === 'alta' ? 75 : 45;
    } else if (estado.decision2 === 'seguir_al_maximo') {
      ptsDecision2 = tieneBlindaje && tieneRedundancia ? 75 : (tieneBlindaje || tieneRedundancia ? 55 : 25);
    }

    let ptsDecision3 = 0;
    if (estado.decision3 === 'retirada_segura') {
      ptsDecision3 = 75;
    } else if (estado.decision3 === 'relay_equipo') {
      ptsDecision3 = relayId !== 'ninguno' ? 75 : 0;
    } else if (estado.decision3 === 'extraccion_limite') {
      ptsDecision3 = tieneTaladro ? (estado.decision3Fallo === true ? 40 : 75) : 0;
    }
    const tramosSaltados = Math.max(0, Math.floor(finiteNumber(estado.tramosSaltados, 0)));
    const ptsDecisionesAntesPenalizacion = Math.min(150, ptsDecision2 + ptsDecision3);
    const penalizacionSaltos = tramosSaltados * 50;
    const ptsCalidadDecisiones = Math.max(0, ptsDecisionesAntesPenalizacion - penalizacionSaltos);

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
          desglose: `Bono lanzamiento: ${ptsLanzamientoRaw}/100 • EDL: ${ptsEDLRaw}/150 • Transmisión por muestras: ${ptsTransmision}/150 (${muestras} muestras)`
        },
        valorCientifico: {
          nombre: 'Valor Científico',
          puntos: ptsValorCientifico,
          maximo: 300,
          desglose: muestras === 0
            ? `Telemetría básica: ${ptsValorCientifico}/30 • Sin muestras científicas`
            : `Ciencia de diseño: ${cienciaDiseno} pts × ${fraccionMuestras.toFixed(2)} por muestras × bono ${objetivo} (${factorObjetivo.toFixed(2)})`
        },
        eficienciaRecursos: {
          nombre: 'Eficiencia de Recursos',
          puntos: ptsEficienciaRecursos,
          maximo: 150,
          desglose: `Batería: ${ptsBateria}/50 (${bateria}%) • Presupuesto sobrante: ${ptsPresupuesto}/50 • Salud paneles: ${ptsPaneles}/50 (${100 - danoPaneles}%)`
        },
        calidadDecisiones: {
          nombre: 'Calidad de Decisiones',
          puntos: ptsCalidadDecisiones,
          maximo: 150,
          desglose: `Decisión 2 según hardware: ${ptsDecision2}/75 • Decisión 3 según hardware: ${ptsDecision3}/75 • Tramos abandonados: -${penalizacionSaltos} (${tramosSaltados} × 50)`
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
