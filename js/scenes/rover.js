/**
 * Misión Ares-I – js/scenes/rover.js
 * Descenso EDL con nave NASA fiel, exploración en Jezero, Despegue, Viaje y Amerizaje con rescate en helicóptero.
 */
(function (window) {
  'use strict';

  const CW = 920;
  const CH = 420;
  const teclas = {};
  const listeners = [];
  let fase = 'inactiva';
  let rafId = null;
  let intervalId = null;
  let timeoutId = null;
  let extraccion = null;
  let dan = { x: 130, y: 0, vy: 0, enSuelo: true, direccion: 1, estado: 'quieto' };
  let ySuelo = 0;
  let tiempoRestante = 60;
  let tiempoJuegoInicio = 0;
  let ondaEscaner = null;
  let vetas = [];
  let mensajesFlotantes = [];

  function numeroFinito(valor, respaldo) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : respaldo;
  }

  function limitar(valor, minimo, maximo) {
    return Math.max(minimo, Math.min(maximo, numeroFinito(valor, minimo)));
  }

  function estadoMision() {
    return window.estadoMision || null;
  }

  function instrumentosInstalados() {
    const instrumentos = estadoMision()?.diseno?.instrumentos;
    if (Array.isArray(instrumentos)) return instrumentos;
    if (instrumentos && typeof instrumentos === 'object') {
      return Object.keys(instrumentos).filter(id => instrumentos[id]);
    }
    return [];
  }

  function escuchar(elemento, evento, handler, opciones) {
    if (!elemento) return;
    elemento.addEventListener(evento, handler, opciones);
    listeners.push({ elemento, evento, handler, opciones });
  }

  function limpiarListeners() {
    listeners.forEach(({ elemento, evento, handler, opciones }) => {
      elemento.removeEventListener(evento, handler, opciones);
    });
    listeners.length = 0;
    Object.keys(teclas).forEach(tecla => { teclas[tecla] = false; });
  }

  function detenerBucles() {
    if (window.Sound?.stopThruster) window.Sound.stopThruster();
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    limpiarListeners();
    extraccion = null;
  }

  function obtenerContenedor() {
    return document.getElementById('escena-rover');
  }

  function errorDependencia(contenedor, detalle) {
    console.error(`No se puede iniciar la escena del rover: ${detalle}`);
    if (contenedor) {
      contenedor.innerHTML = `
        <div class="marco-nasa">
          <h1>Error al iniciar Jezero</h1>
          <p>No se pudo cargar el canvas o los sprites necesarios. Recarga la misión e inténtalo de nuevo.</p>
        </div>`;
    }
    fase = 'error';
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  1. DESCENSO EDL A JEZERO (Con nave blanca/roja NASA fiel al diseño)
  // ─────────────────────────────────────────────────────────────────────────
  function renderEDL(contenedor) {
    fase = 'edl';
    contenedor.classList.remove('tormenta-polvo');
    contenedor.innerHTML = `
      <div class="marco-nasa fase-edl" style="width:95vw; max-width:1380px; margin:12px auto;">
        <span class="badge-tag" style="background:#fc3d21; color:#fff; border-color:#090d16;">FASE 3 · ENTRADA, DESCENSO Y ATERRIZAJE</span>
        <h1>Descenso a Jezero</h1>
        <p>Controla los retropropulsores para aterrizar con una velocidad vertical segura de <strong>2.5 m/s</strong> o menos.</p>
        <div class="edl-hud">
          <strong>TIEMPO: <span id="edl-time">15.0</span> s</strong>
          <strong>ALTITUD: <span id="edl-altitude">55.0</span> m</strong>
          <strong>VELOCIDAD: <span id="edl-speed">4.5</span> m/s</strong>
          <strong>PRECISIÓN: <span id="edl-score">0</span>/150 pts</strong>
          <strong>BATERÍA: <span id="edl-battery">${Math.round(limitar(estadoMision()?.bateriaActual, 0, 100))}</span>%</strong>
        </div>
        <canvas id="canvas-edl" width="${CW}" height="${CH}"
                style="width:100%; max-width:920px; height:auto; display:block; margin:0 auto; border:4px solid #eab308;"
                aria-label="Módulo de descenso de Ares-I aterrizando en el cráter Jezero"></canvas>
        <div style="display:flex; gap:14px; justify-content:center; align-items:center; flex-wrap:wrap; margin-top:12px;">
          <button type="button" class="btn btn-launch" id="btn-edl-brake" aria-pressed="false" style="min-height:48px;">
            🔥 FRENAR RETROPROPULSORES [W / ↑]
          </button>
          <button type="button" class="btn btn-secondary" id="btn-abandonar-edl"
                  style="border-color: #ef4444; color: #f87171; min-height:48px;">
            ⚠ ABANDONAR TRAMO (0 PTS)
          </button>
        </div>
        <p class="briefing-caption">Mantén W, Flecha Arriba o el botón para frenar. El uso de retropropulsores consume batería.</p>
        <div id="edl-result" class="edl-result" aria-live="polite"></div>
      </div>`;

    contenedor.querySelector('#btn-abandonar-edl')?.addEventListener('click', () => {
      const m = estadoMision();
      if (!m || fase !== 'edl') return;
      detenerBucles();
      const tramosSaltados = numeroFinito(m.tramosSaltados, 0);
      m.tramosSaltados = Math.max(0, tramosSaltados) + 1;
      m.edlPuntos = 0;
      m.edlPrecision = 0;
      m.muestrasRecolectadas = 0;
      m.llegadaExitosa = false;
      registrarHistorial(
        '3. Entrada, Descenso y Aterrizaje (EDL)',
        'Tramo de descenso abandonado por el operador',
        'Precisión EDL: 0/150 pts; penalización de 50 pts en decisiones',
        'Se abandonó la maniobra de posado suave. No se otorgan puntos por el descenso.'
      );
      renderExploracion(contenedor);
    });

    const canvas = contenedor.querySelector('#canvas-edl');
    const ctx = canvas?.getContext('2d');
    const sprites = window.Sprites;
    if (!ctx || typeof sprites?.dibujarEscenarioMarte !== 'function') {
      errorDependencia(contenedor, 'faltan el contexto 2D o los sprites de Marte.');
      return;
    }

    const mision = estadoMision();
    const limiteTiempo = 15;
    let altitud = 55;
    let vy = 4.5;
    let transcurrido = 0;
    let anterior = performance.now();
    let frenando = false;
    const botonFreno = contenedor.querySelector('#btn-edl-brake');
    const hudTiempo = contenedor.querySelector('#edl-time');
    const hudAltitud = contenedor.querySelector('#edl-altitude');
    const hudVelocidad = contenedor.querySelector('#edl-speed');
    const hudBateria = contenedor.querySelector('#edl-battery');

    const ponerFreno = activo => {
      frenando = activo;
      botonFreno?.setAttribute('aria-pressed', String(activo));
    };
    const keyDown = evento => {
      if (evento.code === 'KeyW' || evento.code === 'ArrowUp' || evento.code === 'Space') {
        evento.preventDefault();
        ponerFreno(true);
      }
    };
    const keyUp = evento => {
      if (evento.code === 'KeyW' || evento.code === 'ArrowUp' || evento.code === 'Space') ponerFreno(false);
    };
    const pointerDown = evento => {
      evento.preventDefault();
      ponerFreno(true);
    };
    const pointerUp = () => ponerFreno(false);
    escuchar(document, 'keydown', keyDown);
    escuchar(document, 'keyup', keyUp);
    escuchar(window, 'blur', pointerUp);
    escuchar(botonFreno, 'pointerdown', pointerDown);
    escuchar(botonFreno, 'pointerup', pointerUp);
    escuchar(botonFreno, 'pointerleave', pointerUp);
    escuchar(botonFreno, 'pointercancel', pointerUp);
    escuchar(botonFreno, 'mousedown', pointerDown);
    escuchar(window, 'mouseup', pointerUp);
    escuchar(botonFreno, 'touchstart', pointerDown, { passive: false });
    escuchar(botonFreno, 'touchend', pointerUp);

    function dibujarEDL(ahora) {
      const dt = Math.min(Math.max(0, (ahora - anterior) / 1000), 0.05);
      anterior = ahora;
      transcurrido += dt;
      const bateriaDisponible = limitar(mision?.bateriaActual, 0, 100);
      const frenadoActivo = frenando && bateriaDisponible > 0;

      vy += 1.6 * dt;
      if (frenadoActivo) {
        vy = Math.max(0.4, vy - 6.2 * dt);
        if (mision) mision.bateriaActual = Math.max(0, bateriaDisponible - 1.8 * dt);
        if (window.Sound?.startThruster) window.Sound.startThruster(0.65);
      } else {
        if (window.Sound?.stopThruster) window.Sound.stopThruster();
      }
      altitud = Math.max(0, altitud - vy * dt * 2.2);

      const suelo = sprites.dibujarEscenarioMarte(ctx, CW, CH, {
        conSubsuelo: true,
        conBase: true
      });
      const xCapsula = CW / 2;
      const yCapsula = suelo - 60 - altitud * 3.1;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
      ctx.fillRect(xCapsula - 36, suelo - 4, 72, 5);
      ctx.restore();

      if (typeof sprites.dibujarNaveDescenso === 'function') {
        sprites.dibujarNaveDescenso(ctx, xCapsula, yCapsula, mision?.diseno, frenadoActivo);
      }

      if (hudTiempo) hudTiempo.textContent = Math.max(0, limiteTiempo - transcurrido).toFixed(1);
      if (hudAltitud) hudAltitud.textContent = altitud.toFixed(1);
      if (hudVelocidad) {
        hudVelocidad.textContent = vy.toFixed(1);
        hudVelocidad.style.color = vy <= 2.5 ? '#22c55e' : (vy <= 6.0 ? '#facc15' : '#ef4444');
      }
      if (hudBateria) hudBateria.textContent = String(Math.round(limitar(mision?.bateriaActual, 0, 100)));

      if (altitud <= 0) {
        finalizarEDL(contenedor, vy, false);
        return;
      }
      if (transcurrido >= limiteTiempo) {
        finalizarEDL(contenedor, vy, true);
        return;
      }
      rafId = requestAnimationFrame(dibujarEDL);
    }

    rafId = requestAnimationFrame(dibujarEDL);
  }

  function finalizarEDL(contenedor, velocidadImpacto, tiempoAgotado) {
    if (fase !== 'edl') return;
    if (window.Sound?.stopThruster) window.Sound.stopThruster();
    detenerBucles();

    const velocidadSegura = Math.max(0, numeroFinito(velocidadImpacto, 20));
    const puntos = velocidadSegura <= 2.5 ? 150
      : velocidadSegura <= 6.0 ? 60 : 0;
    const estado = velocidadSegura <= 2.5 ? 'suave'
      : velocidadSegura <= 6.0 ? 'brusco' : 'chocado';
    const mision = estadoMision();
    if (mision) {
      mision.edlPuntos = puntos;
      mision.edlPrecision = puntos;
      mision.edlEstado = estado;
      mision.llegadaExitosa = velocidadSegura <= 6.0;
      registrarHistorial(
        '3. Entrada, Descenso y Aterrizaje (EDL)',
        tiempoAgotado ? 'Tiempo agotado durante el descenso' : `Aterrizaje a ${velocidadSegura.toFixed(1)} m/s`,
        `Precisión EDL: ${puntos}/150 pts (${estado})`,
        puntos === 150
          ? 'El módulo Ares-I aterrizó suavemente y el rover quedó listo para explorar.'
          : puntos === 60
            ? 'El aterrizaje fue brusco, pero la tripulación y el rover sobrevivieron.'
            : tiempoAgotado
              ? 'El tiempo se agotó; la nave impactó sin control.'
              : 'El descenso fue demasiado rápido; la nave sufrió un impacto duro.'
      );
    }

    const score = contenedor.querySelector('#edl-score');
    const resultado = contenedor.querySelector('#edl-result');
    if (score) score.textContent = String(puntos);
    if (resultado) {
      resultado.textContent = tiempoAgotado
        ? 'Tiempo agotado: aterrizaje de emergencia (0/150 pts). Preparando exploración...'
        : `Aterrizaje a ${velocidadSegura.toFixed(1)} m/s: ${puntos}/150 pts. Preparando exploración...`;
    }

    fase = 'transicion-edl';
    timeoutId = window.setTimeout(() => {
      timeoutId = null;
      if (!contenedor.classList.contains('activa')) return;
      const st = estadoMision();
      if (st?.evaluacionActual && window.UI?.actualizarBarraRecursos) {
        window.UI.actualizarBarraRecursos(st.evaluacionActual, st);
      }
      iniciarExploracion(contenedor);
    }, 1000);
  }

  function registrarHistorial(etapa, eleccion, consecuencia, explicacion) {
    const mision = estadoMision();
    if (!mision) return;
    if (typeof mision.registrarCausaEfecto === 'function') {
      mision.registrarCausaEfecto(etapa, eleccion, consecuencia, explicacion);
      return;
    }
    if (!Array.isArray(mision.historialCausaEfecto)) mision.historialCausaEfecto = [];
    mision.historialCausaEfecto.push({ etapa, eleccion, consecuencia, explicacion });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  2. EXPLORACIÓN EN EL CRÁTER JEZERO (Escala ampliada 920x420)
  // ─────────────────────────────────────────────────────────────────────────
  function generarVetas() {
    vetas = [
      { x: 230, y: ySuelo + 46, profunda: false, reveladaHasta: 0, extraida: false, mineral: 'HIELO H2O' },
      { x: 365, y: ySuelo + 46, profunda: false, reveladaHasta: 0, extraida: false, mineral: 'ARCILLA' },
      { x: 500, y: ySuelo + 46, profunda: false, reveladaHasta: 0, extraida: false, mineral: 'CARBONATOS' },
      { x: 645, y: ySuelo + 96, profunda: true, reveladaHasta: 0, extraida: false, mineral: 'HIELO PROFUNDO' },
      { x: 785, y: ySuelo + 96, profunda: true, reveladaHasta: 0, extraida: false, mineral: 'SALES' }
    ];
  }

  function renderExploracion(contenedor) {
    fase = 'exploracion';
    contenedor.classList.remove('tormenta-polvo');
    contenedor.innerHTML = `
      <div class="marco-nasa" style="width:95vw; max-width:1380px; margin:12px auto;">
        <span class="badge-tag" style="background:#fc3d21; color:#fff; border-color:#090d16;">FASE 4 · EXPLORACIÓN DE JEZERO</span>
        <h1>🌋 Exploración en el Cráter Jezero</h1>
        <p>Camina sobre el corte subterráneo, pulsa <strong>ESCANEAR [ESPACIO]</strong> para revelar vetas minerales y <strong>EXTRAER [E]</strong> para reunir 3 muestras.</p>
        <div class="edl-hud rover-hud" aria-live="polite">
          <strong>TIEMPO: <span id="rover-timer">60</span> s</strong>
          <strong>BATERÍA: <span id="rover-bateria">100</span>%</strong>
          <strong>MUESTRAS: <span id="rover-muestras">0</span>/3</strong>
          <strong>ESCÁNER: <span id="rover-scanner-status">ESPERANDO</span></strong>
        </div>
        <canvas id="canvas-jezero" width="${CW}" height="${CH}"
                style="width:100%; max-width:920px; height:auto; display:block; margin:0 auto; border:4px solid #eab308;"
                aria-label="Corte transversal lateral del cráter Jezero"></canvas>
        <div class="touch-controles" id="rover-controls" aria-label="Controles de exploración" style="margin-top:12px;">
          <button type="button" class="touch-btn" id="rover-left">⬅ IZQUIERDA</button>
          <button type="button" class="touch-btn" id="rover-right">➡ DERECHA</button>
          <button type="button" class="touch-btn" id="rover-jump">⬆ SALTAR</button>
          <button type="button" class="touch-btn" id="rover-scan">📡 ESCANEAR [ESPACIO]</button>
          <button type="button" class="touch-btn" id="rover-extract">⛏ EXTRAER [E]</button>
        </div>
        <div class="paso-nav" style="margin-top:12px;">
          <button type="button" class="btn btn-launch" id="btn-rover-finish">
            ✅ TERMINAR EXPLORACIÓN E IR AL BARRANCO
          </button>
          <button type="button" class="btn btn-secondary" id="btn-rover-abandon"
                  style="border-color: #ef4444; color: #f87171;">
            ⚠ ABANDONAR TRAMO (0 PTS)
          </button>
        </div>
      </div>`;

    const canvas = contenedor.querySelector('#canvas-jezero');
    const ctx = canvas?.getContext('2d');
    if (!ctx || typeof window.Sprites?.dibujarEscenarioMarte !== 'function' ||
      typeof window.Sprites?.dibujarAstronauta !== 'function' ||
      typeof window.Sprites?.dibujarRover !== 'function') {
      errorDependencia(contenedor, 'faltan el contexto 2D o los sprites de exploración.');
      return;
    }

    const escenaInicial = window.Sprites.dibujarEscenarioMarte(ctx, CW, CH, {
      conSubsuelo: true,
      conBase: true
    });
    ySuelo = numeroFinito(escenaInicial, Math.floor(CH * 0.60));
    dan = { x: 135, y: ySuelo - 63, vy: 0, enSuelo: true, direccion: 1, estado: 'quieto' };
    tiempoRestante = 60;
    tiempoJuegoInicio = performance.now();
    ondaEscaner = null;
    extraccion = null;
    mensajesFlotantes = [];
    generarVetas();
    conectarControles(contenedor);
    rafId = requestAnimationFrame(ahora => dibujarExploracion(ahora, ctx, canvas, contenedor));
  }

  function iniciarExploracion(contenedor) {
    if (fase === 'exploracion') return;
    Object.keys(teclas).forEach(tecla => { teclas[tecla] = false; });
    renderExploracion(contenedor);
  }

  function conectarControles(contenedor) {
    const keydown = evento => {
      const codigo = evento.code;
      const esTeclaDeJuego = [
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyE'
      ].includes(codigo);
      if (esTeclaDeJuego) evento.preventDefault();
      if (evento.repeat) return;
      teclas[codigo] = true;
      if (codigo === 'Space') activarEscaner();
      if (codigo === 'KeyE') iniciarExtraccion();
      if (codigo === 'KeyW' || codigo === 'ArrowUp') saltar();
    };
    const keyup = evento => { teclas[evento.code] = false; };
    const clearKeys = () => {
      Object.keys(teclas).forEach(tecla => { teclas[tecla] = false; });
    };
    escuchar(document, 'keydown', keydown);
    escuchar(document, 'keyup', keyup);
    escuchar(window, 'blur', clearKeys);

    const mantenerDireccion = (id, codigo) => {
      const boton = contenedor.querySelector(id);
      escuchar(boton, 'pointerdown', evento => {
        evento.preventDefault();
        teclas[codigo] = true;
      });
      const soltar = evento => {
        evento.preventDefault();
        teclas[codigo] = false;
      };
      escuchar(boton, 'pointerup', soltar);
      escuchar(boton, 'pointerleave', soltar);
      escuchar(boton, 'pointercancel', soltar);
    };
    mantenerDireccion('#rover-left', 'ArrowLeft');
    mantenerDireccion('#rover-right', 'ArrowRight');

    const botonSalto = contenedor.querySelector('#rover-jump');
    escuchar(botonSalto, 'pointerdown', evento => {
      evento.preventDefault();
      saltar();
    });
    escuchar(contenedor.querySelector('#rover-scan'), 'click', activarEscaner);
    escuchar(contenedor.querySelector('#rover-extract'), 'click', iniciarExtraccion);
    escuchar(contenedor.querySelector('#btn-rover-finish'), 'click', () => terminarExploracion(false));
    escuchar(contenedor.querySelector('#btn-rover-abandon'), 'click', () => terminarExploracion(true));
  }

  function saltar() {
    if (fase !== 'exploracion' || !dan.enSuelo) return;
    dan.enSuelo = false;
    dan.vy = -280;
    dan.estado = 'salta';
  }

  function activarEscaner() {
    if (fase !== 'exploracion') return;
    ondaEscaner = { inicio: performance.now(), x: dan.x + 28, y: dan.y + 32 };
    if (window.Sound?.playPulse) window.Sound.playPulse();
  }

  function iniciarExtraccion() {
    if (fase !== 'exploracion' || extraccion) return;
    const ahora = performance.now();
    const objetivo = vetas.find(veta =>
      !veta.extraida &&
      ahora <= veta.reveladaHasta &&
      Math.abs((dan.x + 28) - veta.x) < 85
    );
    if (!objetivo) return;
    extraccion = { veta: objetivo, inicio: ahora };
    if (window.Sound?.playDrill) window.Sound.playDrill();
  }

  function revelarVetas(ahora, radioActual) {
    const escaner = ondaEscaner;
    if (!escaner) return;
    const radar = instrumentosInstalados().includes('radar');
    vetas.forEach(veta => {
      if (veta.extraida || (veta.profunda && !radar)) return;
      const distancia = Math.hypot(veta.x - escaner.x, veta.y - escaner.y);
      if (distancia <= radioActual) veta.reveladaHasta = ahora + 5000;
    });
  }

  function obtenerAlcanceRelay() {
    const mision = estadoMision();
    const relayId = mision?.diseno?.relay || 'ninguno';
    const relay = window.DATA?.relays?.[relayId];
    const cobertura = limitar(relay?.cobertura ?? relay?.cob ?? 0.4, 0, 1);
    return 440 + cobertura * 440;
  }

  function actualizarHud(contenedor, ahora) {
    const hudTiempo = contenedor.querySelector('#rover-timer');
    const hudBateria = contenedor.querySelector('#rover-bateria');
    const hudMuestras = contenedor.querySelector('#rover-muestras');
    const hudEscaner = contenedor.querySelector('#rover-scanner-status');
    const mision = estadoMision();
    tiempoRestante = Math.max(0, 60 - (ahora - tiempoJuegoInicio) / 1000);
    const muestras = limitar(mision?.muestrasRecolectadas, 0, 3);
    const bateria = limitar(mision?.bateriaActual, 0, 100);
    if (hudTiempo) hudTiempo.textContent = String(Math.ceil(tiempoRestante));
    if (hudBateria) hudBateria.textContent = String(Math.round(bateria));
    if (hudMuestras) hudMuestras.textContent = String(muestras);
    if (hudEscaner) {
      const detectadas = vetas.filter(veta => !veta.extraida && ahora <= veta.reveladaHasta).length;
      hudEscaner.textContent = ondaEscaner && ahora - ondaEscaner.inicio < 900
        ? 'BARRIDO ACTIVO'
        : detectadas > 0 ? `${detectadas} VETAS DETECTADAS` : 'ESPERANDO';
    }
  }

  function dibujarVeta(ctx, veta, ahora, tieneRadar, tieneEspectrometro) {
    if (veta.extraida) return;
    const revelada = ahora <= veta.reveladaHasta;
    ctx.save();
    if (!revelada) {
      if (veta.profunda && !tieneRadar) {
        ctx.globalAlpha = 0.42;
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', veta.x, veta.y);
        ctx.font = '9px monospace';
        ctx.fillText('REQUIERE RADAR', veta.x, veta.y + 14);
      }
      ctx.restore();
      return;
    }

    ctx.shadowColor = veta.profunda ? '#38bdf8' : '#facc15';
    ctx.shadowBlur = 14;
    ctx.fillStyle = veta.profunda ? '#38bdf8' : '#facc15';
    ctx.fillRect(veta.x - 10, veta.y - 9, 20, 18);
    ctx.fillStyle = '#fff7ed';
    ctx.fillRect(veta.x - 4, veta.y - 4, 8, 8);
    ctx.shadowBlur = 0;

    if (tieneEspectrometro) {
      ctx.fillStyle = '#fef3c7';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(veta.mineral, veta.x, veta.y - 16);
    }

    if (Math.abs((dan.x + 28) - veta.x) < 85) {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⛏ [E] EXTRAER', veta.x, veta.y + 24);
    }
    ctx.restore();
  }

  function completarExtraccion(ahora) {
    if (!extraccion || ahora - extraccion.inicio < 600) return;
    const veta = extraccion.veta;
    veta.extraida = true;
    veta.reveladaHasta = 0;
    extraccion = null;
    const mision = estadoMision();
    if (mision) {
      mision.muestrasRecolectadas = Math.min(3, limitar(mision.muestrasRecolectadas, 0, 3) + 1);
    }
    mensajesFlotantes.push({ texto: '+1 MUESTRA EXTRAÍDA', x: dan.x + 28, y: dan.y - 10, fin: ahora + 1400 });
    if (window.Sound?.playSample) {
      window.Sound.playSample();
    } else if (window.Sound?.playBeep) {
      window.Sound.playBeep();
    }
    actualizarHud(obtenerContenedor(), ahora);
    actualizarBarraSuperior();
    if ((mision?.muestrasRecolectadas ?? 0) >= 3) terminarExploracion(false);
  }

  function actualizarBarraSuperior() {
    const mision = estadoMision();
    if (!mision || !window.UI?.actualizarBarraRecursos || !mision.evaluacionActual) return;
    window.UI.actualizarBarraRecursos(mision.evaluacionActual, mision);
  }

  function dibujarExtraccion(ctx, ahora) {
    if (!extraccion) return;
    const progreso = limitar((ahora - extraccion.inicio) / 600, 0, 1);
    const xInicio = dan.x + 28;
    const yInicio = dan.y + 26;
    const veta = extraccion.veta;
    ctx.save();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3 + Math.sin(ahora / 45) * 1.5;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(xInicio, yInicio);
    ctx.lineTo(veta.x, veta.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(xInicio - 20, yInicio - 28, 40 * progreso, 5);
    ctx.strokeStyle = '#fff7ed';
    ctx.strokeRect(xInicio - 20, yInicio - 28, 40, 5);
    ctx.restore();
  }

  function dibujarMensajes(ctx, ahora) {
    mensajesFlotantes = mensajesFlotantes.filter(mensaje => mensaje.fin > ahora);
    mensajesFlotantes.forEach(mensaje => {
      const progreso = 1 - (mensaje.fin - ahora) / 1400;
      ctx.save();
      ctx.globalAlpha = limitar(1 - progreso, 0, 1);
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px "Press Start 2P", monospace';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(mensaje.texto, mensaje.x, mensaje.y - progreso * 24);
      ctx.restore();
    });
  }

  function dibujarExploracion(ahora, ctx, canvas, contenedor) {
    if (fase !== 'exploracion') return;
    const dt = Math.min(0.05, Math.max(0, (ahora - (dibujarExploracion.ultimoFrame || ahora)) / 1000));
    dibujarExploracion.ultimoFrame = ahora;
    const desplazamiento = (teclas.ArrowRight || teclas.KeyD ? 1 : 0) -
      (teclas.ArrowLeft || teclas.KeyA ? 1 : 0);
    if (desplazamiento !== 0) {
      dan.x += desplazamiento * 230 * dt;
      dan.direccion = desplazamiento;
      if (dan.enSuelo) dan.estado = Math.floor(ahora / 140) % 2 === 0 ? 'camina1' : 'camina2';
    } else if (dan.enSuelo) {
      dan.estado = 'quieto';
    }
    dan.x = Math.max(30, Math.min(CW - 65, dan.x));

    if (!dan.enSuelo) {
      dan.vy += 540 * dt;
      dan.y += dan.vy * dt;
      if (dan.y >= ySuelo - 63) {
        dan.y = ySuelo - 63;
        dan.vy = 0;
        dan.enSuelo = true;
        dan.estado = desplazamiento === 0
          ? 'quieto'
          : Math.floor(ahora / 140) % 2 === 0 ? 'camina1' : 'camina2';
      }
    }

    const sprites = window.Sprites;
    const sueloFrame = sprites.dibujarEscenarioMarte(ctx, CW, CH, {
      conSubsuelo: true,
      conBase: true
    });
    ySuelo = numeroFinito(sueloFrame, ySuelo);

    const instrumentos = instrumentosInstalados();
    const tieneRadar = instrumentos.includes('radar');
    const tieneEspectrometro = instrumentos.includes('espectrometro');
    if (ondaEscaner) {
      const edad = ahora - ondaEscaner.inicio;
      const radioBase = instrumentos.includes('camaraAlta') ? 280 : 185;
      const radioActual = radioBase * limitar(edad / 900, 0, 1);
      revelarVetas(ahora, radioActual);
      if (edad >= 900) ondaEscaner = null;
    }
    vetas.forEach(veta => dibujarVeta(ctx, veta, ahora, tieneRadar, tieneEspectrometro));

    sprites.dibujarRover(ctx, 28, ySuelo - 49, 3.5, false);
    sprites.dibujarAstronauta(ctx, 'dan', dan.x, dan.y, {
      escala: 3.5,
      estado: dan.estado,
      voltear: dan.direccion < 0,
      mostrarNombre: true
    });
    sprites.dibujarAstronauta(ctx, 'ana', 590, ySuelo - 63, {
      escala: 3.5, estado: 'quieto', voltear: true, mostrarNombre: true
    });
    sprites.dibujarAstronauta(ctx, 'leo', 700, ySuelo - 63, {
      escala: 3.5, estado: 'quieto', voltear: true, mostrarNombre: true
    });
    sprites.dibujarAstronauta(ctx, 'maya', 810, ySuelo - 63, {
      escala: 3.5, estado: 'quieto', voltear: true, mostrarNombre: true
    });

    if (ondaEscaner) {
      const edad = ahora - ondaEscaner.inicio;
      const radioBase = instrumentos.includes('camaraAlta') ? 280 : 185;
      const radio = radioBase * limitar(edad / 900, 0, 1);
      ctx.save();
      ctx.strokeStyle = `rgba(34, 197, 94, ${Math.max(0.2, 1 - edad / 1200)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ondaEscaner.x, ondaEscaner.y, radio, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    dibujarExtraccion(ctx, ahora);
    dibujarMensajes(ctx, ahora);
    const alcanceRelay = obtenerAlcanceRelay();
    if (dan.x > alcanceRelay && Math.floor(ahora / 400) % 2 === 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px "Press Start 2P", monospace';
      ctx.fillStyle = '#f87171';
      ctx.fillText('⚠ SEÑAL RELAY DÉBIL', CW / 2, 26);
      ctx.restore();
    }

    actualizarHud(contenedor, ahora);
    completarExtraccion(ahora);
    if (fase !== 'exploracion') return;
    if (tiempoRestante <= 0) {
      terminarExploracion(false);
      return;
    }
    rafId = requestAnimationFrame(siguiente => dibujarExploracion(siguiente, ctx, canvas, contenedor));
  }

  function terminarExploracion(abandonar) {
    if (fase !== 'exploracion') return;
    const mision = estadoMision();
    if (abandonar && mision) {
      const tramosSaltados = numeroFinito(mision.tramosSaltados, 0);
      mision.tramosSaltados = Math.max(0, tramosSaltados) + 1;
      mision.muestrasRecolectadas = 0;
      mision.edlPuntos = 0;
      mision.edlPrecision = 0;
      const historial = Array.isArray(mision.historialCausaEfecto) ? mision.historialCausaEfecto : [];
      const edl = [...historial].reverse().find(item =>
        item?.etapa === '3. Entrada, Descenso y Aterrizaje (EDL)'
      );
      if (edl) {
        edl.consecuencia = 'Precisión EDL: 0/150 pts (tramo abandonado)';
        edl.explicacion = 'El jugador abandonó la exploración y perdió los puntos del aterrizaje.';
      }
      registrarHistorial(
        'Cráter Jezero',
        'Tramo de exploración abandonado',
        '0 muestras y 0 pts EDL; penalización de 60 pts en decisiones',
        'El abandono anuló las muestras y la puntuación del tramo de aterrizaje.'
      );
      irAlReporte();
      return;
    }

    detenerBucles();
    const contenedor = obtenerContenedor();
    if (!contenedor) return;

    renderDecision3(contenedor);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  3. DECISIÓN 3: El Barranco Inexplorado de Jezero
  // ─────────────────────────────────────────────────────────────────────────
  function renderDecision3(contenedor) {
    fase = 'decision3';
    detenerBucles();
    contenedor.classList.remove('tormenta-polvo');

    const mision = estadoMision();
    const muestras = mision?.muestrasRecolectadas || 0;
    const bateria = Math.round(limitar(mision?.bateriaActual, 0, 100));
    const relayId = mision?.diseno?.relay || 'ninguno';
    const tieneRelay = relayId !== 'ninguno';
    const instrumentos = instrumentosInstalados();
    const tieneTaladro = instrumentos.includes('taladro');

    contenedor.innerHTML = `
      <div class="marco-nasa" id="escena-decision3-box" style="width:95vw; max-width:1380px; margin:12px auto; text-align:left; padding:22px;">
        <span class="badge-tag" style="background:#fc3d21; color:#fff; border-color:#090d16;">FASE 5 · DECISIÓN CRÍTICA EN JEZERO</span>
        <h1 style="color:#fde047; font-size:1.05rem; margin:10px 0 8px;">
          🧗 Decisión 3: El Barranco Inexplorado de Jezero
        </h1>
        <p style="text-align:left; margin-bottom:14px; font-size:1rem; line-height:1.45; color:#f8fafc;">
          Dan y la tripulación han explorado el lecho del cráter Jezero, pero los sensores detectan una falla geológica profunda al borde del barranco con posibles depósitos hidrotermales. La ventana de retorno hacia la Tierra se aproxima rápidamente.
        </p>

        <div class="resumen-muestras" style="margin-bottom: 18px; display: block; font-family:'Press Start 2P', monospace; font-size:0.65rem; color:#22c55e; padding:10px 14px; background:#090d16; border:2px solid #22c55e;">
          📦 Muestras minerales recolectadas: ${muestras}/3  ·  ⚡ Batería rover: ${bateria}%
        </div>

        <div class="cards-grid" style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 16px; width:100%;">
          <div class="decision-card" id="card-dec3-retirada" style="background:#f8fafc; color:#090d16; border:3px solid #0b3d91; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 0 #090d16;">
            <div>
              <div style="font-family:'Press Start 2P', monospace; font-size:0.68rem; color:#0b3d91; margin-bottom:10px;">
                🛡️ OPCIÓN 1: RETIRADA SEGURA
              </div>
              <p style="font-size:0.95rem; margin-bottom:12px; color:#1e293b; line-height:1.4;">
                Asegurar las muestras actuales y dirigirse de inmediato a la plataforma de despegue para garantizar el ascenso nominal a órbita.
              </p>
              <div style="font-size:0.9rem; color:#15803d; font-weight:bold; margin-bottom:14px;">
                Impacto: +75 pts en decisiones · 0% riesgo tripulación
              </div>
            </div>
            <button type="button" class="btn btn-launch" id="btn-dec3-retirada" style="width:100%; font-size:0.62rem; padding:12px;">
              ELEGIR RETIRADA SEGURA
            </button>
          </div>

          <div class="decision-card" id="card-dec3-relay" style="background:#f8fafc; color:#090d16; border:3px solid #0b3d91; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 0 #090d16;">
            <div>
              <div style="font-family:'Press Start 2P', monospace; font-size:0.68rem; color:#0b3d91; margin-bottom:10px;">
                🛰️ OPCIÓN 2: MAPEO POR RELAY
              </div>
              <p style="font-size:0.95rem; margin-bottom:12px; color:#1e293b; line-height:1.4;">
                Utilizar el satélite Relay en órbita para realizar un barrido de radar y telemetría del barranco sin arriesgar al rover en la pendiente.
              </p>
              <div style="font-size:0.9rem; color:${tieneRelay ? '#15803d' : '#b91c1c'}; font-weight:bold; margin-bottom:14px;">
                ${tieneRelay ? '✓ Satélite Relay en órbita activo (+75 pts)' : '✗ Sin satélite Relay instalado (0 pts)'}
              </div>
            </div>
            <button type="button" class="btn btn-launch" id="btn-dec3-relay" style="width:100%; font-size:0.62rem; padding:12px;">
              ELEGIR MAPEO RELAY
            </button>
          </div>

          <div class="decision-card" id="card-dec3-extraccion" style="background:#f8fafc; color:#090d16; border:3px solid #0b3d91; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 0 #090d16;">
            <div>
              <div style="font-family:'Press Start 2P', monospace; font-size:0.68rem; color:#0b3d91; margin-bottom:10px;">
                ⛏️ OPCIÓN 3: EXTRACCIÓN AL LÍMITE
              </div>
              <p style="font-size:0.95rem; margin-bottom:12px; color:#1e293b; line-height:1.4;">
                Descender con el taladro profundo hacia el fondo del barranco para intentar una última extracción de roca basal antes del encendido.
              </p>
              <div style="font-size:0.9rem; color:${tieneTaladro ? (bateria > 25 ? '#15803d' : '#b45309') : '#b91c1c'}; font-weight:bold; margin-bottom:14px;">
                ${tieneTaladro ? (bateria > 25 ? '✓ Taladro y batería óptimos (+75 pts)' : '⚠ Taladro activo con batería baja (+40 pts)') : '✗ Sin taladro geológico profundo (0 pts)'}
              </div>
            </div>
            <button type="button" class="btn btn-launch" id="btn-dec3-extraccion" style="width:100%; font-size:0.62rem; padding:12px;">
              ELEGIR EXTRACCIÓN LÍMITE
            </button>
          </div>
        </div>
      </div>
    `;

    function elegirOpcion(opcion) {
      if (fase !== 'decision3') return;
      limpiarListeners();
      if (mision) {
        mision.decision3 = opcion;
        if (opcion === 'retirada_segura') {
          mision.decision3Fallo = false;
          registrarHistorial(
            'Cráter Jezero',
            'Despegue y retirada segura con muestras',
            muestras === 0
              ? 'Dan regresó sin muestras minerales del cráter'
              : `${muestras}/3 muestras recolectadas del subsuelo marciano`,
            'La tripulación aseguró las muestras recogidas y se preparó para el ascenso interplanetario.'
          );
        } else if (opcion === 'relay_equipo') {
          mision.decision3Fallo = !tieneRelay;
          registrarHistorial(
            'Cráter Jezero',
            'Mapeo y triangulación mediante satélite relay',
            tieneRelay
              ? 'Mapeo orbital exitoso (+75 pts en decisiones)'
              : 'Fallo de enlace: sin satélite relay en órbita (0 pts)',
            tieneRelay
              ? 'El satélite de retransmisión completó la telemetría del barranco sin arriesgar al rover.'
              : 'La falta de cobertura orbital impidió recibir datos del fondo del barranco.'
          );
        } else if (opcion === 'extraccion_limite') {
          const fallo = !tieneTaladro || bateria <= 25;
          mision.decision3Fallo = fallo;
          registrarHistorial(
            'Cráter Jezero',
            'Incursión y extracción en el barranco profundo',
            tieneTaladro
              ? (bateria > 25 ? 'Extracción hidrotermal exitosa (+75 pts)' : 'Riesgo y sobreesfuerzo de batería (+40 pts)')
              : 'Fallo técnico: sin taladro adecuado para roca profunda (0 pts)',
            tieneTaladro
              ? 'El instrumental resistió la perforación en el fondo de la falla geológica.'
              : 'El rover no disponía del taladro geológico necesario para la dureza del lecho.'
          );
        }
      }
      actualizarBarraSuperior();
      renderAscensoMarte(contenedor);
    }

    escuchar(contenedor.querySelector('#btn-dec3-retirada'), 'click', () => elegirOpcion('retirada_segura'));
    escuchar(contenedor.querySelector('#btn-dec3-relay'), 'click', () => elegirOpcion('relay_equipo'));
    escuchar(contenedor.querySelector('#btn-dec3-extraccion'), 'click', () => elegirOpcion('extraccion_limite'));
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  4. DESPEGUE Y ASCENSO DESDE MARTE (Escena 6.1)
  // ─────────────────────────────────────────────────────────────────────────
  function renderAscensoMarte(contenedor) {
    fase = 'ascenso-marte';
    detenerBucles();
    contenedor.classList.remove('tormenta-polvo');

    const mision = estadoMision();
    const muestras = mision?.muestrasRecolectadas || 0;

    contenedor.innerHTML = `
      <div class="marco-nasa fase-lanzamiento" id="retorno-ascenso" style="width:95vw; max-width:1380px; margin:12px auto; padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:8px; border-bottom:2px solid #ca8a04; padding-bottom:8px;">
          <span class="badge-tag" style="background:#fc3d21; color:#f8fafc; border:2px solid #090d16; font-size:0.62rem; font-weight:bold; margin:0;">
            FASE 6.1 · DESPEGUE DE MARTE
          </span>
          <h1 style="margin:0; font-family:'Press Start 2P', monospace; font-size:0.95rem; color:#fde047; letter-spacing:1px;">
            LANZAMIENTO · ASCENSO ORBITAL
          </h1>
          <span class="badge-tag" style="background:#090d16; color:#fef08a; border:2px solid #eab308; font-size:0.68rem; margin:0;">
            TIEMPO: <span id="ascent-time">00:12</span>
          </span>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px; font-family:'Press Start 2P', monospace; font-size:0.6rem;">
          <span style="color:#22c55e;">✓ Muestras a bordo: ${muestras}/3  ·  Destino: Tierra</span>
          <span style="background:#090d16; padding:6px 12px; border:2px solid #eab308; color:#fde047;">
            Bono de lanzamiento: <span id="ascent-score">0</span> / 100 pts
          </span>
        </div>

        <div style="display:grid; grid-template-columns: 200px 1fr; gap:18px; align-items:stretch;">
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:space-between; background:#090d16; border:3px solid #eab308; padding:12px;">
            <div style="font-family:'Press Start 2P', monospace; font-size:0.68rem; color:#fde047; text-align:center;">
              EMPUJE
            </div>

            <div style="position:relative; width:54px; height:210px; background:#1e293b; border:2px solid #475569; margin:10px 0; overflow:hidden;">
              <span style="position:absolute; top:2px; right:3px; font-size:9px; font-family:monospace; color:#94a3b8; z-index:2;">100%</span>
              <span style="position:absolute; top:28px; right:3px; font-size:9px; font-family:monospace; color:#22c55e; z-index:2;">85%</span>
              <span style="position:absolute; bottom:80px; right:3px; font-size:9px; font-family:monospace; color:#22c55e; z-index:2;">60%</span>
              <span style="position:absolute; bottom:2px; right:3px; font-size:9px; font-family:monospace; color:#94a3b8; z-index:2;">0</span>
              <div style="position:absolute; bottom:60%; height:25%; width:100%; background:rgba(34, 197, 94, 0.45); border-top:2px dashed #22c55e; border-bottom:2px dashed #22c55e;"></div>
              <div id="ascent-fill" style="position:absolute; bottom:0; width:100%; height:50%; background:linear-gradient(to top, #0284c7, #38bdf8);"></div>
              <div id="ascent-needle" style="position:absolute; bottom:50%; left:2px; width:12px; height:0; border-top:6px solid transparent; border-bottom:6px solid transparent; border-left:10px solid #facc15; z-index:3; transform:translateY(6px);"></div>
            </div>

            <div id="ascent-meter-label" style="font-family:'Press Start 2P', monospace; font-size:0.58rem; color:#38bdf8; text-align:center; min-height:18px;">
              ESTABLE · 50%
            </div>

            <button type="button" class="btn btn-launch" id="btn-ascent-thrust" aria-pressed="false"
                    style="width:100%; min-height:54px; font-size:0.65rem; padding:10px 6px; line-height:1.35; margin-top:8px;">
              🔥 MANTENER<br>EMPUJE
            </button>
          </div>

          <div style="width:100%;">
            <canvas id="canvas-ascent" width="820" height="400"
                    style="display:block; width:100%; height:auto; border:4px solid #eab308; outline:2px solid #090d16;"
                    aria-label="Cohete Ares-I despegando desde la superficie marciana rumbo a la Tierra"></canvas>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-top:12px; gap:8px;">
          <p class="briefing-caption" style="margin:0; font-size:0.85rem; color:#f8fafc;">
            Mantén presionado [ESPACIO], [W] o el botón para sostener el empuje en la zona verde (60%–85%).
          </p>
          <button type="button" class="btn btn-secondary" id="btn-ascent-skip" style="font-size:0.65rem; padding:10px 18px;">
            ⏭ SALTAR A TRAYECTORIA
          </button>
        </div>
      </div>`;

    const canvas = contenedor.querySelector('#canvas-ascent');
    const ctx = canvas?.getContext('2d');
    const sprites = window.Sprites;
    if (!ctx || typeof sprites?.dibujarEscenarioRegresoMarte !== 'function') {
      renderCinematicaInterplanetaria(contenedor);
      return;
    }

    const cW = canvas.width;
    const cH = canvas.height;
    const duration = 12;
    let elapsed = 0;
    let greenTime = 0;
    let power = 50;
    let thrusting = false;
    let previousTime = performance.now();

    const hudTime = contenedor.querySelector('#ascent-time');
    const hudScore = contenedor.querySelector('#ascent-score');
    const meterLabel = contenedor.querySelector('#ascent-meter-label');
    const meterFill = contenedor.querySelector('#ascent-fill');
    const needle = contenedor.querySelector('#ascent-needle');
    const btnThrust = contenedor.querySelector('#btn-ascent-thrust');
    const btnSkip = contenedor.querySelector('#btn-ascent-skip');

    const setThrust = pressed => {
      thrusting = pressed;
      btnThrust?.setAttribute('aria-pressed', String(pressed));
      if (pressed) {
        window.Sound?.startThruster?.(power / 100);
      } else {
        window.Sound?.stopThruster?.();
      }
    };

    const onKeyDown = e => {
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault();
        setThrust(true);
      }
    };
    const onKeyUp = e => {
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        setThrust(false);
      }
    };
    escuchar(document, 'keydown', onKeyDown);
    escuchar(document, 'keyup', onKeyUp);
    escuchar(window, 'blur', () => setThrust(false));

    escuchar(btnThrust, 'pointerdown', e => { e.preventDefault(); setThrust(true); });
    escuchar(btnThrust, 'pointerup', () => setThrust(false));
    escuchar(btnThrust, 'pointerleave', () => setThrust(false));
    escuchar(btnThrust, 'pointercancel', () => setThrust(false));
    escuchar(btnThrust, 'mousedown', e => { e.preventDefault(); setThrust(true); });
    escuchar(window, 'mouseup', () => setThrust(false));

    escuchar(btnSkip, 'click', () => {
      finalizarAscenso();
    });

    function finalizarAscenso() {
      if (fase !== 'ascenso-marte') return;
      if (window.Sound?.stopThruster) window.Sound.stopThruster();
      detenerBucles();
      const score = Math.min(100, Math.round((greenTime / duration) * 100));
      const m = estadoMision();
      if (m) {
        m.regresoLanzamientoBonus = score;
        registrarHistorial(
          '6. Ascenso y Escape de Marte',
          `Ascenso orbital modulado (${score}/100 pts)`,
          `Bono de escape marciano: ${score}/100 pts`,
          score >= 70
            ? 'La inyección terrestre fue de alta precisión, maximizando el ahorro de propelente.'
            : 'El ascenso orbital alcanzó la velocidad de escape mínima para la ventana hacia la Tierra.'
        );
      }
      actualizarBarraSuperior();
      renderCinematicaInterplanetaria(contenedor);
    }

    function loopAscenso(now) {
      if (fase !== 'ascenso-marte') return;
      const dt = Math.min(0.05, Math.max(0, (now - previousTime) / 1000));
      previousTime = now;
      elapsed += dt;

      if (thrusting) {
        power = Math.min(100, power + 65 * dt);
        if (window.Sound?.updateThruster) window.Sound.updateThruster(power / 100);
      } else {
        power = Math.max(0, power - 52 * dt);
      }

      if (power >= 60 && power <= 85) {
        greenTime += dt;
      }

      const score = Math.min(100, Math.round((greenTime / duration) * 100));
      const secRem = Math.max(0, duration - elapsed);
      const secStr = secRem < 10 ? '0' + Math.floor(secRem) : String(Math.floor(secRem));

      if (hudTime) hudTime.textContent = `00:${secStr}`;
      if (hudScore) hudScore.textContent = String(score);
      if (meterFill) meterFill.style.height = `${power}%`;
      if (needle) needle.style.bottom = `${power}%`;

      if (meterLabel) {
        if (power >= 60 && power <= 85) {
          meterLabel.textContent = `ESTABLE · ${Math.round(power)}%`;
          meterLabel.style.color = '#22c55e';
        } else if (power < 60) {
          meterLabel.textContent = `BAJO · ${Math.round(power)}%`;
          meterLabel.style.color = '#ef4444';
        } else {
          meterLabel.textContent = `EXCESO · ${Math.round(power)}%`;
          meterLabel.style.color = '#f59e0b';
        }
      }

      const suelo = sprites.dibujarEscenarioRegresoMarte(ctx, cW, cH);

      const xPlat = Math.floor(cW * 0.42);
      const progreso = Math.min(1, elapsed / duration);
      const alturaSubida = Math.pow(progreso, 1.4) * (cH + 120);
      const yCohete = suelo - 18 - alturaSubida;

      ctx.save();
      for (let hi = 0; hi < 16; hi++) {
        const hRad = 14 + (elapsed * 4 + hi * 3) % 32;
        const hOffset = Math.sin(now / 140 + hi) * 52;
        ctx.fillStyle = hi % 2 === 0 ? 'rgba(148, 163, 184, 0.45)' : 'rgba(71, 85, 85, 0.55)';
        ctx.beginPath();
        ctx.arc(xPlat + hOffset, suelo - 8 - (hi % 3) * 6, hRad, 0, Math.PI * 2);
        ctx.fill();
      }

      const llamaLargo = 36 + Math.random() * 18;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(xPlat - 13, yCohete + 62);
      ctx.lineTo(xPlat, yCohete + 62 + llamaLargo);
      ctx.lineTo(xPlat + 13, yCohete + 62);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(xPlat - 8, yCohete + 62);
      ctx.lineTo(xPlat, yCohete + 62 + llamaLargo * 0.65);
      ctx.lineTo(xPlat + 8, yCohete + 62);
      ctx.closePath();
      ctx.fill();

      // Cohete a mayor escala (30x62)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(xPlat - 15, yCohete, 30, 62);
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2;
      ctx.strokeRect(xPlat - 15, yCohete, 30, 62);

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(xPlat - 15, yCohete + 20, 30, 10);
      ctx.fillStyle = '#0b3d91';
      ctx.beginPath();
      ctx.arc(xPlat, yCohete + 10, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(xPlat - 15, yCohete);
      ctx.lineTo(xPlat, yCohete - 26);
      ctx.lineTo(xPlat + 15, yCohete);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(xPlat - 23, yCohete + 42, 8, 20);
      ctx.fillRect(xPlat + 15, yCohete + 42, 8, 20);
      ctx.strokeRect(xPlat - 23, yCohete + 42, 8, 20);
      ctx.strokeRect(xPlat + 15, yCohete + 42, 8, 20);
      ctx.restore();

      if (elapsed >= duration) {
        finalizarAscenso();
        return;
      }

      rafId = requestAnimationFrame(loopAscenso);
    }

    rafId = requestAnimationFrame(loopAscenso);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  5. CINEMÁTICA INTERPLANETARIA (920x420): Trayectoria Marte ➔ Tierra
  // ─────────────────────────────────────────────────────────────────────────
  function renderCinematicaInterplanetaria(contenedor) {
    fase = 'cinematica-retorno';
    detenerBucles();
    contenedor.classList.remove('tormenta-polvo');

    contenedor.innerHTML = `
      <div class="marco-nasa" id="escena-cinematica-box" style="width:95vw; max-width:1380px; margin:12px auto; text-align:center; padding:18px;">
        <span class="badge-tag" style="background:#fc3d21; color:#ffffff; border-color:#090d16; font-size:0.62rem;">
          FASE 6.2 · VIAJE INTERPLANETARIO DE RETORNO
        </span>
        <h1 style="color:#fde047; font-size:1.02rem; margin:8px 0 8px; letter-spacing:1px;">
          🛰️ EN RUTA A LA TIERRA (<span id="cine-segundos">4.0</span> s)
        </h1>
        <p class="briefing-caption" style="margin-bottom:10px; font-size:0.9rem; color:#f8fafc;">
          La nave Ares-I recorre la trayectoria de transferencia orbital hacia el sistema Tierra-Luna.
        </p>

        <canvas id="canvas-cinematica" width="${CW}" height="${CH}"
                style="display:block; margin:0 auto; width:100%; max-width:920px; height:auto; border:4px solid #eab308; outline:2px solid #090d16;"
                aria-label="Animación del viaje de retorno desde Marte hasta la Tierra por la ruta orbital"></canvas>

        <div style="margin-top:12px; display:flex; justify-content:center;">
          <button type="button" class="btn btn-secondary" id="btn-skip-cinematica" style="font-size:0.65rem; padding:10px 20px;">
            ⏭ SALTAR A AMERIZAJE
          </button>
        </div>
      </div>`;

    const canvas = contenedor.querySelector('#canvas-cinematica');
    const ctx = canvas?.getContext('2d');
    const cineSegundos = contenedor.querySelector('#cine-segundos');
    const btnSkip = contenedor.querySelector('#btn-skip-cinematica');

    if (!ctx) {
      renderAmerizaje(contenedor);
      return;
    }

    const duration = 4.0;
    let elapsed = 0;
    let previous = performance.now();

    escuchar(btnSkip, 'click', () => {
      finalizarCinematica();
    });

    function finalizarCinematica() {
      if (fase !== 'cinematica-retorno') return;
      detenerBucles();
      renderAmerizaje(contenedor);
    }

    const p0 = { x: 115, y: CH - 85 };
    const p1 = { x: CW * 0.48, y: 40 };
    const p2 = { x: CW - 115, y: 90 };

    function bezier(t, a, b, c) {
      const inv = 1 - t;
      return inv * inv * a + 2 * inv * t * b + t * t * c;
    }

    function loopCinematica(now) {
      if (fase !== 'cinematica-retorno') return;
      const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000));
      previous = now;
      elapsed += dt;

      const t = Math.min(1, elapsed / duration);
      const rem = Math.max(0, duration - elapsed);
      if (cineSegundos) cineSegundos.textContent = rem.toFixed(1);

      ctx.save();
      ctx.fillStyle = '#050814';
      ctx.fillRect(0, 0, CW, CH);

      const neb = ctx.createRadialGradient(CW * 0.5, CH * 0.5, 20, CW * 0.5, CH * 0.5, 320);
      neb.addColorStop(0, 'rgba(168, 85, 247, 0.14)');
      neb.addColorStop(0.5, 'rgba(56, 189, 248, 0.08)');
      neb.addColorStop(1, 'transparent');
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, CW, CH);

      for (let si = 0; si < 65; si++) {
        const sx = (si * 43 + 19) % CW;
        const sy = (si * 31 + 11) % CH;
        ctx.fillStyle = si % 3 === 0 ? '#fef08a' : '#f8fafc';
        ctx.fillRect(sx, sy, 2, 2);
      }

      ctx.save();
      ctx.setLineDash([7, 7]);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
      ctx.stroke();
      ctx.restore();

      // Marte
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(p0.x, p0.y, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(p0.x - 10, p0.y + 8, 14, 0, Math.PI * 2);
      ctx.arc(p0.x + 14, p0.y - 12, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MARTE', p0.x, p0.y + 62);

      // Tierra
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(p2.x, p2.y, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(p2.x - 22, p2.y - 16, 16, 16);
      ctx.fillRect(p2.x - 10, p2.y + 3, 12, 16);
      ctx.fillRect(p2.x + 5, p2.y - 20, 14, 12);
      ctx.fillRect(p2.x + 10, p2.y - 7, 12, 18);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(p2.x - 14, p2.y - 38, 28, 7);
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TIERRA', p2.x, p2.y + 62);

      const shipX = bezier(t, p0.x, p1.x, p2.x);
      const shipY = bezier(t, p0.y, p1.y, p2.y);

      for (let si = 1; si <= 6; si++) {
        const trailT = Math.max(0, t - si * 0.025);
        const tx = bezier(trailT, p0.x, p1.x, p2.x);
        const ty = bezier(trailT, p0.y, p1.y, p2.y);
        ctx.fillStyle = `rgba(56, 189, 248, ${0.85 - si * 0.13})`;
        ctx.beginPath();
        ctx.arc(tx, ty, 6 - si * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(shipX, shipY);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-8, -3, 16, 5);
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      if (elapsed >= duration) {
        finalizarCinematica();
        return;
      }

      rafId = requestAnimationFrame(loopCinematica);
    }

    rafId = requestAnimationFrame(loopCinematica);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  6. AMERIZAJE EN LA TIERRA CON FRENO FUNCIONAL + RESCATE EN HELICÓPTERO
  // ─────────────────────────────────────────────────────────────────────────
  function renderAmerizaje(contenedor) {
    fase = 'amerizaje';
    detenerBucles();
    contenedor.classList.remove('tormenta-polvo');

    const mision = estadoMision();
    const muestras = mision?.muestrasRecolectadas || 0;

    contenedor.innerHTML = `
      <div class="marco-nasa" id="escena-amerizaje-box" style="width:95vw; max-width:1380px; margin:12px auto; text-align:center; padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:8px; border-bottom:2px solid #ca8a04; padding-bottom:8px;">
          <span class="badge-tag" style="background:#fc3d21; color:#fff; border-color:#090d16; margin:0;">
            FASE 6.3 · REENTRADA Y AMERIZAJE
          </span>
          <div style="font-family:'Press Start 2P', monospace; font-size:0.6rem; color:#22c55e;">
            ✓ Muestras a bordo: ${muestras}/3  ·  Tripulación: 4/4
          </div>
        </div>

        <h1 style="color:#fde047; font-size:1rem; margin:6px 0 8px; letter-spacing:1px;">
          ✦ ATERRIZAJE EN LA TIERRA ✦
        </h1>

        <div class="edl-hud" id="hud-amerizaje" style="margin:6px 0 10px;">
          <strong>ALTITUD: <span id="amer-altitud">55.0</span> m</strong>
          <strong>VELOCIDAD: <span id="amer-velocidad" style="color:#facc15;">4.5 m/s</span></strong>
          <strong>BATERÍA: <span id="amer-bateria">${Math.round(mision?.bateriaActual ?? 100)}</span>%</strong>
          <strong>TIEMPO: <span id="amer-tiempo">15.0</span> s</strong>
        </div>

        <canvas id="canvas-amerizaje" width="${CW}" height="${CH}"
                style="display:block; margin:0 auto; width:100%; max-width:920px; height:auto; border:4px solid #eab308; outline:2px solid #090d16;"
                aria-label="Cápsula de Ares-I amerizando en el océano junto al barco de rescate de la NASA"></canvas>

        <div id="amerizaje-controles" style="margin-top:12px; display:flex; justify-content:center; gap:14px; flex-wrap:wrap;">
          <button type="button" class="btn btn-launch" id="btn-amer-brake" aria-pressed="false"
                  style="min-height:50px; font-size:0.72rem; padding:10px 24px;">
            🔥 FRENAR RETROPROPULSORES [W / ↑]
          </button>
          <button type="button" class="btn btn-secondary" id="btn-amer-skip" style="min-height:50px; font-size:0.65rem;">
            ⏭ AMERIZAJE INMEDIATO
          </button>
        </div>
        <p class="briefing-caption" id="amer-caption" style="margin-top:8px; font-size:0.85rem; color:#f8fafc;">
          Mantén presionado <strong>[W]</strong>, <strong>[Flecha Arriba]</strong> o el botón para reducir la velocidad a <strong>≤ 2.5 m/s</strong> antes de tocar el mar.
        </p>
      </div>`;

    const canvas = contenedor.querySelector('#canvas-amerizaje');
    const ctx = canvas?.getContext('2d');
    const sprites = window.Sprites;

    if (!ctx || typeof sprites?.dibujarEscenarioAmerizaje !== 'function') {
      irACelebracion();
      return;
    }

    let altitud = 55;
    let vy = 4.5;
    const limiteTiempo = 15;
    let transcurrido = 0;
    let anterior = performance.now();
    let frenando = false;

    const hudAltitud = contenedor.querySelector('#amer-altitud');
    const hudVelocidad = contenedor.querySelector('#amer-velocidad');
    const hudBateria = contenedor.querySelector('#amer-bateria');
    const hudTiempo = contenedor.querySelector('#amer-tiempo');
    const btnBrake = contenedor.querySelector('#btn-amer-brake');
    const btnSkip = contenedor.querySelector('#btn-amer-skip');

    const setFrenando = estadoFreno => {
      frenando = estadoFreno;
      if (btnBrake) {
        btnBrake.setAttribute('aria-pressed', String(estadoFreno));
        btnBrake.style.transform = estadoFreno ? 'scale(0.97)' : 'scale(1)';
      }
    };

    const onKeyDown = e => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') {
        e.preventDefault();
        setFrenando(true);
      }
    };
    const onKeyUp = e => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') {
        setFrenando(false);
      }
    };
    escuchar(document, 'keydown', onKeyDown);
    escuchar(document, 'keyup', onKeyUp);
    escuchar(window, 'blur', () => setFrenando(false));

    escuchar(btnBrake, 'pointerdown', e => { e.preventDefault(); setFrenando(true); });
    escuchar(btnBrake, 'pointerup', () => setFrenando(false));
    escuchar(btnBrake, 'pointerleave', () => setFrenando(false));
    escuchar(btnBrake, 'pointercancel', () => setFrenando(false));
    escuchar(btnBrake, 'mousedown', e => { e.preventDefault(); setFrenando(true); });
    escuchar(window, 'mouseup', () => setFrenando(false));
    escuchar(btnBrake, 'touchstart', e => { e.preventDefault(); setFrenando(true); }, { passive: false });
    escuchar(btnBrake, 'touchend', () => setFrenando(false));

    escuchar(btnSkip, 'click', () => {
      iniciarRescateHelicoptero(vy);
    });

    function irACelebracion() {
      if (window.Sound?.stopHelicopter) window.Sound.stopHelicopter();
      detenerBucles();
      if (window.UI?.cambiarEscena) {
        window.UI.cambiarEscena('celebration');
      } else {
        const c1 = document.getElementById('escena-rover');
        const c2 = document.getElementById('escena-celebration');
        c1?.classList.remove('activa');
        c2?.classList.add('activa');
        window.CelebrationScene?.iniciar();
      }
    }

    function iniciarRescateHelicoptero(velocidadImpacto) {
      if (fase !== 'amerizaje') return;
      if (window.Sound?.stopThruster) window.Sound.stopThruster();
      if (window.Sound?.startHelicopter) window.Sound.startHelicopter();
      detenerBucles();
      fase = 'rescate-helicoptero';

      const vyFinal = Math.max(0, numeroFinito(velocidadImpacto, 2.5));
      const puntos = vyFinal <= 2.5 ? 150 : (vyFinal <= 6.0 ? 60 : 0);
      const estado = vyFinal <= 2.5 ? 'suave' : (vyFinal <= 6.0 ? 'brusco' : 'chocado');

      if (mision) {
        mision.amerizajePuntos = puntos;
        registrarHistorial(
          '6. Amerizaje y Rescate en el Océano',
          `Amerizaje a ${vyFinal.toFixed(1)} m/s (${puntos}/150 pts)`,
          `Rescate aéreo exitoso: ${puntos}/150 pts (${estado})`,
          puntos === 150
            ? 'La cápsula tocó el mar a velocidad nominal; el helicóptero de la NASA evacuó a los 4 astronautas hacia el buque.'
            : puntos === 60
              ? 'Amerizaje con fuerte desaceleración; el helicóptero de rescate evacuó a la tripulación sin novedad.'
              : 'Impacto fuerte en el océano; el equipo aéreo de emergencia rescató a los 4 astronautas.'
        );
      }
      actualizarBarraSuperior();

      const divControles = contenedor.querySelector('#amerizaje-controles');
      const caption = contenedor.querySelector('#amer-caption');
      if (divControles) {
        divControles.innerHTML = `
          <span style="font-family:'Press Start 2P', monospace; font-size:0.68rem; color:#fde047; padding:12px;">
            🚁 HELICÓPTERO NASA EN OPERACIÓN DE RESCATE...
          </span>
        `;
      }
      if (caption) {
        caption.textContent = 'Observa cómo el helicóptero recoge a Dan, Ana, Leo y Maya desde la cápsula hacia el barco de recuperación.';
      }

      const nivelMar = Math.floor(CH * 0.66);
      const metaY = nivelMar - 26;
      const duracionRescate = 4.8;
      let elapsedRescate = 0;
      let prevRescate = performance.now();

      function loopRescate(ahora) {
        if (fase !== 'rescate-helicoptero') return;
        const dt = Math.min(0.05, Math.max(0, (ahora - prevRescate) / 1000));
        prevRescate = ahora;
        elapsedRescate += dt;

        const prog = Math.min(1, elapsedRescate / duracionRescate);
        sprites.dibujarEscenarioAmerizaje(ctx, CW, CH, metaY, 0, {
          frenando: false,
          faseRescate: true,
          progresoRescate: prog
        });

        if (prog >= 1) {
          if (divControles) {
            divControles.innerHTML = `
              <button type="button" class="btn btn-launch" id="btn-ir-celebracion-final"
                      style="font-size:0.8rem; padding:14px 28px; box-shadow: 0 4px 0 #090d16;">
                🎉 CONTINUAR A LA CELEBRACIÓN ➔
              </button>
            `;
            escuchar(contenedor.querySelector('#btn-ir-celebracion-final'), 'click', () => {
              irACelebracion();
            });
          }
          if (caption) {
            caption.innerHTML = `<strong style="color:#22c55e; font-family:'Press Start 2P', monospace; font-size:0.68rem;">
              ✓ TRIPULACIÓN RESCATADA · AMERIZAJE: ${puntos}/150 PTS (${estado.toUpperCase()})
            </strong>`;
          }
          return;
        }

        rafId = requestAnimationFrame(loopRescate);
      }

      rafId = requestAnimationFrame(loopRescate);
    }

    function loopAmerizaje(ahora) {
      if (fase !== 'amerizaje') return;
      const dt = Math.min(0.05, Math.max(0, (ahora - anterior) / 1000));
      anterior = ahora;
      transcurrido += dt;

      let bateriaDisp = mision?.bateriaActual ?? 100;
      const frenadoActivo = frenando && bateriaDisp > 0;

      vy += 1.6 * dt;
      if (frenadoActivo) {
        vy = Math.max(0.4, vy - 6.8 * dt);
        if (mision) {
          bateriaDisp = Math.max(0, bateriaDisp - 1.6 * dt);
          mision.bateriaActual = bateriaDisp;
        }
        if (window.Sound?.startThruster) window.Sound.startThruster(0.7);
      } else {
        if (window.Sound?.stopThruster) window.Sound.stopThruster();
      }
      altitud = Math.max(0, altitud - vy * dt * 2.2);

      const nivelMar = Math.floor(CH * 0.66);
      const metaY = nivelMar - 26;
      const capsulaY = metaY - (altitud / 55) * (metaY - 34);

      sprites.dibujarEscenarioAmerizaje(ctx, CW, CH, capsulaY, vy, {
        frenando: frenadoActivo,
        faseRescate: false
      });

      if (hudAltitud) hudAltitud.textContent = altitud.toFixed(1);
      if (hudVelocidad) {
        hudVelocidad.textContent = vy.toFixed(1) + ' m/s';
        hudVelocidad.style.color = vy <= 2.5 ? '#22c55e' : (vy <= 6.0 ? '#facc15' : '#ef4444');
      }
      if (hudBateria) hudBateria.textContent = String(Math.round(bateriaDisp));
      if (hudTiempo) hudTiempo.textContent = Math.max(0, limiteTiempo - transcurrido).toFixed(1);

      if (altitud <= 0 || transcurrido >= limiteTiempo) {
        iniciarRescateHelicoptero(vy);
        return;
      }

      rafId = requestAnimationFrame(loopAmerizaje);
    }

    rafId = requestAnimationFrame(loopAmerizaje);
  }

  function irAlReporte() {
    detenerBucles();
    fase = 'reporte';
    const contenedorRover = obtenerContenedor();
    const contenedorReporte = document.getElementById('escena-report');
    contenedorRover?.classList.remove('activa');
    contenedorReporte?.classList.add('activa');
    if (estadoMision()) estadoMision().escenaActual = 'report';
    if (window.ReportScene?.iniciar) window.ReportScene.iniciar();
  }

  function iniciar() {
    detenerBucles();
    fase = 'inactiva';
    const contenedor = obtenerContenedor();
    if (!contenedor) return;
    contenedor.classList.remove('tormenta-polvo');

    const mision = estadoMision();
    if (mision) {
      mision.muestrasRecolectadas = 0;
      mision.edlPuntos = 0;
      mision.edlPrecision = 0;
    }
    dan = { x: 135, y: 0, vy: 0, enSuelo: true, direccion: 1, estado: 'quieto' };
    vetas = [];
    mensajesFlotantes = [];
    ondaEscaner = null;
    renderEDL(contenedor);
  }

  window.RoverScene = { iniciar };
})(typeof window !== 'undefined' ? window : this);