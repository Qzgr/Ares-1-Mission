/**
 * Misión Ares-I – js/scenes/rover.js
 * Descenso EDL y exploración lateral de Jezero con decisión final.
 */
(function (window) {
  'use strict';

  const CW = 760;
  const CH = 330;
  const teclas = {};
  const listeners = [];
  let fase = 'inactiva';
  let rafId = null;
  let intervalId = null;
  let timeoutId = null;
  let extraccion = null;
  let dan = { x: 125, y: 0, vy: 0, enSuelo: true, direccion: 1, estado: 'quieto' };
  let ySuelo = 0;
  let tiempoRestante = 60;
  let tiempoJuegoInicio = 0;
  let ondaEscaner = null;
  let vetas = [];
  let mensajesFlotantes = [];
  let secuenciaVeta = 0;

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

  function renderEDL(contenedor) {
    fase = 'edl';
    contenedor.classList.remove('tormenta-polvo');
    contenedor.innerHTML = `
      <div class="marco-nasa fase-edl">
        <span class="badge-tag">FASE 3 · ENTRADA, DESCENSO Y ATERRIZAJE</span>
        <h1>Descenso a Jezero</h1>
        <p>Controla los retropropulsores para aterrizar con una velocidad vertical segura de 2.5 m/s o menos.</p>
        <div class="edl-hud">
          <strong>TIEMPO: <span id="edl-time">15.0</span> s</strong>
          <strong>ALTITUD: <span id="edl-altitude">90.0</span> m</strong>
          <strong>VELOCIDAD: <span id="edl-speed">0.0</span> m/s</strong>
          <strong>PRECISIÓN: <span id="edl-score">0</span>/150 pts</strong>
          <strong>BATERÍA: <span id="edl-battery">${Math.round(limitar(estadoMision()?.bateriaActual, 0, 100))}</span>%</strong>
        </div>
        <canvas id="canvas-edl" width="${CW}" height="${CH}"
                aria-label="Cápsula de Ares-I descendiendo sobre el cráter Jezero"></canvas>
        <button type="button" class="btn btn-launch" id="btn-edl-brake" aria-pressed="false">
          FRENAR RETROPROPULSORES
        </button>
        <p class="briefing-caption">Mantén W, Flecha Arriba o el botón para frenar. El uso de retropropulsores consume batería.</p>
        <div id="edl-result" class="edl-result" aria-live="polite"></div>
      </div>`;

    const canvas = contenedor.querySelector('#canvas-edl');
    const ctx = canvas?.getContext('2d');
    const sprites = window.Sprites;
    if (!ctx || typeof sprites?.dibujarEscenarioMarte !== 'function') {
      errorDependencia(contenedor, 'faltan el contexto 2D o los sprites de Marte.');
      return;
    }

    const mision = estadoMision();
    const limiteTiempo = 15;
    const gravedad = 1.15;
    const fuerzaFreno = 8;
    const velocidadMaxima = 20;
    let altitud = 90;
    let velocidad = 0;
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
      if (evento.code === 'KeyW' || evento.code === 'ArrowUp') {
        evento.preventDefault();
        ponerFreno(true);
      }
    };
    const keyUp = evento => {
      if (evento.code === 'KeyW' || evento.code === 'ArrowUp') ponerFreno(false);
    };
    const pointerDown = evento => {
      evento.preventDefault();
      ponerFreno(true);
    };
    const pointerUp = () => ponerFreno(false);
    escuchar(document, 'keydown', keyDown);
    escuchar(document, 'keyup', keyUp);
    escuchar(botonFreno, 'pointerdown', pointerDown);
    escuchar(botonFreno, 'pointerup', pointerUp);
    escuchar(botonFreno, 'pointerleave', pointerUp);
    escuchar(botonFreno, 'pointercancel', pointerUp);
    escuchar(botonFreno, 'click', () => ponerFreno(false));

    function dibujarEDL(ahora) {
      const dt = Math.max(0, (ahora - anterior) / 1000);
      anterior = ahora;
      transcurrido += dt;
      const bateriaDisponible = limitar(mision?.bateriaActual, 0, 100);
      const frenadoActivo = frenando && bateriaDisponible > 0;
      velocidad = limitar(velocidad + (gravedad - (frenadoActivo ? fuerzaFreno : 0)) * dt, 0, velocidadMaxima);
      altitud = Math.max(0, altitud - velocidad * dt);
      if (frenadoActivo && mision) {
        mision.bateriaActual = Math.max(0, bateriaDisponible - 0.55 * dt);
      }

      const suelo = sprites.dibujarEscenarioMarte(ctx, CW, CH, {
        conSubsuelo: true,
        conBase: true
      });
      const xCapsula = CW / 2;
      const yCapsula = suelo - 43 - altitud * 1.35;
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(xCapsula - 29, suelo - 4, 58, 4);
      if (frenadoActivo) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(xCapsula - 7, yCapsula + 36);
        ctx.lineTo(xCapsula, yCapsula + 52 + Math.random() * 5);
        ctx.lineTo(xCapsula + 7, yCapsula + 36);
        ctx.fill();
      }
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(xCapsula, yCapsula);
      ctx.lineTo(xCapsula + 18, yCapsula + 15);
      ctx.lineTo(xCapsula + 15, yCapsula + 36);
      ctx.lineTo(xCapsula - 15, yCapsula + 36);
      ctx.lineTo(xCapsula - 18, yCapsula + 15);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(xCapsula - 6, yCapsula + 14, 12, 9);
      ctx.restore();

      if (hudTiempo) hudTiempo.textContent = Math.max(0, limiteTiempo - transcurrido).toFixed(1);
      if (hudAltitud) hudAltitud.textContent = altitud.toFixed(1);
      if (hudVelocidad) hudVelocidad.textContent = velocidad.toFixed(1);
      if (hudBateria) hudBateria.textContent = String(Math.round(limitar(mision?.bateriaActual, 0, 100)));

      if (altitud <= 0) {
        finalizarEDL(contenedor, velocidad, false);
        return;
      }
      if (transcurrido >= limiteTiempo) {
        finalizarEDL(contenedor, velocidadMaxima, true);
        return;
      }
      rafId = requestAnimationFrame(dibujarEDL);
    }

    rafId = requestAnimationFrame(dibujarEDL);
  }

  function finalizarEDL(contenedor, velocidadImpacto, tiempoAgotado) {
    if (fase !== 'edl') return;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    limpiarListeners();

    const velocidadSegura = Math.max(0, numeroFinito(velocidadImpacto, 20));
    const puntos = tiempoAgotado ? 0
      : velocidadSegura <= 2.5 ? 150
        : velocidadSegura <= 8 ? 60 : 0;
    const mision = estadoMision();
    if (mision) {
      mision.edlPuntos = puntos;
      mision.edlPrecision = puntos;
      mision.llegadaExitosa = !tiempoAgotado && velocidadSegura <= 8;
      registrarHistorial(
        '3. Entrada, Descenso y Aterrizaje (EDL)',
        tiempoAgotado ? 'Tiempo agotado durante el descenso' : `Aterrizaje a ${velocidadSegura.toFixed(1)} m/s`,
        `Precisión EDL: ${puntos}/150 pts`,
        puntos === 150
          ? 'La cápsula aterrizó suavemente y el rover quedó listo para explorar.'
          : puntos === 60
            ? 'El aterrizaje fue brusco, pero la tripulación y el rover sobrevivieron.'
            : 'El descenso fue demasiado rápido o el tiempo se agotó.'
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
      const estado = estadoMision();
      if (estado?.evaluacionActual && window.UI?.actualizarBarraRecursos) {
        window.UI.actualizarBarraRecursos(estado.evaluacionActual, estado);
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

  function generarVetas() {
    vetas = [
      { x: 210, y: ySuelo + 38, profunda: false, reveladaHasta: 0, extraida: false, mineral: 'HIELO H2O' },
      { x: 310, y: ySuelo + 38, profunda: false, reveladaHasta: 0, extraida: false, mineral: 'ARCILLA' },
      { x: 410, y: ySuelo + 38, profunda: false, reveladaHasta: 0, extraida: false, mineral: 'CARBONATOS' },
      { x: 540, y: ySuelo + 78, profunda: true, reveladaHasta: 0, extraida: false, mineral: 'HIELO PROFUNDO' },
      { x: 650, y: ySuelo + 78, profunda: true, reveladaHasta: 0, extraida: false, mineral: 'SALES' }
    ];
  }

  function renderExploracion(contenedor) {
    fase = 'exploracion';
    contenedor.classList.remove('tormenta-polvo');
    contenedor.innerHTML = `
      <div class="marco-nasa">
        <span class="badge-tag">FASE 3 · EXPLORACIÓN DE JEZERO</span>
        <h1>🌋 Exploración en el Cráter Jezero</h1>
        <p>Explora el corte subterráneo, escanea las vetas y extrae muestras. La exploración termina al reunir 3 muestras o cuando se agota el tiempo.</p>
        <div class="edl-hud rover-hud" aria-live="polite">
          <strong>TIEMPO: <span id="rover-timer">60</span> s</strong>
          <strong>BATERÍA: <span id="rover-bateria">100</span>%</strong>
          <strong>MUESTRAS: <span id="rover-muestras">0</span>/5</strong>
          <strong>ESCÁNER: <span id="rover-scanner-status">ESPERANDO</span></strong>
        </div>
        <canvas id="canvas-jezero" width="760" height="330"
                aria-label="Corte transversal lateral del cráter Jezero"></canvas>
        <div class="touch-controles" id="rover-controls" aria-label="Controles de exploración">
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
          <button type="button" class="btn" id="btn-rover-abandon">
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
    ySuelo = numeroFinito(escenaInicial, Math.floor(CH * 0.62));
    dan = { x: 125, y: ySuelo - 54, vy: 0, enSuelo: true, direccion: 1, estado: 'quieto' };
    tiempoRestante = 60;
    tiempoJuegoInicio = performance.now();
    ondaEscaner = null;
    extraccion = null;
    mensajesFlotantes = [];
    secuenciaVeta = 0;
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
    escuchar(botonSalto, 'pointerup', evento => evento.preventDefault());
    escuchar(botonSalto, 'pointerleave', evento => evento.preventDefault());
    escuchar(botonSalto, 'pointercancel', evento => evento.preventDefault());
    escuchar(contenedor.querySelector('#rover-scan'), 'click', activarEscaner);
    escuchar(contenedor.querySelector('#rover-extract'), 'click', iniciarExtraccion);
    escuchar(contenedor.querySelector('#btn-rover-finish'), 'click', () => terminarExploracion(false));
    escuchar(contenedor.querySelector('#btn-rover-abandon'), 'click', () => terminarExploracion(true));
  }

  function saltar() {
    if (fase !== 'exploracion' || !dan.enSuelo) return;
    dan.enSuelo = false;
    dan.vy = -260;
    dan.estado = 'salta';
  }

  function activarEscaner() {
    if (fase !== 'exploracion') return;
    ondaEscaner = { inicio: performance.now(), x: dan.x + 24, y: dan.y + 27 };
    if (window.Sound?.playPulse) window.Sound.playPulse();
  }

  function iniciarExtraccion() {
    if (fase !== 'exploracion' || extraccion) return;
    const ahora = performance.now();
    const objetivo = vetas.find(veta =>
      !veta.extraida &&
      ahora <= veta.reveladaHasta &&
      Math.abs((dan.x + 24) - veta.x) < 65
    );
    if (!objetivo) return;
    extraccion = { veta: objetivo, inicio: ahora };
  }

  function revelarVetas(ahora, radioActual) {
    const escaner = ondaEscaner;
    if (!escaner) return;
    const radar = instrumentosInstalados().includes('radar');
    vetas.forEach(veta => {
      if (veta.extraida || (veta.profunda && !radar)) return;
      const distancia = Math.hypot(veta.x - escaner.x, veta.y - escaner.y);
      if (distancia <= radioActual) veta.reveladaHasta = ahora + 4000;
    });
  }

  function obtenerAlcanceRelay() {
    const mision = estadoMision();
    const relayId = mision?.diseno?.relay || 'ninguno';
    const relay = window.DATA?.relays?.[relayId];
    const cobertura = limitar(relay?.cobertura ?? relay?.cob ?? 0.4, 0, 1);
    return 350 + cobertura * 400;
  }

  function actualizarHud(contenedor, ahora) {
    const hudTiempo = contenedor.querySelector('#rover-timer');
    const hudBateria = contenedor.querySelector('#rover-bateria');
    const hudMuestras = contenedor.querySelector('#rover-muestras');
    const hudEscaner = contenedor.querySelector('#rover-scanner-status');
    const mision = estadoMision();
    tiempoRestante = Math.max(0, 60 - (ahora - tiempoJuegoInicio) / 1000);
    const muestras = limitar(mision?.muestrasRecolectadas, 0, 5);
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
        ctx.globalAlpha = 0.38;
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', veta.x, veta.y);
        ctx.font = '8px monospace';
        ctx.fillText('REQUIERE RADAR', veta.x, veta.y + 12);
      }
      ctx.restore();
      return;
    }

    ctx.shadowColor = veta.profunda ? '#38bdf8' : '#facc15';
    ctx.shadowBlur = 12;
    ctx.fillStyle = veta.profunda ? '#38bdf8' : '#facc15';
    ctx.fillRect(veta.x - 8, veta.y - 7, 16, 14);
    ctx.fillStyle = '#fff7ed';
    ctx.fillRect(veta.x - 3, veta.y - 3, 6, 6);
    ctx.shadowBlur = 0;
    if (tieneEspectrometro) {
      ctx.fillStyle = '#fef3c7';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(veta.mineral, veta.x, veta.y - 14);
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
      mision.muestrasRecolectadas = Math.min(5, limitar(mision.muestrasRecolectadas, 0, 5) + 1);
    }
    mensajesFlotantes.push({ texto: '+1 MUESTRA EXTRAÍDA', x: dan.x + 24, y: dan.y - 8, fin: ahora + 1400 });
    if (window.Sound?.playBeep) window.Sound.playBeep();
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
    const xInicio = dan.x + 24;
    const yInicio = dan.y + 22;
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
    ctx.fillRect(xInicio - 18, yInicio - 25, 36 * progreso, 4);
    ctx.strokeStyle = '#fff7ed';
    ctx.strokeRect(xInicio - 18, yInicio - 25, 36, 4);
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
      dan.x += desplazamiento * 180 * dt;
      dan.direccion = desplazamiento;
      if (dan.enSuelo) dan.estado = Math.floor(ahora / 140) % 2 === 0 ? 'camina1' : 'camina2';
    } else if (dan.enSuelo) {
      dan.estado = 'quieto';
    }
    dan.x = Math.max(20, Math.min(700, dan.x));

    if (!dan.enSuelo) {
      dan.vy += 520 * dt;
      dan.y += dan.vy * dt;
      if (dan.y >= ySuelo - 54) {
        dan.y = ySuelo - 54;
        dan.vy = 0;
        dan.enSuelo = true;
        dan.estado = desplazamiento === 0
          ? 'quieto'
          : Math.floor(ahora / 140) % 2 === 0 ? 'camina1' : 'camina2';
      }
    }

    const sprites = window.Sprites;
    const sueloFrame = sprites.dibujarEscenarioMarte(ctx, 760, 330, {
      conSubsuelo: true,
      conBase: true
    });
    ySuelo = numeroFinito(sueloFrame, ySuelo);

    const mision = estadoMision();
    const instrumentos = instrumentosInstalados();
    const tieneRadar = instrumentos.includes('radar');
    const tieneEspectrometro = instrumentos.includes('espectrometro');
    if (ondaEscaner) {
      const edad = ahora - ondaEscaner.inicio;
      const radioBase = instrumentos.includes('camaraAlta') ? 240 : 150;
      const radioActual = radioBase * limitar(edad / 900, 0, 1);
      revelarVetas(ahora, radioActual);
      if (edad >= 900) ondaEscaner = null;
    }
    vetas.forEach(veta => dibujarVeta(ctx, veta, ahora, tieneRadar, tieneEspectrometro));

    sprites.dibujarRover(ctx, 40, ySuelo - 42, 3, false);
    sprites.dibujarAstronauta(ctx, 'dan', dan.x, dan.y, {
      escala: 3,
      estado: dan.estado,
      voltear: dan.direccion < 0,
      mostrarNombre: true
    });
    sprites.dibujarAstronauta(ctx, 'ana', 520, ySuelo - 54, {
      escala: 3, estado: 'quieto', voltear: true, mostrarNombre: true
    });
    sprites.dibujarAstronauta(ctx, 'leo', 595, ySuelo - 54, {
      escala: 3, estado: 'quieto', voltear: true, mostrarNombre: true
    });
    sprites.dibujarAstronauta(ctx, 'maya', 670, ySuelo - 54, {
      escala: 3, estado: 'quieto', voltear: true, mostrarNombre: true
    });

    if (ondaEscaner) {
      const edad = ahora - ondaEscaner.inicio;
      const radioBase = instrumentos.includes('camaraAlta') ? 240 : 150;
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
      ctx.fillText('⚠ SEÑAL RELAY DÉBIL', CW / 2, 24);
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
        '0 muestras y 0 pts EDL; penalización de 50 pts en decisiones',
        'El abandono anuló las muestras y la puntuación del tramo de aterrizaje.'
      );
    }
    fase = 'decision';
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    limpiarListeners();
    extraccion = null;
    const contenedor = obtenerContenedor();
    if (!contenedor) return;
    contenedor.classList.add('tormenta-polvo');
    renderDecision3(contenedor);
  }

  function obtenerEvaluacion(mision) {
    if (mision.evaluacionActual && typeof mision.evaluacionActual === 'object') {
      return { ...mision.evaluacionActual };
    }
    if (typeof window.Engine?.evaluarDiseno === 'function') {
      return window.Engine.evaluarDiseno(mision.diseno || {}, mision.presupuestoMax);
    }
    return { ciencia: 0, masaTotal: 0, capacidadCohete: 0, costoTotal: 0 };
  }

  function calcularProbabilidadExtraccion(mision, evaluacion) {
    const capacidad = Math.max(0, numeroFinito(evaluacion?.capacidadCohete, 0));
    const masa = Math.max(0, numeroFinito(evaluacion?.masaTotal, 0));
    const danoPaneles = limitar(mision.danoPaneles, 0, 100);
    const factorLigereza = capacidad > 0
      ? Math.round(limitar(1 - masa / capacidad, 0, 1) * 40)
      : 0;
    const saludPaneles = 100 - danoPaneles;
    const factorPaneles = Math.round(saludPaneles * 0.4);
    const probabilidad = limitar(15 + factorLigereza + factorPaneles, 15, 95);
    return { probabilidad, factorLigereza, factorPaneles, saludPaneles };
  }

  function renderDecision3(contenedor) {
    const mision = estadoMision() || {};
    const diseno = mision.diseno || {};
    const evaluacion = obtenerEvaluacion(mision);
    const relayId = diseno.relay || 'ninguno';
    const relay = window.DATA?.relays?.[relayId] || { cobertura: 0.4 };
    const cobertura = limitar(relay.cobertura ?? relay.cob ?? 0.4, 0, 1);
    const instrumentos = instrumentosInstalados();
    const tieneTaladro = instrumentos.includes('taladro');
    const bateria = limitar(mision.bateriaActual, 0, 100);
    const muestras = Math.floor(limitar(mision.muestrasRecolectadas, 0, 5));
    const textoMuestras = muestras === 1
      ? '1 muestra recolectada'
      : `${muestras} muestras recolectadas`;
    const cantidadMuestras = muestras === 1 ? 'una muestra' : `${muestras} muestras`;
    const puedeRelay = relayId !== 'ninguno';
    const puedeExtraccion = tieneTaladro && bateria >= 40;
    const { probabilidad, factorLigereza, factorPaneles } =
      calcularProbabilidadExtraccion(mision, evaluacion);
    const porcentajeRelay = cobertura <= 0.65 ? 80 : 100;

    contenedor.innerHTML = `
      <div class="marco-nasa tormenta-polvo" id="rover-decision">
        <span class="badge-tag">FASE 3 · BORDE DEL BARRANCO</span>
        <h1>🌪️ Decisión 3: Tormenta de Polvo en Jezero</h1>
        <p>Dan llegó al borde del cráter con <strong>${textoMuestras}</strong> de un máximo de 5. Elige cómo asegurar los resultados científicos.</p>
        <div class="cards-grid">
          <button type="button" class="decision-card" id="dec3-retirada">
            <span class="decision-num">OPCIÓN 1</span>
            <h2>🏁 Retirada segura</h2>
            <p>Transmite el 60% de la ciencia de las muestras recolectadas sin riesgo.</p>
            <div class="spec-line"><span>Muestras:</span><span class="spec-val">${muestras === 0 ? 'Se transmiten 0 muestras' : `${textoMuestras} · ciencia al 60%`}</span></div>
            <div class="spec-line"><span>Riesgo:</span><span class="spec-val">NINGUNO</span></div>
          </button>
          <button type="button" class="decision-card ${puedeRelay ? '' : 'disabled-card'}"
                  id="dec3-relay" ${puedeRelay ? '' : 'disabled'}>
            <span class="decision-num">OPCIÓN 2</span>
            <h2>🛰️ Trabajo en equipo con mini-satélite Relay</h2>
            ${puedeRelay
              ? `<p>Transmite el ${porcentajeRelay}% de lo recolectado (cobertura del ${Math.round(cobertura * 100)}%).</p>
                 <div class="spec-line"><span>Muestras:</span><span class="spec-val">${muestras}</span></div>`
              : '<p>❌ Deshabilitada: la nave no tiene un mini-satélite Relay.</p>'}
          </button>
          <button type="button" class="decision-card ${puedeExtraccion ? '' : 'disabled-card'}"
                  id="dec3-extraccion" ${puedeExtraccion ? '' : 'disabled'}>
            <span class="decision-num">OPCIÓN 3</span>
            <h2>⚡ Extracción al límite · Muestra de núcleo</h2>
            ${!tieneTaladro
              ? '<p>❌ Deshabilitada: se requiere un taladro de perforación.</p>'
              : bateria < 40
                ? `<p>❌ Deshabilitada: batería insuficiente (${Math.round(bateria)}% de 40% necesarios).</p>`
                : `<p>Éxito: <strong>${probabilidad}%</strong>. Si funciona, añade una muestra de núcleo y duplica su valor científico.</p>
                   <div class="spec-line"><span>Ligereza:</span><span class="spec-val">+${factorLigereza}%</span></div>
                   <div class="spec-line"><span>Salud de paneles:</span><span class="spec-val">+${factorPaneles}%</span></div>`}
          </button>
        </div>
      </div>`;

    escuchar(contenedor.querySelector('#dec3-retirada'), 'click', () => {
      const evalFinal = obtenerEvaluacion(mision);
      evalFinal.ciencia = Math.max(0, numeroFinito(evalFinal.ciencia, 0) * 0.6);
      mision.evaluacionActual = evalFinal;
      mision.decision3 = 'retirada_segura';
      mision.decision3Fallo = false;
      completarDecision3(
        mision,
        'Retirada segura',
        muestras === 0
          ? 'Se transmitieron 0 muestras; no hubo riesgo para la tripulación.'
          : `${textoMuestras} con el 60% de su valor científico transmitido.`,
        'La tripulación se retiró sin riesgo y conservó íntegramente las muestras recolectadas.'
      );
    });

    escuchar(contenedor.querySelector('#dec3-relay'), 'click', () => {
      if (!puedeRelay) return;
      const evalFinal = obtenerEvaluacion(mision);
      evalFinal.ciencia = Math.max(0, numeroFinito(evalFinal.ciencia, 0) * porcentajeRelay / 100);
      mision.evaluacionActual = evalFinal;
      mision.decision3 = 'relay_equipo';
      mision.decision3Fallo = false;
      completarDecision3(
        mision,
        'Trabajo en equipo con mini-satélite Relay',
        `Se transmitió el ${porcentajeRelay}% de la ciencia asociada a ${cantidadMuestras} con cobertura ${Math.round(cobertura * 100)}%.`,
        'El relay proporcionó el enlace orbital necesario para enviar las muestras recolectadas.'
      );
    });

    escuchar(contenedor.querySelector('#dec3-extraccion'), 'click', () => {
      if (!puedeExtraccion) return;
      const exito = Math.random() * 100 < probabilidad;
      mision.decision3 = 'extraccion_limite';
      mision.decision3Fallo = !exito;
      if (exito) {
        mision.muestrasRecolectadas = Math.min(5, muestras + 1);
        const evalFinal = obtenerEvaluacion(mision);
        evalFinal.ciencia = Math.max(0, numeroFinito(evalFinal.ciencia, 0) * 2);
        mision.evaluacionActual = evalFinal;
      } else {
        mision.bateriaActual = Math.max(0, bateria - 25);
        if (typeof mision.registrarEvento === 'function') {
          mision.registrarEvento('Falló la extracción al límite de una muestra de núcleo.');
        }
      }
      completarDecision3(
        mision,
        `Extracción al límite (${probabilidad}% de probabilidad)`,
        exito
          ? `Éxito: se añadió 1 muestra de núcleo (${mision.muestrasRecolectadas} en total) y se duplicó el valor científico.`
          : 'Fallo: no se recuperó la muestra de núcleo y se perdió un 25% de batería.',
        exito
          ? 'El taladro alcanzó el núcleo y recuperó una muestra de alto valor científico.'
          : 'El taladro falló bajo la tormenta de polvo; se consumieron recursos sin obtener una muestra.'
      );
    });
  }

  function completarDecision3(mision, eleccion, consecuencia, explicacion) {
    const detalle = { eleccion, consecuencia, explicacion };
    mision.decision3Detalle = detalle;
    if (!Array.isArray(mision.historialCausaEfecto)) mision.historialCausaEfecto = [];
    mision.historialCausaEfecto.push({
      etapa: 'Cráter Jezero',
      eleccion,
      consecuencia,
      explicacion
    });
    irAlReporte();
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
    dan = { x: 125, y: 0, vy: 0, enSuelo: true, direccion: 1, estado: 'quieto' };
    vetas = [];
    mensajesFlotantes = [];
    ondaEscaner = null;
    renderEDL(contenedor);
  }

  window.RoverScene = { iniciar };
})(typeof window !== 'undefined' ? window : this);
