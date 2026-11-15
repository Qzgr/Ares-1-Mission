/**
 * Misión Ares-I – js/scenes/rover.js
 * Escena 3: Cráter Jezero 2D lateral (estilo Terraria) + Decisión 3
 *
 * Fases:
 *   'juego'   → canvas jugable 60 s con Dan, rover, rocas y radar
 *   'decision'→ menú .marco-nasa con 3 opciones
 */
(function (window) {
  'use strict';

  /* ═══ estado del minijuego ═══ */
  let fase = 'juego';          // 'juego' | 'decision'
  let rafId = null;            // requestAnimationFrame handle
  let tiempoRestante = 60;     // segundos
  let timerInterval = null;

  /* posición y estado de Dan */
  let danX = 100, danY = 0;
  let danVY = 0;
  let danEnSuelo = true;
  let danDir = 1;              // 1=derecha, -1=izquierda
  let danEstado = 'quieto';    // 'quieto'|'camina1'|'camina2'|'salta'
  let danAnimFrame = 0;

  /* radar */
  let radarOnda = 0;           // radio creciente (0=inactivo)
  let radarActivo = false;

  /* vetas minerales: { x, y, profunda, revelada, extraida } */
  let vetas = [];

  /* teclas pulsadas */
  const keys = {};

  /* constantes canvas */
  const CW = 760, CH = 320;

  /* ═══ helpers de diseño ═══ */
  function tieneCamaraAlta() {
    return (window.estadoMision?.diseno?.instrumentos || []).includes('camaraAlta');
  }
  function tieneRadar() {
    return (window.estadoMision?.diseno?.instrumentos || []).includes('radar');
  }

  /* ═══ inicializar vetas ═══ */
  function generarVetas(ySuelo) {
    vetas = [
      { x: 180, y: ySuelo + 14, profunda: false, revelada: false, extraida: false },
      { x: 320, y: ySuelo + 18, profunda: false, revelada: false, extraida: false },
      { x: 500, y: ySuelo + 12, profunda: false, revelada: false, extraida: false },
      { x: 250, y: ySuelo + 38, profunda: true,  revelada: false, extraida: false },
      { x: 440, y: ySuelo + 44, profunda: true,  revelada: false, extraida: false }
    ];
  }

  /* ═══ render HTML fase juego ═══ */
  function renderJuego(container) {
    container.innerHTML = `
<div class="marco-nasa" id="rover-wrapper">
  <h2>🌋 Exploración en el Cráter Jezero — <span id="rover-timer">60</span>s</h2>

  <canvas id="canvas-jezero" width="${CW}" height="${CH}"
          style="width:100%;max-width:${CW}px;cursor:crosshair;"></canvas>

  <!-- Controles táctiles para móvil -->
  <div class="touch-controles" id="touch-pad">
    <button class="touch-btn" id="tbtn-izq">◀</button>
    <button class="touch-btn" id="tbtn-saltar">▲</button>
    <button class="touch-btn" id="tbtn-der">▶</button>
    <button class="touch-btn" id="tbtn-escanear">🔊 ESCANEAR</button>
    <button class="touch-btn" id="tbtn-extraer">⛏ EXTRAER</button>
  </div>

  <div style="margin-top:8px;font-family:'VT323',monospace;font-size:20px;color:#fde047;">
    Muestras: <span id="rover-muestras">0</span>/5 &nbsp;|&nbsp;
    Batería: <span id="rover-bateria">${window.estadoMision?.bateriaActual ?? 100}</span>%
    <span id="rover-señal" style="color:#22c55e;margin-left:12px;"></span>
  </div>

  <div class="paso-nav" style="margin-top:10px;">
    <button type="button" class="btn" id="btn-saltar-decision">Ir directo a decisión ⏭</button>
  </div>
</div>`;

    iniciarCanvas();
    conectarTeclas();
    conectarBotonesJuego();
  }

  /* ═══ loop del canvas ═══ */
  let ySuelo = 0;

  function iniciarCanvas() {
    const cv = document.getElementById('canvas-jezero');
    if (!cv || !window.Sprites) return;
    const ctx = cv.getContext('2d');

    // Generar el ySuelo con un renderizado inicial
    ySuelo = window.Sprites.dibujarEscenarioMarte(ctx, CW, CH, { conSubsuelo: true, conBase: true });
    danY = ySuelo - 54;   // sobre el suelo
    generarVetas(ySuelo);

    // Temporizador de cuenta regresiva
    if (timerInterval) clearInterval(timerInterval);
    tiempoRestante = 60;
    timerInterval = setInterval(() => {
      tiempoRestante--;
      const el = document.getElementById('rover-timer');
      if (el) el.textContent = tiempoRestante;
      if (tiempoRestante <= 0) terminarJuego();
    }, 1000);

    if (rafId) cancelAnimationFrame(rafId);
    loop(ctx);
  }

  function loop(ctx) {
    rafId = requestAnimationFrame(() => loop(ctx));

    /* movimiento de Dan */
    const speed = 4;
    if (keys['ArrowLeft'] || keys['KeyA']) {
      danX = Math.max(10, danX - speed);
      danDir = -1;
      danEstado = danAnimFrame % 8 < 4 ? 'camina1' : 'camina2';
    } else if (keys['ArrowRight'] || keys['KeyD']) {
      danX = Math.min(CW - 50, danX + speed);
      danDir = 1;
      danEstado = danAnimFrame % 8 < 4 ? 'camina1' : 'camina2';
    } else {
      danEstado = 'quieto';
    }

    /* gravedad marciana (0.38g ≈ 60% menos) */
    if (!danEnSuelo) {
      danVY += 0.22;
      danY += danVY;
      if (danY >= ySuelo - 54) {
        danY = ySuelo - 54;
        danVY = 0;
        danEnSuelo = true;
        danEstado = 'quieto';
      }
    }

    danAnimFrame++;

    /* onda de radar */
    if (radarActivo) {
      radarOnda += 3;
      const radioMax = tieneCamaraAlta() ? 160 : 90;
      if (radarOnda > radioMax) {
        radarOnda = 0;
        radarActivo = false;
        // revelar vetas dentro del radio
        vetas.forEach(v => {
          if (!v.extraida) {
            const dx = v.x - danX;
            const dy = v.y - (danY + 27);
            if (Math.sqrt(dx * dx + dy * dy) <= radioMax) {
              if (!v.profunda || tieneRadar()) v.revelada = true;
            }
          }
        });
      }
    }

    /* ─── render frame ─── */
    ySuelo = window.Sprites.dibujarEscenarioMarte(ctx, CW, CH, { conSubsuelo: true, conBase: true });

    /* vetas (solo las reveladas y no extraídas) */
    vetas.forEach(v => {
      if (v.extraida) return;
      if (v.revelada) {
        ctx.save();
        ctx.fillStyle = v.profunda ? '#38bdf8' : '#fbbf24';
        ctx.shadowColor = v.profunda ? '#38bdf8' : '#fbbf24';
        ctx.shadowBlur = 6;
        ctx.fillRect(v.x - 6, v.y - 6, 12, 12);
        ctx.restore();
        // si tiene espectrómetro, mostrar puntos
        if ((window.estadoMision?.diseno?.instrumentos || []).includes('espectrometro')) {
          ctx.save();
          ctx.font = '9px "Press Start 2P", monospace';
          ctx.fillStyle = '#fde047';
          ctx.fillText(v.profunda ? '+15' : '+10', v.x - 10, v.y - 10);
          ctx.restore();
        }
      }
    });

    /* onda radar visual */
    if (radarActivo && radarOnda > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(34,197,94,${1 - radarOnda / 160})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(danX + 24, danY + 27, radarOnda, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    /* rover estacionado cerca de la base */
    window.Sprites.dibujarRover(ctx, 60, ySuelo - 40, 3);

    /* astronautas de base: ana, leo, maya */
    [
      { id: 'ana', x: 170 },
      { id: 'leo', x: 230 },
      { id: 'maya', x: 290 }
    ].forEach(p => {
      window.Sprites.dibujarAstronauta(ctx, p.id, p.x, ySuelo - 52, {
        escala: 2, estado: 'quieto', voltear: false, mostrarNombre: true
      });
    });

    /* Dan (jugador) */
    window.Sprites.dibujarAstronauta(ctx, 'dan', danX, danY, {
      escala: 2,
      estado: danEstado,
      voltear: danDir === -1,
      mostrarNombre: true
    });

    /* alerta señal débil (si Dan se aleja del centro) */
    if (danX > CW * 0.72 || danX < 60) {
      ctx.save();
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#ef4444';
      ctx.fillText('⚠ SEÑAL DÉBIL', CW / 2 - 60, 22);
      ctx.restore();
    }

    /* HUD muestras en canvas */
    const m = (window.estadoMision?.muestrasRecolectadas ?? 0);
    ctx.save();
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`DAN  ${tiempoRestante}s  🧪${m}`, 10, 18);
    ctx.restore();

    /* actualizar DOM */
    const elM = document.getElementById('rover-muestras');
    if (elM) elM.textContent = m;
    const elB = document.getElementById('rover-bateria');
    if (elB) elB.textContent = window.estadoMision?.bateriaActual ?? 100;
    const elS = document.getElementById('rover-señal');
    if (elS) elS.textContent = danX > CW * 0.72 || danX < 60 ? '⚠ SEÑAL DÉBIL' : '';

    /* verificar extracción cercana (E) */
    if (keys['KeyE']) {
      extraerCercana();
      keys['KeyE'] = false; // consumir una vez
    }

    /* condición de fin automático: 5 muestras */
    if ((window.estadoMision?.muestrasRecolectadas ?? 0) >= 5) {
      terminarJuego();
    }
  }

  function extraerCercana() {
    const estado = window.estadoMision;
    if (!estado) return;
    for (const v of vetas) {
      if (!v.extraida && v.revelada) {
        const dx = v.x - danX;
        const dy = v.y - (danY + 27);
        if (Math.sqrt(dx * dx + dy * dy) < 40) {
          v.extraida = true;
          estado.muestrasRecolectadas = (estado.muestrasRecolectadas || 0) + 1;
          if (window.Sound?.playBeep) window.Sound.playBeep();
          break;
        }
      }
    }
  }

  function activarEscaner() {
    radarActivo = true;
    radarOnda = 0;
    if (window.Sound?.playPulse) window.Sound.playPulse();
  }

  /* ═══ teclas ═══ */
  function conectarTeclas() {
    // Limpiar listeners previos clonando
    const kd = e => {
      keys[e.code] = true;
      if (e.code === 'Space') { e.preventDefault(); activarEscaner(); }
      if (e.code === 'KeyW' || e.code === 'ArrowUp') { e.preventDefault(); saltar(); }
    };
    const ku = e => { keys[e.code] = false; };
    document.addEventListener('keydown', kd);
    document.addEventListener('keyup', ku);
  }

  function saltar() {
    if (danEnSuelo) {
      danEnSuelo = false;
      danVY = -6;
      danEstado = 'salta';
    }
  }

  /* ═══ botones táctiles ═══ */
  function conectarBotonesJuego() {
    const addHold = (id, fn) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      let hold = null;
      btn.addEventListener('pointerdown', () => { fn(); hold = setInterval(fn, 50); });
      btn.addEventListener('pointerup', () => clearInterval(hold));
      btn.addEventListener('pointerleave', () => clearInterval(hold));
    };

    addHold('tbtn-izq', () => { keys['ArrowLeft'] = true; });
    addHold('tbtn-der', () => { keys['ArrowRight'] = true; });

    document.getElementById('tbtn-saltar')?.addEventListener('click', saltar);
    document.getElementById('tbtn-escanear')?.addEventListener('click', activarEscaner);
    document.getElementById('tbtn-extraer')?.addEventListener('click', extraerCercana);
    document.getElementById('btn-saltar-decision')?.addEventListener('click', terminarJuego);
  }

  /* ═══ terminar juego → decision ═══ */
  function terminarJuego() {
    if (fase === 'decision') return;
    fase = 'decision';
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    // asegurar valor mínimo de muestras
    const estado = window.estadoMision || {};
    if (!estado.muestrasRecolectadas || estado.muestrasRecolectadas < 1) {
      estado.muestrasRecolectadas = 3;
    }

    const container = document.getElementById('escena-rover');
    if (container) renderDecision(container);
  }

  /* ═══ render decisión 3 ═══ */
  function renderDecision(container) {
    const estado = window.estadoMision || {};
    const diseno = estado.diseno || {};
    const evaluacion = estado.evaluacionActual ||
      (window.Engine?.evaluarDiseno ? window.Engine.evaluarDiseno(diseno, estado.presupuestoMax) : {});

    const data = window.DATA || {};
    const relayId = diseno.relay || 'ninguno';
    const relayObj = data.relays?.[relayId] || { cobertura: 0.40, nombre: 'Sin Relay' };
    const cobertura = relayObj.cobertura ?? 0.40;
    const sinRelay = relayId === 'ninguno';
    const bateriaActual = estado.bateriaActual ?? 100;
    const tieneTaladro = (diseno.instrumentos || []).includes('taladro');

    const { probTotal, factorLigereza, factorPaneles } = calcularProbabilidadExtraccion(estado, evaluacion);

    const puedeExtraccion = tieneTaladro && bateriaActual >= 40;
    const pctCober = Math.round(cobertura * 100);

    container.innerHTML = `
<div class="marco-nasa tormenta-polvo" id="rover-decision">

  <h1>🌪️ Tormenta de Polvo en el Borde del Barranco</h1>
  <p style="font-family:'VT323',monospace;font-size:20px;margin:0 0 12px;">
    Dan se encuentra en el límite del cráter con <strong>${estado.muestrasRecolectadas}</strong> muestras recolectadas.
    La tormenta reduce la visibilidad y la cobertura de enlace al ${pctCober}%.
    ¿Cuál es tu decisión?
  </p>

  <div class="cards-grid">

    <!-- OPCIÓN A: RETIRADA SEGURA -->
    <div class="option-card decision-card" id="dec3-retirada" role="button" tabindex="0">
      <canvas data-icono="nave" data-escala="2" style="width:24px;height:24px;"></canvas>
      <h3>🏁 Retirada Segura</h3>
      <p>Envía lo recolectado. 60% de la ciencia posible. Riesgo: ninguno.</p>
      <div class="spec-line"><span>Ciencia:</span><span class="spec-val">60%</span></div>
      <div class="spec-line"><span>Riesgo:</span><span class="spec-val" style="color:#22c55e;">NINGUNO</span></div>
    </div>

    <!-- OPCIÓN B: TRABAJO EN EQUIPO CON RELAY -->
    <div class="option-card decision-card ${sinRelay ? 'disabled-card' : ''}"
         id="dec3-relay" role="button" tabindex="0"
         ${sinRelay ? 'aria-disabled="true"' : ''}>
      <canvas data-icono="relay" data-escala="2" style="width:24px;height:24px;"></canvas>
      <h3>🛰️ Trabajo en Equipo con Relay</h3>
      ${sinRelay
        ? '<p style="color:#ef4444;">❌ No tienes relay orbital. Opción deshabilitada.</p>'
        : `<p>Sube el 100% de datos vía relay.${cobertura <= 0.65 ? ' ⚠ Cobertura baja: solo 80%.' : ''}</p>
           <div class="spec-line"><span>Ciencia:</span><span class="spec-val">${cobertura > 0.65 ? '100' : '80'}%</span></div>
           <div class="spec-line"><span>Riesgo:</span><span class="spec-val" style="color:#facc15;">BAJO</span></div>`
      }
    </div>

    <!-- OPCIÓN C: EXTRACCIÓN AL LÍMITE -->
    <div class="option-card decision-card ${puedeExtraccion ? '' : 'disabled-card'}"
         id="dec3-extraccion" role="button" tabindex="0"
         ${puedeExtraccion ? '' : 'aria-disabled="true"'}>
      <canvas data-icono="ciencia" data-escala="2" style="width:24px;height:24px;"></canvas>
      <h3>⚡ Extracción al Límite</h3>
      ${!tieneTaladro
        ? '<p style="color:#ef4444;">❌ Sin taladro instalado.</p>'
        : bateriaActual < 40
          ? `<p style="color:#ef4444;">❌ Batería insuficiente (${bateriaActual}% < 40%).</p>`
          : `<p>Probabilidad de éxito: <strong style="color:#facc15;">${probTotal}%</strong></p>
             <div class="spec-line"><span>Ligereza:</span><span class="spec-val">+${factorLigereza}%</span></div>
             <div class="spec-line"><span>Salud paneles:</span><span class="spec-val">+${factorPaneles}%</span></div>
             <div class="spec-line"><span>Éxito→Ciencia:</span><span class="spec-val">+100%</span></div>
             <div class="spec-line"><span>Fallo→Ciencia:</span><span class="spec-val">0%</span></div>`
      }
    </div>

  </div><!-- .cards-grid -->
</div><!-- .marco-nasa -->`;

    if (window.Sprites?.pintarIconosDOM) window.Sprites.pintarIconosDOM();
    conectarBotonesDecision(estado, diseno, evaluacion, relayObj, cobertura, puedeExtraccion, probTotal);
  }

  /* ═══ lógica de las 3 decisiones ═══ */
  function calcularProbabilidadExtraccion(estado, evaluacion) {
    const capCohete = evaluacion?.capacidadCohete || 700;
    const masaTotal = evaluacion?.masaTotal || 350;
    const danoPaneles = estado?.danoPaneles || 0;
    const ratioLigereza = Math.max(0, 1 - masaTotal / capCohete);
    const factorLigereza = Math.round(ratioLigereza * 40);
    const saludPaneles = Math.max(0, 100 - danoPaneles);
    const factorPaneles = Math.round(saludPaneles / 100 * 40);
    const probTotal = Math.min(95, Math.max(15, 15 + factorLigereza + factorPaneles));
    return { probTotal, factorLigereza, factorPaneles, saludPaneles };
  }

  function conectarBotonesDecision(estado, diseno, evaluacion, relayObj, cobertura, puedeExtraccion, probTotal) {
    // Retirada segura
    document.getElementById('dec3-retirada')?.addEventListener('click', () => {
      estado.decision3 = 'retirada_segura';
      estado.registrarCausaEfecto?.('Decisión 3 – Barranco',
        'Retirada segura: envía lo recolectado',
        '60% de la ciencia potencial asegurada sin riesgo',
        'La prudencia garantizó la supervivencia del rover y el retorno de muestras.');
      irReporte();
    });

    // Relay
    const btnRelay = document.getElementById('dec3-relay');
    if (btnRelay && relayObj.cobertura > 0.4) {
      btnRelay.addEventListener('click', () => {
        const pct = cobertura > 0.65 ? 100 : 80;
        estado.decision3 = 'relay_equipo';
        estado.registrarCausaEfecto?.('Decisión 3 – Barranco',
          'Trabajo en equipo con relay orbital',
          `${pct}% de ciencia subida vía relay (cobertura ${Math.round(cobertura*100)}%)`,
          'El relay orbital permitió una transferencia masiva de datos en la ventana de enlace.');
        irReporte();
      });
    }

    // Extracción al límite
    if (puedeExtraccion) {
      document.getElementById('dec3-extraccion')?.addEventListener('click', () => {
        const exito = Math.random() * 100 < probTotal;
        estado.decision3 = 'extraccion_limite';
        estado.decision3Fallo = !exito;
        estado.registrarCausaEfecto?.('Decisión 3 – Barranco',
          `Extracción al límite (prob. ${probTotal}%)`,
          exito ? '+100% ciencia — ¡Éxito extraordinario!' : 'Fallo catastrófico — 0% ciencia, rover averiado',
          exito
            ? 'El taladro penetró la roca basáltica y recuperó muestras del subsuelo con alto valor científico.'
            : 'El actuador del taladro falló bajo la tormenta. Pérdida total de la carga científica.');
        irReporte();
      });
    }
  }

  function irReporte() {
    if (window.Sound?.playBeep) window.Sound.playBeep();
    window.UI?.cambiarEscena?.('report');
  }

  /* ═══ inicializar escena ═══ */
  function iniciar() {
    const container = document.getElementById('escena-rover');
    if (!container) return;

    // reiniciar estado del minijuego
    fase = 'juego';
    danX = 100; danY = 0; danVY = 0;
    danEnSuelo = true; danDir = 1;
    radarActivo = false; radarOnda = 0;
    Object.keys(keys).forEach(k => delete keys[k]);

    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    renderJuego(container);
  }

  window.RoverScene = { iniciar };

})(typeof window !== 'undefined' ? window : this);
