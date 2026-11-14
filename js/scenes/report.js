/**
 * Misión Ares-I: Diseña, Lanza y Sobrevive
 * js/scenes/report.js - Pantalla de Reporte Final de Misión
 * 
 * Muestra puntuación final sobre 1000 pts, titular de rango,
 * gráfico radar SVG puro, tabla de categorías, cadena de causa y efecto
 * y glosario de etiquetas NASA.
 */

(function (window) {
  'use strict';

  // Glosario oficial de Etiquetas NASA con explicación concisa de 1 línea
  const ETIQUETAS_NASA = [
    {
      termino: 'Delta-v (Δv)',
      explicacion: 'Presupuesto de velocidad acumulada (m/s) requerido para maniobras orbitales, corrección de trayectoria e inserción en Marte.'
    },
    {
      termino: 'EDL (Entrada, Descenso y Aterrizaje)',
      explicacion: 'Fase crítica de "7 minutos de terror" que desacelera la nave desde velocidad hiperbólica hasta el posado suave.'
    },
    {
      termino: 'Enlace Directo (DTE)',
      explicacion: 'Canal de radio directo entre la antena de la nave y las estaciones terrestres de la Red de Espacio Profundo (DSN).'
    },
    {
      termino: 'Relay en Órbita',
      explicacion: 'Satélite intermediario en órbita marciana que retransmite telemetría y datos cuando no hay línea de visión directa a la Tierra.'
    },
    {
      termino: 'Margen de Diseño',
      explicacion: 'Reserva técnica de seguridad en masa, potencia y presupuesto para tolerar imprevistos sin comprometer la misión.'
    },
    {
      termino: 'Evento de Partículas Solares (SPE)',
      explicacion: 'Emisión masiva de radiación ionizante por el Sol que puede corromper memoria o destruir aviónica no protegida por blindaje.'
    },
    {
      termino: 'Sol Marciano',
      explicacion: 'Día solar en Marte, con una duración de 24 horas, 39 minutos y 35 segundos terrestres, clave para los ciclos de carga solar.'
    },
    {
      termino: 'Opacidad de Polvo (τ)',
      explicacion: 'Coeficiente atmosférico que mide la atenuación de la radiación solar incidente durante tormentas de polvo en suelo marciano.'
    }
  ];

  /**
   * Genera el gráfico Radar en SVG puro (sin librerías externas)
   */
  function generarRadarSVG(ejes) {
    const cx = 175;
    const cy = 160;
    const R = 95;

    // 4 ejes en ángulos: Top (-90°), Right (0°), Bottom (90°), Left (180°)
    const puntos = ejes.map((eje, i) => {
      const pct = Math.max(0.08, Math.min(1.0, eje.pct / 100));
      const rad = R * pct;
      let x = cx;
      let y = cy;

      if (i === 0) { // Top (Éxito Misión)
        y = cy - rad;
      } else if (i === 1) { // Right (Valor Ciencia)
        x = cx + rad;
      } else if (i === 2) { // Bottom (Eficiencia)
        y = cy + rad;
      } else if (i === 3) { // Left (Decisiones)
        x = cx - rad;
      }
      return { x: Math.round(x), y: Math.round(y), eje };
    });

    const polygonPoints = puntos.map(p => `${p.x},${p.y}`).join(' ');

    return `
      <svg class="radar-svg" viewBox="0 0 350 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gráfico radar de rendimiento aeroespacial">
        <!-- Círculos de referencia concéntricos (25%, 50%, 75%, 100%) -->
        <circle cx="${cx}" cy="${cy}" r="${R * 0.25}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3" />
        <circle cx="${cx}" cy="${cy}" r="${R * 0.50}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3,3" />
        <circle cx="${cx}" cy="${cy}" r="${R * 0.75}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-dasharray="3,3" />
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="rgba(56, 189, 248, 0.03)" stroke="rgba(56, 189, 248, 0.3)" stroke-width="1.5" />

        <!-- Ejes ortogonales -->
        <line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
        <line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="rgba(255,255,255,0.12)" stroke-width="1" />

        <!-- Polígono del perfil de la misión -->
        <polygon points="${polygonPoints}" fill="rgba(56, 189, 248, 0.28)" stroke="#38bdf8" stroke-width="2.5" />

        <!-- Vértices interactivos con badges numéricos -->
        ${puntos.map(p => `
          <circle cx="${p.x}" cy="${p.y}" r="5" fill="#38bdf8" stroke="#070b14" stroke-width="2" />
        `).join('')}

        <!-- Etiquetas de ejes -->
        <text x="${cx}" y="26" text-anchor="middle" fill="#38bdf8" font-size="11" font-weight="700">
          🚀 ÉXITO MISIÓN (${ejes[0].valor}/${ejes[0].max})
        </text>
        <text x="${cx + R + 14}" y="${cy + 4}" text-anchor="start" fill="#22c55e" font-size="11" font-weight="700">
          🔬 CIENCIA (${ejes[1].valor}/${ejes[1].max})
        </text>
        <text x="${cx}" y="${cy + R + 26}" text-anchor="middle" fill="#eab308" font-size="11" font-weight="700">
          ⚡ EFICIENCIA (${ejes[2].valor}/${ejes[2].max})
        </text>
        <text x="${cx - R - 14}" y="${cy + 4}" text-anchor="end" fill="#f97316" font-size="11" font-weight="700">
          🧠 DECISIONES (${ejes[3].valor}/${ejes[3].max})
        </text>
      </svg>
    `;
  }

  /**
   * Garantiza que la cadena causa-efecto tenga al menos las 3 etapas (Diseño → Tormenta → Cráter).
   */
  function normalizarCadenaCausaEfecto(estado) {
    const historial = (estado.historialCausaEfecto && Array.isArray(estado.historialCausaEfecto))
      ? [...estado.historialCausaEfecto]
      : [];

    const tieneEtapa = (patron) => historial.some(h => (h.etapa || '').toLowerCase().includes(patron));

    // Si falta etapa 1 (Diseño)
    if (!tieneEtapa('diseño')) {
      const cohete = estado.diseno?.cohete || 'medio';
      historial.unshift({
        etapa: '1. Diseño y Ensamblaje',
        eleccion: `Arquitectura modular: Cohete ${cohete}, Paneles ${estado.diseno?.panel || 'M'}, Batería ${estado.diseno?.bateria || 'basica'}`,
        consecuencia: `Masa: ${estado.evaluacionActual?.masaTotal || 257} kg, Costo: ${estado.evaluacionActual?.costoTotal || 236} M$`,
        explicacion: 'Las decisiones de diseño definieron el margen de masa estructural, la suficiencia eléctrica y la viabilidad presupuestaria.'
      });
    }

    // Si falta etapa 2 (Tormenta / Tránsito)
    if (!tieneEtapa('tormenta') && !tieneEtapa('tránsito') && !tieneEtapa('viaje')) {
      const protegido = Boolean(estado.diseno?.blindaje);
      historial.push({
        etapa: '2. Tránsito Interplanetario (Tormenta Solar)',
        eleccion: protegido
          ? 'Blindaje antirradiación operativo y reorientación de aviónica protegida'
          : 'Sistemas expuestos sin blindaje especializado durante la fulguración solar',
        consecuencia: protegido
          ? 'La aviónica resistió el evento de partículas solares (SPE) sin degradación de memoria'
          : 'Degradación menor del 15% en sensores expuestos por flujo neutrónico',
        explicacion: protegido
          ? 'La decisión de invertir masa y presupuesto en blindaje previno fallos críticos en pleno espacio profundo.'
          : 'La falta de blindaje redujo costos de despegue pero expuso la electrónica de vuelo al viento solar.'
      });
    }

    // Si falta etapa 3 (Cráter / Descenso EDL)
    if (!tieneEtapa('cráter') && !tieneEtapa('descenso') && !tieneEtapa('aterrizaje')) {
      const tieneRelay = (estado.diseno?.relay && estado.diseno.relay !== 'ninguno');
      historial.push({
        etapa: '3. Entrada, Descenso y Cráter (EDL en Jezero)',
        eleccion: tieneRelay
          ? 'Descenso guiado con apoyo de telemetría de satélite relay en órbita marciana'
          : 'Descenso en contacto ciego durante la ocultación orbital de la Tierra',
        consecuencia: tieneRelay
          ? 'Posado suave de precisión a 1.6 m/s en el lecho seco del cráter'
          : 'Aterrizaje completado con éxito mediante sensores inerciales autónomos',
        explicacion: 'La maniobra de entrada atmosférica y retrocohetes garantizó la integridad del instrumental científico.'
      });
    }

    return historial;
  }

  /**
   * Renderiza la pantalla de reporte en el contenedor `#escena-report`.
   */
  function render(container) {
    if (!container) return;
    const estado = window.estadoMision || {};
    const evaluacion = estado.evaluacionActual || (window.Engine ? window.Engine.evaluarDiseno(estado.diseno, estado.presupuestoMax) : {});
    
    // Calcular resultado de 1000 puntos
    const reporte = (window.Engine && window.Engine.calcularPuntuacionFinal)
      ? window.Engine.calcularPuntuacionFinal(estado)
      : {
          puntuacionTotal: 820,
          rango: 'Éxito',
          rangoClase: 'exito',
          descripcionRango: 'Misión completada con éxito operativo y notable retorno científico.',
          categorias: {},
          ejesRadar: []
        };

    const historial = normalizarCadenaCausaEfecto(estado);

    container.innerHTML = `
        <div class="reporte-container">
          <!-- Existing report content -->
      <div class="reporte-container">
        <!-- ENCABEZADO DE RESULTADO Y RANGO -->
          <button type="button" class="btn-share" id="btn-share-design" style="margin-top:8px;">🤝 Compartir diseño</button>
        <header class="reporte-hero ${reporte.rangoClase}">
          <div class="reporte-badge-rango">CLASIFICACIÓN OFICIAL DE LA MISIÓN</div>
          <h1 class="reporte-titular-rango">${reporte.rango}</h1>
          <div class="reporte-score-display">
            <span class="reporte-score-numero">${reporte.puntuacionTotal}</span>
            <span class="reporte-score-max">/ 1000 PTS</span>
          </div>
          <p class="reporte-desc-rango">${reporte.descripcionRango}</p>
        </header>

        <!-- GRID PRINCIPAL: RADAR Y CATEGORÍAS -->
        <div class="reporte-grid-analisis">
          <!-- Gráfico Radar SVG Puro -->
          <div class="reporte-card radar-card">
            <h2 class="card-titulo"><span>📡</span> Perfil de Misión Multivariable</h2>
            <div class="radar-wrapper">
              ${generarRadarSVG(reporte.ejesRadar || [])}
            </div>
          </div>

          <!-- Tabla con las 4 Categorías de Puntuación -->
          <div class="reporte-card categorias-card">
            <h2 class="card-titulo"><span>📊</span> Desglose por Categorías (1000 pts)</h2>
            <table class="reporte-tabla">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Puntos</th>
                  <th>Detalle Técnico</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>🚀 Éxito de Misión</strong></td>
                  <td><span class="score-pill">${reporte.categorias.exitoMision.puntos} / 400</span></td>
                  <td><small>${reporte.categorias.exitoMision.desglose}</small></td>
                </tr>
                <tr>
                  <td><strong>🔬 Valor Científico</strong></td>
                  <td><span class="score-pill">${reporte.categorias.valorCientifico.puntos} / 300</span></td>
                  <td><small>${reporte.categorias.valorCientifico.desglose}</small></td>
                </tr>
                <tr>
                  <td><strong>⚡ Eficiencia Recursos</strong></td>
                  <td><span class="score-pill">${reporte.categorias.eficienciaRecursos.puntos} / 150</span></td>
                  <td><small>${reporte.categorias.eficienciaRecursos.desglose}</small></td>
                </tr>
                <tr>
                  <td><strong>🧠 Calidad Decisiones</strong></td>
                  <td><span class="score-pill">${reporte.categorias.calidadDecisiones.puntos} / 150</span></td>
                  <td><small>${reporte.categorias.calidadDecisiones.desglose}</small></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- CADENA DE CAUSA Y EFECTO (Diseño → Tormenta → Cráter) -->
        <section class="reporte-card causa-efecto-section">
          <h2 class="card-titulo"><span>🔗</span> Cadena de Causa y Efecto (Diseño → Tormenta → Cráter)</h2>
          <p class="seccion-sub">Traza histórica de cómo cada decisión del equipo se tradujo en consecuencias operativas.</p>
          
          <div class="timeline-causa-efecto">
            ${historial.map((item, idx) => `
              <div class="timeline-nodo">
                <div class="nodo-indicador">${idx + 1}</div>
                <div class="nodo-contenido">
                  <div class="nodo-etapa">${item.etapa}</div>
                  <div class="nodo-eleccion"><strong>Elección:</strong> ${item.eleccion}</div>
                  <div class="nodo-consecuencia"><strong>Consecuencia:</strong> ${item.consecuencia}</div>
                  <div class="nodo-explicacion">${item.explicacion}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- SECCIÓN DE ETIQUETAS NASA -->
        <section class="reporte-card glosario-section">
          <h2 class="card-titulo"><span>🏷️</span> Conceptos Aeroespaciales de la NASA</h2>
          <p class="seccion-sub">Fundamentos físicos y operativos aplicados en la simulación Ares-I.</p>
          
          <div class="etiquetas-grid">
            ${ETIQUETAS_NASA.map(etq => `
              <div class="etiqueta-card">
                <div class="etiqueta-header">
                  <span class="etiqueta-punto"></span>
                  <span class="etiqueta-nombre">${etq.termino}</span>
                </div>
                <div class="etiqueta-texto">${etq.explicacion}</div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- BOTONES DE ACCIÓN FUNCIONALES -->
        <footer class="reporte-acciones">
          <button type="button" class="btn-accion btn-redisenar" id="btn-reporte-redisenar">
            <span>🛠️</span> Rediseñar Nave (Conservar Piezas)
          </button>
          <button type="button" class="btn-accion btn-reiniciar" id="btn-reporte-reiniciar">
            <span>🔄</span> Jugar de Nuevo (Reiniciar Misión)
          </button>
        </footer>
      </div>
    `;

    conectarBotones(container);
  }

  /**
   * Conecta los botones "Rediseñar" y "Jugar de nuevo".
   */
  function conectarBotones(container) {
  // Botón Compartir Diseño
  const btnShare = container.querySelector('#btn-share-design');
  if (btnShare) {
    btnShare.addEventListener('click', () => {
      const d = window.estadoMision.diseno;
      const instr = (d.instrumentos || []).join('|');
      const hash = `#d=${d.cohete},${d.panel},${d.bateria},${d.antena},${d.blindaje},${d.redundancia},${instr},${d.relay}`;
      const url = `${window.location.origin}${window.location.pathname}${hash}`;
      navigator.clipboard.writeText(url).then(() => {
        alert('¡Enlace copiado!');
      }).catch(() => {
        alert('Error al copiar el enlace');
      });
    });
  }

    // Botón Rediseñar (regresa a Escena 1 conservando las piezas elegidas)
    const btnRedisenar = container.querySelector('#btn-reporte-redisenar');
    if (btnRedisenar) {
      btnRedisenar.addEventListener('click', () => {
        if (window.UI?.cambiarEscena) {
          window.UI.cambiarEscena('design');
        }
      });
    }

    // Botón Jugar de nuevo (reinicia todo y regresa al inicio/diseño)
    const btnReiniciar = container.querySelector('#btn-reporte-reiniciar');
    if (btnReiniciar) {
      btnReiniciar.addEventListener('click', () => {
        if (window.reiniciarEstado) {
          window.reiniciarEstado();
        }
        if (window.UI?.cambiarEscena) {
          window.UI.cambiarEscena('design');
        }
      });
    }
  }

  /**
   * Inicializa la pantalla de reporte.
   */
  function iniciar() {
    const contenedor = document.getElementById('escena-report');
    if (contenedor) {
      render(contenedor);
    }
  }

  window.ReportScene = {
    iniciar,
    render
  };

})(typeof window !== 'undefined' ? window : this);

