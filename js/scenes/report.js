/**
 * Misión Ares-I: Diseña, Lanza y Sobrevive
 * js/scenes/report.js - Pantalla de Reporte Final de Misión (versión blindada)
 *
 * Expone window.ReportScene = { iniciar, render } y el alias window.ReporteScene.
 * Todo el código de iniciar() va dentro de try/catch y cada dato del estado
 * tiene un valor seguro por defecto: la pantalla JAMÁS se queda vacía.
 */
(function (window) {
  'use strict';

  /* ───────────────────────── Datos fijos ───────────────────────── */

  const ETIQUETAS_NASA = [
    { termino: 'Delta-v (Δv)', explicacion: 'Presupuesto de velocidad (m/s) necesario para maniobras orbitales, correcciones de trayectoria e inserción en Marte.' },
    { termino: 'EDL (Entrada, Descenso y Aterrizaje)', explicacion: 'Fase crítica, los "7 minutos de terror", que frena la nave desde velocidad hiperbólica hasta posarse con suavidad.' },
    { termino: 'Enlace Directo (DTE)', explicacion: 'Canal de radio directo entre la antena de la nave y las estaciones de la Red de Espacio Profundo (DSN).' },
    { termino: 'Relay en Órbita', explicacion: 'Satélite en órbita marciana que retransmite datos cuando no hay línea de visión directa con la Tierra.' },
    { termino: 'Margen de Diseño', explicacion: 'Reserva de seguridad en masa, energía y presupuesto para tolerar imprevistos sin comprometer la misión.' },
    { termino: 'Evento de Partículas Solares (SPE)', explicacion: 'Emisión masiva de radiación del Sol que puede dañar la memoria y la electrónica no protegida por blindaje.' },
    { termino: 'Sol Marciano', explicacion: 'Día solar en Marte: dura 24 h 39 min 35 s terrestres y marca los ciclos de carga solar.' },
    { termino: 'Opacidad de Polvo (τ)', explicacion: 'Mide cuánta luz solar bloquea el polvo atmosférico durante una tormenta en la superficie de Marte.' }
  ];

  const CATEGORIAS = [
    { clave: 'exitoMision', nombre: 'Éxito de Misión', max: 400, radar: 'ÉXITO MISIÓN' },
    { clave: 'valorCientifico', nombre: 'Valor Científico', max: 300, radar: 'CIENCIA' },
    { clave: 'eficienciaRecursos', nombre: 'Eficiencia de Recursos', max: 150, radar: 'EFICIENCIA' },
    { clave: 'calidadDecisiones', nombre: 'Calidad de Decisiones', max: 150, radar: 'DECISIONES' }
  ];

  const RANGOS = {
    historica: { rango: 'Misión Histórica', desc: 'Diseño brillante y ejecución impecable: tu misión entra en los libros de la exploración espacial.' },
    exito: { rango: 'Éxito', desc: 'Misión completada con éxito operativo y notable retorno científico.' },
    parcial: { rango: 'Éxito Parcial', desc: 'La misión avanzó, pero varias decisiones limitaron el resultado científico.' },
    perdida: { rango: 'Misión Perdida', desc: 'La misión no cumplió sus objetivos. Revisa la cadena de causa y efecto y vuelve a intentarlo.' }
  };

  /* ───────────────────────── Utilidades ───────────────────────── */

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function num(v, def) {
    const n = Number(v);
    return Number.isFinite(n) ? n : (def === undefined ? 0 : def);
  }

  /** Máximo 1 decimal; si es entero no muestra ".0" */
  function fmt(v) {
    const n = Math.round(num(v) * 10) / 10;
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  /** Redondea a 1 decimal cualquier número largo dentro de un texto (12.3456 → 12.3) */
  function limpiarNumeros(texto) {
    return String(texto == null ? '' : texto).replace(/\d+\.\d{2,}/g, (m) => fmt(parseFloat(m)));
  }

  function limpiar(texto) {
    return esc(limpiarNumeros(texto));
  }

  function claseRango(puntos) {
    if (puntos >= 850) return 'historica';
    if (puntos >= 600) return 'exito';
    if (puntos >= 350) return 'parcial';
    return 'perdida';
  }

  function nombreDecision(v, tipo) {
    if (v == null) return null;
    let t = v;
    if (typeof t === 'object') t = t.id || t.clave || t.nombre || t.opcion || '';
    t = String(t).toLowerCase();
    if (!t) return null;
    if (tipo === 2) {
      if (t.includes('segur')) return 'Modo seguro';
      if (t.includes('intelig')) return 'Maniobra inteligente';
      if (t.includes('max') || t.includes('máx') || t.includes('seguir')) return 'Seguir al máximo';
    } else {
      if (t.includes('retir')) return 'Retirada segura';
      if (t.includes('relay') || t.includes('equipo') || t.includes('puente')) return 'Trabajo en equipo con el relay';
      if (t.includes('extra') || t.includes('limite') || t.includes('límite') || t.includes('riesg')) return 'Extracción arriesgada al límite';
    }
    return String(v);
  }

  /* ───────────────────────── Cálculo seguro de la puntuación ───────────────────────── */

  function calcularReporteFallback(estado) {
    estado = estado || {};
    const tramos = Math.max(0, Math.round(num(estado.tramosSaltados, 0)));
    const muestras = Math.max(0, Math.round(num(estado.muestrasRecolectadas, 0)));
    const edl = num(estado.edlPuntos, estado.edlEstado === 'suave' ? 150 : (estado.edlEstado === 'brusco' ? 60 : 0));
    const lanz = num(estado.lanzamientoBonus, tramos === 0 ? 70 : 0);
    const trans = Math.round((muestras / 3) * 150);

    const ptsExito = Math.max(0, Math.min(400, lanz + edl + trans));
    const ptsCiencia = muestras > 0 ? Math.min(300, Math.round(muestras * 80 + 30)) : (estado.decision2 ? 30 : 0);
    const bat = Math.max(0, Math.min(100, num(estado.bateriaActual, 100)));
    const dano = Math.max(0, Math.min(100, num(estado.danoPaneles, 0)));
    const ptsRecursos = tramos > 0 ? 0 : Math.min(150, Math.round(bat / 2) + Math.round((100 - dano) / 2) + 25);
    const ptsDecisiones = Math.max(0, Math.min(150, 140 - tramos * 60));

    const total = Math.min(1000, Math.max(0, ptsExito + ptsCiencia + ptsRecursos + ptsDecisiones));

    return {
      puntuacionTotal: total,
      rangoClase: claseRango(total),
      rango: RANGOS[claseRango(total)].rango,
      descripcionRango: RANGOS[claseRango(total)].desc,
      categorias: {
        exitoMision: {
          puntos: ptsExito,
          desglose: `Lanzamiento: ${lanz}/100 • EDL: ${edl}/150 • Transmisión: ${trans}/150 (${muestras}/3 muestras)`
        },
        valorCientifico: {
          puntos: ptsCiencia,
          desglose: muestras === 0 ? 'Sin muestras minerales del cráter' : `${muestras}/3 muestras recolectadas y analizadas`
        },
        eficienciaRecursos: {
          puntos: ptsRecursos,
          desglose: `Batería: ${Math.round(bat / 2)}/50 • Paneles: ${Math.round((100 - dano) / 2)}/50 • Presupuesto: 25/50`
        },
        calidadDecisiones: {
          puntos: ptsDecisiones,
          desglose: `Decisiones estratégicas en vuelo y superficie: ${ptsDecisiones}/150`
        }
      },
      ejesRadar: [
        { label: 'Éxito Misión', valor: ptsExito, max: 400, pct: Math.round((ptsExito / 400) * 100) },
        { label: 'Valor Ciencia', valor: ptsCiencia, max: 300, pct: Math.round((ptsCiencia / 300) * 100) },
        { label: 'Eficiencia', valor: ptsRecursos, max: 150, pct: Math.round((ptsRecursos / 150) * 100) },
        { label: 'Decisiones', valor: ptsDecisiones, max: 150, pct: Math.round((ptsDecisiones / 150) * 100) }
      ],
      regresoLanzamientoBonus: num(estado.regresoLanzamientoBonus, 0),
      amerizajePuntos: num(estado.amerizajePuntos, 0),
      tramosSaltados: tramos
    };
  }

  function obtenerReporteCrudo(estado) {
    try {
      if (window.Engine && typeof window.Engine.calcularPuntuacionFinal === 'function') {
        const res = window.Engine.calcularPuntuacionFinal(estado);
        if (res && (Number.isFinite(Number(res.puntuacionTotal)) || res.categorias)) {
          return res;
        }
      }
    } catch (err) {
      console.error('Error al calcular la puntuación final:', err);
    }
    return calcularReporteFallback(estado);
  }

  function normalizarReporte(raw, estado) {
    raw = (raw && (raw.categorias || Number.isFinite(Number(raw.puntuacionTotal))))
      ? raw
      : calcularReporteFallback(estado);
    const cats = raw.categorias || {};

    const categorias = {};
    let suma = 0;
    CATEGORIAS.forEach((def) => {
      const c = cats[def.clave] || {};
      const puntos = Math.max(0, Math.round(num(c.puntos)));
      categorias[def.clave] = {
        puntos,
        desglose: limpiar(c.desglose || 'Sin detalle disponible.')
      };
      suma += puntos;
    });

    const total = Number.isFinite(Number(raw.puntuacionTotal)) && Number(raw.puntuacionTotal) > 0
      ? Math.round(Number(raw.puntuacionTotal))
      : suma;

    const clave = RANGOS[raw.rangoClase] ? raw.rangoClase : claseRango(total);
    const rango = raw.rango ? String(raw.rango) : RANGOS[clave].rango;
    const descripcion = raw.descripcionRango ? String(raw.descripcionRango) : RANGOS[clave].desc;

    // Ejes del radar: se toman del motor si vienen completos; si no, se calculan
    const ejes = CATEGORIAS.map((def, i) => {
      const e = (Array.isArray(raw.ejesRadar) && raw.ejesRadar[i]) ? raw.ejesRadar[i] : {};
      const valor = Math.round(num(e.valor, categorias[def.clave].puntos));
      const max = num(e.max, def.max) || def.max;
      const pct = e.pct != null ? num(e.pct) : (valor / max) * 100;
      return { etiqueta: def.radar, valor, max, pct: Math.max(0, Math.min(100, pct)) };
    });

    const despeguePts = Math.max(0, num(raw.regresoLanzamientoBonus != null ? raw.regresoLanzamientoBonus : estado.regresoLanzamientoBonus));
    const amerizajePts = Math.max(0, num(raw.amerizajePuntos != null ? raw.amerizajePuntos : estado.amerizajePuntos));

    return {
      total,
      clave,
      rango,
      descripcion,
      categorias,
      ejes,
      despeguePts,
      amerizajePts,
      totalRegreso: despeguePts + amerizajePts,
      tramosSaltados: Math.max(0, Math.round(num(raw.tramosSaltados != null ? raw.tramosSaltados : estado.tramosSaltados)))
    };
  }

  /* ───────────────────────── Gráfico radar (SVG puro) ───────────────────────── */

  function generarRadarSVG(ejes) {
    const cx = 150;
    const cy = 140;
    const R = 95;

    const puntos = ejes.map((eje, i) => {
      const rad = R * Math.max(0.08, Math.min(1, eje.pct / 100));
      if (i === 0) return { x: cx, y: cy - rad };
      if (i === 1) return { x: cx + rad, y: cy };
      if (i === 2) return { x: cx, y: cy + rad };
      return { x: cx - rad, y: cy };
    });
    const poligono = puntos.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(' ');

    const nombre = (x, y, ancla, texto) =>
      `<text x="${x}" y="${y}" text-anchor="${ancla}" fill="#F8FAFC" font-family="'Press Start 2P', monospace" font-size="9">${esc(texto)}</text>`;
    const valor = (x, y, ancla, v, m) =>
      `<text x="${x}" y="${y}" text-anchor="${ancla}" fill="#fde047" font-family="'VT323', monospace" font-size="20">${v}/${m}</text>`;

    return `
      <svg class="radar-svg" viewBox="-60 -30 420 340" style="width:100%; max-width:560px;"
           xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gráfico radar de rendimiento de la misión">
        <circle cx="${cx}" cy="${cy}" r="${R * 0.25}" fill="none" stroke="rgba(255,255,255,0.25)" stroke-dasharray="3,3" />
        <circle cx="${cx}" cy="${cy}" r="${R * 0.5}"  fill="none" stroke="rgba(255,255,255,0.3)"  stroke-dasharray="3,3" />
        <circle cx="${cx}" cy="${cy}" r="${R * 0.75}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-dasharray="3,3" />
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="rgba(255,255,255,0.05)" stroke="#fde047" stroke-width="2" />
        <line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="rgba(255,255,255,0.35)" stroke-width="1" />
        <line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="rgba(255,255,255,0.35)" stroke-width="1" />

        <polygon points="${poligono}" fill="rgba(252,61,33,0.45)" stroke="#FC3D21" stroke-width="3" />
        ${puntos.map((p) => `<circle cx="${Math.round(p.x)}" cy="${Math.round(p.y)}" r="5" fill="#fde047" stroke="#090D16" stroke-width="2" />`).join('')}

        ${nombre(cx, cy - R - 28, 'middle', ejes[0].etiqueta)}
        ${valor(cx, cy - R - 10, 'middle', ejes[0].valor, ejes[0].max)}

        ${nombre(cx + R + 14, cy - 2, 'start', ejes[1].etiqueta)}
        ${valor(cx + R + 14, cy + 18, 'start', ejes[1].valor, ejes[1].max)}

        ${nombre(cx, cy + R + 24, 'middle', ejes[2].etiqueta)}
        ${valor(cx, cy + R + 44, 'middle', ejes[2].valor, ejes[2].max)}

        ${nombre(cx - R - 14, cy - 2, 'end', ejes[3].etiqueta)}
        ${valor(cx - R - 14, cy + 18, 'end', ejes[3].valor, ejes[3].max)}
      </svg>
    `;
  }

  /* ───────────────────────── Cadena de causa y efecto ─────────────────────────
     Diseño → Lanzamiento → Tránsito/Tormenta → Descenso/Jezero → Regreso
     Las etapas de descenso, cráter y regreso se generan desde el estado real,
     así nunca se contradicen (0 muestras, impacto duro vs. tramo abandonado). */

  function item(etapa, eleccion, consecuencia, explicacion) {
    return {
      etapa: limpiar(etapa),
      eleccion: limpiar(eleccion),
      consecuencia: limpiar(consecuencia),
      explicacion: limpiar(explicacion)
    };
  }

  function coincide(h, patrones, excluir) {
    const t = String((h && h.etapa) || '').toLowerCase();
    return patrones.some((p) => t.includes(p)) && !(excluir || []).some((x) => t.includes(x));
  }

  function evaluacionDe(estado) {
    if (estado.evaluacionActual) return estado.evaluacionActual;
    if (estado.evaluacion) return estado.evaluacion;
    try {
      if (window.Engine && typeof window.Engine.evaluarDiseno === 'function' && estado.diseno) {
        return window.Engine.evaluarDiseno(estado.diseno, estado.presupuestoMax) || null;
      }
    } catch (err) { /* sin evaluación */ }
    return null;
  }

  function construirCadena(estado) {
    const historial = Array.isArray(estado.historialCausaEfecto) ? estado.historialCausaEfecto : [];
    const d = estado.diseno || {};
    const cadena = [];

    /* 1. Diseño */
    const hDiseno = historial.find((h) => coincide(h, ['diseño', 'diseno', 'ensambl']));
    if (hDiseno) {
      cadena.push(item(hDiseno.etapa, hDiseno.eleccion, hDiseno.consecuencia, hDiseno.explicacion));
    } else {
      const ev = evaluacionDe(estado);
      const extras = [d.blindaje ? 'blindaje' : null, d.redundancia ? 'redundancia' : null].filter(Boolean).join(' y ');
      cadena.push(item(
        '1. Diseño y Ensamblaje',
        `Cohete ${d.cohete || 'medio'}, paneles ${d.panel || 'M'}, batería ${d.bateria || 'básica'}, antena ${d.antena || 'baja'}, relay ${d.relay || 'ninguno'}${extras ? ' y ' + extras : ''}`,
        ev && ev.masaTotal != null
          ? `Masa ${fmt(ev.masaTotal)} kg · Costo ${fmt(ev.costoTotal)} M$`
          : 'Diseño aprobado para el lanzamiento',
        'Las piezas elegidas fijaron el margen de masa, la energía disponible y el presupuesto restante.'
      ));
    }

    /* 2. Lanzamiento */
    const bonoAscenso = Math.max(0, num(estado.lanzamientoBonus));
    cadena.push(item(
      '2. Lanzamiento desde la Tierra',
      `Control del empuje durante el ascenso: bono de ${fmt(bonoAscenso)}/100 pts`,
      bonoAscenso >= 80 ? 'Ascenso estable dentro de la zona de empuje segura'
        : bonoAscenso >= 40 ? 'Ascenso irregular con parte del tiempo fuera de la zona segura'
          : 'Ascenso inestable: poco tiempo dentro de la zona segura',
      'Mantener el empuje entre el 60% y el 85% asegura un ascenso eficiente y protege la carga útil.'
    ));

    /* 3. Tránsito / Tormenta solar */
    const hTransito = historial.filter((h) =>
      coincide(h, ['tormenta', 'tránsito', 'transito', 'viaje', 'solar'], ['regreso', 'retorno', 'tierra']));
    if (hTransito.length) {
      hTransito.slice(0, 2).forEach((h) => cadena.push(item(h.etapa, h.eleccion, h.consecuencia, h.explicacion)));
    } else {
      const dec2 = nombreDecision(estado.decision2, 2);
      const protegido = Boolean(d.blindaje);
      cadena.push(item(
        '3. Tránsito Interplanetario y Tormenta Solar',
        dec2 ? `Decisión 2: ${dec2}` : (protegido ? 'Blindaje antirradiación operativo' : 'Sin blindaje especializado durante la fulguración'),
        `Batería ${fmt(estado.bateriaActual)}% · Daño en paneles ${fmt(estado.danoPaneles)}%`,
        protegido
          ? 'El blindaje redujo el daño del evento de partículas solares (SPE).'
          : 'Sin blindaje, la electrónica quedó más expuesta al viento solar.'
      ));
    }

    /* 4. Descenso EDL y cráter Jezero */
    const muestras = Math.max(0, Math.round(num(estado.muestrasRecolectadas)));
    const edl = estado.edlEstado || '';
    let textoEdl;
    if (edl === 'suave') textoEdl = 'Aterrizaje nominal (posado suave a ≤ 2.5 m/s)';
    else if (edl === 'brusco') textoEdl = 'Aterrizaje brusco con daños menores (entre 2.5 y 6 m/s)';
    else if (edl === 'chocado') textoEdl = 'Impacto duro contra la superficie (> 6 m/s)';
    else if (edl === 'abandonado') textoEdl = 'Tramo de descenso abandonado por el operador';
    else textoEdl = num(estado.edlPuntos) > 0
      ? `Descenso completado con ${fmt(estado.edlPuntos)}/150 pts de precisión`
      : 'Descenso completado';

    const textoMuestras = muestras === 0
      ? 'No se recolectaron muestras en el cráter'
      : `${muestras} ${muestras === 1 ? 'muestra recolectada' : 'muestras recolectadas'} (meta: 3)`;

    const dec3 = nombreDecision(estado.decision3, 3);
    let eleccion4 = d.relay && d.relay !== 'ninguno'
      ? 'Descenso con apoyo del satélite relay en órbita marciana'
      : 'Descenso sin relay: comunicación limitada durante la ocultación de la Tierra';
    if (dec3) eleccion4 += ` · Decisión 3: ${dec3}${estado.decision3Fallo ? ' (la maniobra falló)' : ''}`;

    let explicacion4;
    if (edl === 'chocado') {
      explicacion4 = 'El impacto duro dañó el módulo de descenso y limitó lo que se pudo hacer en la superficie.';
    } else if (muestras === 0) {
      explicacion4 = 'Sin muestras, el valor científico de superficie es nulo; solo se conserva la telemetría orbital.';
    } else {
      explicacion4 = 'Las muestras recolectadas y enviadas son la base del valor científico de la misión.';
    }
    cadena.push(item('4. Descenso EDL y Exploración de Jezero', eleccion4, `${textoEdl} · ${textoMuestras}`, explicacion4));

    /* 5. Regreso a la Tierra */
    const despegue = Math.max(0, num(estado.regresoLanzamientoBonus));
    const amerizaje = Math.max(0, num(estado.amerizajePuntos));
    let textoAmerizaje;
    if (amerizaje >= 150) textoAmerizaje = 'Amerizaje suave (≤ 2.5 m/s)';
    else if (amerizaje >= 60) textoAmerizaje = 'Amerizaje brusco (≤ 6 m/s)';
    else textoAmerizaje = 'Amerizaje violento (> 6 m/s) o sin registro';
    cadena.push(item(
      '5. Regreso a la Tierra',
      `Despegue de Marte: ${fmt(despegue)}/100 pts · Amerizaje: ${fmt(amerizaje)}/150 pts`,
      textoAmerizaje,
      'Frenar a tiempo con los retropropulsores decide cuántos puntos de regreso se conservan.'
    ));

    return cadena;
  }

  /* ───────────────────────── Render ───────────────────────── */

  function botonesHTML() {
    return `
      <footer class="reporte-acciones">
        <button type="button" class="btn-accion btn-redisenar" id="btn-reporte-redisenar">🔄 REDISEÑAR MISIÓN</button>
        <button type="button" class="btn-accion btn-reiniciar" id="btn-reporte-reiniciar">🆕 NUEVA PARTIDA</button>
        <button type="button" class="btn-share" id="btn-share-design">🤝 Compartir diseño</button>
      </footer>
    `;
  }

  function render(contenedor) {
    if (!contenedor) return;
    const estado = window.estadoMision || {};
    const rep = normalizarReporte(obtenerReporteCrudo(estado), estado);
    const cadena = construirCadena(estado);
    const perfecto = rep.totalRegreso >= 200;

    contenedor.innerHTML = `
      <div class="marco-nasa">
        <div class="reporte-container">

          <header class="reporte-hero ${rep.clave}">
            <span class="reporte-badge-rango">CLASIFICACIÓN OFICIAL DE LA MISIÓN</span>
            <h1 class="reporte-titular-rango">${esc(rep.rango)}</h1>
            <div class="reporte-score-display">
              <span class="reporte-score-numero">${rep.total}</span>
              <span class="reporte-score-max">/ 1000 PTS</span>
            </div>
            <p class="reporte-desc-rango">${esc(rep.descripcion)}</p>
          </header>

          ${rep.tramosSaltados > 0 ? `
          <div class="reporte-alerta-penalizacion">
            <span style="font-size:2rem;">⚠️</span>
            <div>
              <strong style="color:#fff; font-family:'Press Start 2P', monospace; font-size:0.7rem; display:block; margin-bottom:6px;">
                PENALIZACIÓN POR TRAMOS ABANDONADOS: -${rep.tramosSaltados * 60} PTS
              </strong>
              <span>Se abandonaron ${rep.tramosSaltados} tramo(s): sus puntos de fase quedaron en 0 y se restaron 60 pts por tramo en Calidad de Decisiones.</span>
            </div>
          </div>` : ''}

          <div class="epilogo-regreso">
            <span>🌍 Regreso a la Tierra: despegue ${fmt(rep.despeguePts)}/100 + amerizaje ${fmt(rep.amerizajePts)}/150 = ${fmt(rep.totalRegreso)}/250</span>
            ${perfecto ? '<span class="badge-perfecto">★ REGRESO PERFECTO</span>' : ''}
          </div>

          <div class="reporte-grid-analisis">
            <div class="reporte-card">
              <h2 class="card-titulo">📡 Perfil de Misión</h2>
              <div class="radar-wrapper">${generarRadarSVG(rep.ejes)}</div>
            </div>

            <div class="reporte-card">
              <h2 class="card-titulo">📊 Desglose por Categorías</h2>
              <table class="reporte-tabla">
                <thead>
                  <tr><th>Categoría</th><th>Puntos</th><th>Detalle</th></tr>
                </thead>
                <tbody>
                  ${CATEGORIAS.map((def) => `
                    <tr>
                      <td><strong>${def.nombre}</strong></td>
                      <td><span class="score-pill">${rep.categorias[def.clave].puntos} / ${def.max}</span></td>
                      <td>${rep.categorias[def.clave].desglose}</td>
                    </tr>`).join('')}
                  <tr>
                    <td><strong>TOTAL</strong></td>
                    <td><span class="score-pill">${rep.total} / 1000</span></td>
                    <td>${esc(rep.rango)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <section class="reporte-card" style="margin-bottom:20px;">
            <h2 class="card-titulo">🔗 Cadena de Causa y Efecto</h2>
            <p class="seccion-sub">Diseño → Lanzamiento → Tránsito/Tormenta → Descenso/Jezero → Regreso</p>
            <div class="timeline-causa-efecto">
              ${cadena.map((it, idx) => `
                <div class="timeline-nodo">
                  <div class="nodo-indicador">${idx + 1}</div>
                  <div class="nodo-contenido">
                    <div class="nodo-etapa">${it.etapa}</div>
                    <div class="nodo-eleccion"><strong>Elección:</strong> ${it.eleccion}</div>
                    <div class="nodo-consecuencia"><strong>Resultado:</strong> ${it.consecuencia}</div>
                    <div class="nodo-explicacion">${it.explicacion}</div>
                  </div>
                </div>`).join('')}
            </div>
          </section>

          <section class="reporte-card">
            <h2 class="card-titulo">🏷️ Glosario de Términos NASA</h2>
            <div class="etiquetas-grid">
              ${ETIQUETAS_NASA.map((e) => `
                <div class="etiqueta-card">
                  <div class="etiqueta-header">
                    <span class="etiqueta-punto"></span>
                    <span class="etiqueta-nombre">${esc(e.termino)}</span>
                  </div>
                  <div class="etiqueta-texto">${esc(e.explicacion)}</div>
                </div>`).join('')}
            </div>
          </section>

          ${botonesHTML()}
        </div>
      </div>
    `;

    conectarBotones(contenedor);
  }

  /** Informe mínimo de emergencia: si algo falla, el jugador igual ve un resultado y botones. */
  function renderFallback(contenedor, err) {
    const estado = window.estadoMision || {};
    const muestras = Math.max(0, Math.round(num(estado.muestrasRecolectadas)));
    contenedor.innerHTML = `
      <div class="marco-nasa">
        <div class="reporte-container">
          <header class="reporte-hero parcial">
            <span class="reporte-badge-rango">INFORME FINAL</span>
            <h1 class="reporte-titular-rango">Misión finalizada</h1>
            <p class="reporte-desc-rango">
              No se pudo generar el informe detallado, pero tu misión terminó.
              Muestras recolectadas: ${muestras}/3.
              Abre la consola (F12) para ver el error técnico${err && err.message ? ': ' + esc(err.message) : ''}.
            </p>
          </header>
          ${botonesHTML()}
        </div>
      </div>
    `;
    conectarBotones(contenedor);
  }

  /* ───────────────────────── Botones ───────────────────────── */

  function activarEscena(nombre) {
    document.querySelectorAll('.escena').forEach((s) => s.classList.remove('activa'));
    const el = document.getElementById('escena-' + nombre);
    if (el) el.classList.add('activa');
    window.scrollTo(0, 0);
  }

  function irAEscena(nombre) {
    if (window.UI && typeof window.UI.cambiarEscena === 'function') {
      window.UI.cambiarEscena(nombre);
      return;
    }
    activarEscena(nombre);
    const mapa = { design: 'DesignScene', briefing: 'BriefingScene' };
    const escena = window[mapa[nombre]];
    if (escena && typeof escena.iniciar === 'function') escena.iniciar();
  }

  function conectarBotones(contenedor) {
    const btnShare = contenedor.querySelector('#btn-share-design');
    if (btnShare) {
      btnShare.addEventListener('click', () => {
        try {
          const d = (window.estadoMision && window.estadoMision.diseno) || {};
          const instr = (d.instrumentos || []).join('|');
          const hash = `#d=${d.cohete},${d.panel},${d.bateria},${d.antena},${d.blindaje},${d.redundancia},${instr},${d.relay}`;
          const url = window.location.href.split('#')[0] + hash;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url)
              .then(() => alert('¡Enlace copiado!'))
              .catch(() => window.prompt('Copia este enlace:', url));
          } else {
            window.prompt('Copia este enlace:', url);
          }
        } catch (err) {
          console.error(err);
        }
      });
    }

    // Rediseñar: vuelve al taller conservando las piezas elegidas
    const btnRedisenar = contenedor.querySelector('#btn-reporte-redisenar');
    if (btnRedisenar) {
      btnRedisenar.addEventListener('click', () => {
        window.Sound?.playStepBack?.();
        if (typeof window.reiniciarEstado !== 'function') {
          console.error('No se puede rediseñar: reiniciarEstado no está disponible.');
          return;
        }
        const actual = (window.estadoMision && window.estadoMision.diseno) || {};
        const diseno = Object.assign({}, actual, {
          instrumentos: Array.isArray(actual.instrumentos) ? actual.instrumentos.slice() : []
        });
        window.reiniciarEstado({ diseno });
        irAEscena('design');
      });
    }

    // Nueva partida: reinicia todo y vuelve al briefing
    const btnReiniciar = contenedor.querySelector('#btn-reporte-reiniciar');
    if (btnReiniciar) {
      btnReiniciar.addEventListener('click', () => {
        window.Sound?.playStepNext?.();
        if (typeof window.reiniciarEstado !== 'function') {
          console.error('No se puede iniciar otra misión: reiniciarEstado no está disponible.');
          return;
        }
        window.reiniciarEstado();
        if (window.UI && typeof window.UI.limpiarBarraRecursos === 'function') {
          window.UI.limpiarBarraRecursos();
        }
        irAEscena('briefing');
      });
    }
  }

  /* ───────────────────────── Punto de entrada ───────────────────────── */

  function iniciar() {
    const contenedor = document.getElementById('escena-report');
    if (!contenedor) return;
    try {
      render(contenedor);
    } catch (err) {
      console.error('Error al generar el informe final:', err);
      try {
        renderFallback(contenedor, err);
      } catch (err2) {
        console.error(err2);
        contenedor.innerHTML = '<div class="marco-nasa"><h1>INFORME FINAL</h1><p>La misión ha terminado. Recarga la página para jugar de nuevo.</p></div>';
      }
    }
  }

  window.ReportScene = { iniciar, render };
  window.ReporteScene = window.ReportScene;

})(typeof window !== 'undefined' ? window : this);