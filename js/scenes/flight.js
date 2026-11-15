/**
 * Misión Ares-I: Diseña, Lanza y Sobrevive
 * js/scenes/flight.js - Escena 2: Vuelo y Tránsito Interplanetario
 */

(function (window) {
  'use strict';

  let faseActual = 'lanzamiento'; // 'lanzamiento' | 'minijuego' | 'alerta'
  let animId = null;
  let timerInterval = null;
  let countdownInterval = null;
  let listenersActivos = [];

  function limpiarCiclos() {
    if (window.Sound?.stopThruster) window.Sound.stopThruster();
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    listenersActivos.forEach(({ elemento, evento, handler }) => {
      elemento.removeEventListener(evento, handler);
    });
    listenersActivos = [];
  }

  function render(container) {
    if (!container) return;
    limpiarCiclos();

    const estado = window.estadoMision || {};
    const diseno = estado.diseno || {};
    const evaluacion = estado.evaluacionActual || (window.Engine?.evaluarDiseno ? window.Engine.evaluarDiseno(diseno, estado.presupuestoMax) : {});

    if (faseActual === 'lanzamiento') {
      renderLanzamiento(container, estado, diseno);
    } else if (faseActual === 'minijuego') {
      renderMinijuego(container, estado, diseno, evaluacion);
    } else {
      renderAlertaTormenta(container, estado, diseno, evaluacion);
    }
  }

  function renderLanzamiento(container, estado, diseno) {
    container.innerHTML = `
      <div class="marco-nasa fase-lanzamiento" style="width:95vw; max-width:1380px; margin:12px auto;">
        <span class="badge-tag" style="background:#fc3d21; color:#fff; border-color:#090d16;">FASE 1 · SECUENCIA DE LANZAMIENTO</span>
        <h1>¡Despegue de Ares-I!</h1>
        <p>Mantén el empuje en la zona verde (60–85%) durante los 12 segundos de ascenso.</p>
        <div class="lanzamiento-hud">
          <strong>TIEMPO: <span id="launch-time">12.0</span> s</strong>
          <strong>POTENCIA: <span id="launch-power">50</span>%</strong>
          <strong>BONO: <span id="launch-score">0</span> pts</strong>
        </div>
        <div class="lanzamiento-medidor" role="meter" aria-label="Potencia de empuje"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" style="max-width:880px; margin:10px auto;">
          <div class="lanzamiento-zona-verde"></div>
          <div class="lanzamiento-aguja" id="launch-needle"></div>
        </div>
        <canvas id="canvas-lanzamiento" width="880" height="400"
                style="width:100%; max-width:880px; height:auto; display:block; margin:0 auto; border:4px solid #eab308;"
                aria-label="Cohete Ares-I despegando desde la plataforma"></canvas>
        <div style="display:flex; gap:14px; justify-content:center; align-items:center; flex-wrap:wrap; margin-top:12px;">
          <button type="button" class="btn btn-launch" id="btn-mantener-empuje"
                  aria-pressed="false">🔥 MANTENER EMPUJE</button>
          <button type="button" class="btn btn-secondary" id="btn-abandonar-lanzamiento"
                  style="border-color: #ef4444; color: #f87171;">
            ⚠ ABANDONAR TRAMO (0 PTS)
          </button>
        </div>
        <p class="briefing-caption">Mantén Espacio o el botón para aumentar el empuje; suéltalo para reducirlo.</p>
      </div>
    `;

    const canvas = container.querySelector('#canvas-lanzamiento');
    const ctx = canvas?.getContext('2d');
    if (!ctx || !window.Sprites?.dibujarCoheteModular) {
      estado.lanzamientoBonus = 0;
      faseActual = 'minijuego';
      render(container);
      return;
    }

    container.querySelector('#btn-abandonar-lanzamiento')?.addEventListener('click', () => {
      const mision = window.estadoMision;
      if (!mision || faseActual !== 'lanzamiento') return;
      limpiarCiclos();
      const tramosSaltados = Number(mision.tramosSaltados);
      mision.tramosSaltados = (Number.isFinite(tramosSaltados) ? Math.max(0, tramosSaltados) : 0) + 1;
      mision.lanzamientoBonus = 0;
      mision.registrarCausaEfecto?.(
        '1. Secuencia de Lanzamiento',
        'Tramo de ascenso abandonado',
        'Bono de lanzamiento: 0/100 pts; penalización de 50 pts en decisiones',
        'Se canceló el control fino de empuje durante el ascenso orbital.'
      );
      faseActual = 'minijuego';
      render(container);
    });

    const duration = 12;
    const keys = {};
    let elapsed = 0;
    let greenTime = 0;
    let power = 50;
    let previousTime = performance.now();
    const btnEmpuje = container.querySelector('#btn-mantener-empuje');
    const hudTime = container.querySelector('#launch-time');
    const hudPower = container.querySelector('#launch-power');
    const hudScore = container.querySelector('#launch-score');
    const needle = container.querySelector('#launch-needle');
    const meter = container.querySelector('.lanzamiento-medidor');

    const setThrust = (pressed) => {
      keys.Space = pressed;
      btnEmpuje?.setAttribute('aria-pressed', String(pressed));
      if (pressed) {
        window.Sound?.startThruster?.(power / 100);
      } else {
        window.Sound?.stopThruster?.();
      }
    };
    const keyDown = event => {
      if (event.code === 'Space') {
        event.preventDefault();
        setThrust(true);
      }
    };
    const keyUp = event => {
      if (event.code === 'Space') setThrust(false);
    };
    const pointerDown = event => {
      event.preventDefault();
      setThrust(true);
      btnEmpuje?.setPointerCapture?.(event.pointerId);
    };
    const pointerUp = () => setThrust(false);
    document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', keyUp);
    btnEmpuje?.addEventListener('pointerdown', pointerDown);
    btnEmpuje?.addEventListener('pointerup', pointerUp);
    btnEmpuje?.addEventListener('pointercancel', pointerUp);
    btnEmpuje?.addEventListener('lostpointercapture', pointerUp);
    listenersActivos.push(
      { elemento: document, evento: 'keydown', handler: keyDown },
      { elemento: document, evento: 'keyup', handler: keyUp }
    );
    if (btnEmpuje) {
      listenersActivos.push(
        { elemento: btnEmpuje, evento: 'pointerdown', handler: pointerDown },
        { elemento: btnEmpuje, evento: 'pointerup', handler: pointerUp },
        { elemento: btnEmpuje, evento: 'pointercancel', handler: pointerUp },
        { elemento: btnEmpuje, evento: 'lostpointercapture', handler: pointerUp }
      );
    }

    function dibujar(now) {
      const dt = Math.min(duration - elapsed, Math.max(0, (now - previousTime) / 1000));
      previousTime = now;
      elapsed += dt;
      const pushing = keys.Space;
      const powerRate = pushing ? 42 : -30;
      const reachesGreenStart = (60 - power) / powerRate;
      const reachesGreenEnd = (85 - power) / powerRate;
      greenTime += Math.max(0,
        Math.min(dt, Math.max(reachesGreenStart, reachesGreenEnd)) -
        Math.max(0, Math.min(reachesGreenStart, reachesGreenEnd)));
      power = Math.max(0, Math.min(100, power + powerRate * dt));
      if (pushing && window.Sound?.updateThruster) {
        window.Sound.updateThruster(power / 100);
      }

      const W = canvas.width;
      const H = canvas.height;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#132247';
      ctx.fillRect(0, 0, W, 280);
      ctx.fillStyle = '#facc15';
      [[110, 50], [230, 88], [620, 43], [740, 105], [380, 35], [510, 75]].forEach(([x, y]) => ctx.fillRect(x, y, 3, 3));

      const groundY = 325;
      const centerX = W / 2;
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(0, groundY, W, H - groundY);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(centerX - 90, groundY - 5, 180, 10);
      ctx.fillRect(centerX - 60, groundY - 55, 10, 55);
      ctx.fillRect(centerX + 50, groundY - 55, 10, 55);
      ctx.fillStyle = '#475569';
      ctx.fillRect(centerX - 56, groundY - 38, 112, 8);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(centerX - 44, groundY - 44, 88, 6);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(centerX - 48, groundY - 160, 8, 116);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(centerX - 40, groundY - 130, 18, 4);
      ctx.fillRect(centerX - 40, groundY - 85, 18, 4);

      const lift = elapsed * 10;
      const yBase = groundY - 24 - lift;
      if (pushing) {
        ctx.fillStyle = power >= 60 && power <= 85 ? '#22c55e' : '#f97316';
        ctx.beginPath();
        ctx.moveTo(centerX - 14, yBase - 18);
        ctx.lineTo(centerX, yBase + 16 + Math.random() * 12);
        ctx.lineTo(centerX + 14, yBase - 18);
        ctx.fill();
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(centerX - 52, 0, 104, yBase - 18);
      ctx.clip();
      window.Sprites.dibujarCoheteModular(ctx, centerX - 12, yBase, diseno, 4);
      ctx.restore();

      if (hudTime) hudTime.textContent = (duration - elapsed).toFixed(1);
      if (hudPower) hudPower.textContent = String(Math.round(power));
      if (hudScore) hudScore.textContent = String(Math.round(greenTime / duration * 100));
      if (needle) needle.style.left = `${power}%`;
      if (meter) meter.setAttribute('aria-valuenow', String(Math.round(power)));

      if (elapsed >= duration) {
        estado.lanzamientoBonus = Math.round(greenTime / duration * 100);
        estado.registrarCausaEfecto?.(
          '1. Secuencia de Lanzamiento',
          `Control de empuje dentro de la zona verde: ${Math.round(greenTime)}/${duration} s`,
          `Bono de lanzamiento: ${estado.lanzamientoBonus}/100 pts`,
          estado.lanzamientoBonus > 0
            ? 'El empuje se mantuvo dentro del margen operativo recomendado durante parte del ascenso.'
            : 'No se mantuvo el empuje en el margen operativo recomendado.'
        );
        limpiarCiclos();
        faseActual = 'minijuego';
        render(container);
        return;
      }
      animId = requestAnimationFrame(dibujar);
    }

    animId = requestAnimationFrame(dibujar);
  }

  /**
   * Tramo 2A: Minijuego en Canvas 2D (30 segundos, mayor velocidad y -50% energía si pierde).
   */
  function renderMinijuego(container, estado, diseno, evaluacion) {
    container.innerHTML = `
      <div class="marco-nasa" style="width:95vw; max-width:1380px; margin:12px auto;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-bottom:2px solid #eab308; padding-bottom:10px; margin-bottom:12px;">
          <div>
            <span class="badge-tag" style="background:#fc3d21; color:#fff; border-color:#090d16;">FASE 2 • TRÁNSITO ESPACIAL (TRAMO 2A)</span>
            <h1 style="margin:6px 0 4px 0;">Navegación en el Cinturón de Escombros (30s)</h1>
            <p style="margin:0;">Esquiva los asteroides a alta velocidad con <strong>A/D</strong> o <strong>◀/▶</strong>. Si pierdes toda la energía sufrirás una penalización del 50%.</p>
          </div>
          <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
            <div style="background:#090d16; border:2px solid #eab308; padding:8px 12px; font-family:'Press Start 2P', monospace; font-size:0.65rem;">
              <span>⏱️ <strong id="hud-timer-flight" style="color:#fde047;">30s</strong></span>
               | 
              <span>🔋 <strong id="hud-bateria-flight" style="color:#38bdf8;">${Math.round(estado.bateriaActual || 100)}%</strong></span>
            </div>
            <button type="button" class="btn btn-secondary" id="btn-abandonar-tramo-flight"
                    style="border-color: #ef4444; color: #f87171;">
              ⚠ ABANDONAR TRAMO (0 PTS)
            </button>
          </div>
        </div>

        <div class="flight-game-layout" style="display:grid; grid-template-columns: 1fr 270px; gap:18px; align-items:stretch;">
          <div class="canvas-wrapper" style="position:relative; width:100%;">
            <canvas id="canvas-flight" class="arcade-canvas" width="880" height="420" style="display:block; width:100%; height:auto; border:4px solid #eab308; background:#070b14;"></canvas>
            
            <div id="flight-countdown-overlay" style="display:flex; position:absolute; inset:0; background:rgba(7, 11, 20, 0.85); flex-direction:column; align-items:center; justify-content:center; z-index:10; pointer-events:none;">
              <span style="font-family:'Press Start 2P', monospace; font-size:0.8rem; color:#38bdf8; letter-spacing:2px; margin-bottom:12px;">PREPÁRATE PARA MANIOBRAR</span>
              <span id="flight-countdown-number" style="font-family:'Press Start 2P', monospace; font-size:3.5rem; color:#facc15; text-shadow:0 0 20px rgba(250, 204, 21, 0.8);">3</span>
              <span style="font-family:'VT323', monospace; font-size:1.45rem; color:#f8fafc; margin-top:10px;">Maniobra con [A] [D] o Flechas [◀] [▶]</span>
            </div>
          </div>

          <aside class="panel-controles-vuelo" style="background:#f8fafc; color:#090d16; border:3px solid #eab308; padding:14px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 0 #090d16;">
            <div>
              <h3 style="color:#0b3d91; font-size:0.72rem; margin-top:0; margin-bottom:12px; border-bottom:2px solid #fc3d21; padding-bottom:6px; letter-spacing:1px;">🕹️ CONTROLES DE VUELO</h3>
              
              <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px;">
                <div style="background:#e2e8f0; border:2px solid #0b3d91; padding:8px;">
                  <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px;">
                    <kbd style="background:#0b3d91; border:2px solid #090d16; color:#fff; padding:2px 7px; font-family:'Press Start 2P', monospace; font-size:0.6rem;">A</kbd>
                    <span style="color:#334155; font-size:0.75rem;">o</span>
                    <kbd style="background:#0b3d91; border:2px solid #090d16; color:#fff; padding:2px 7px; font-family:'Press Start 2P', monospace; font-size:0.6rem;">◀</kbd>
                  </div>
                  <span style="color:#090d16; font-size:0.9rem; font-weight:bold;">Mover a la IZQUIERDA</span>
                </div>

                <div style="background:#e2e8f0; border:2px solid #0b3d91; padding:8px;">
                  <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px;">
                    <kbd style="background:#0b3d91; border:2px solid #090d16; color:#fff; padding:2px 7px; font-family:'Press Start 2P', monospace; font-size:0.6rem;">D</kbd>
                    <span style="color:#334155; font-size:0.75rem;">o</span>
                    <kbd style="background:#0b3d91; border:2px solid #090d16; color:#fff; padding:2px 7px; font-family:'Press Start 2P', monospace; font-size:0.6rem;">▶</kbd>
                  </div>
                  <span style="color:#090d16; font-size:0.9rem; font-weight:bold;">Mover a la DERECHA</span>
                </div>
              </div>

              <div style="border-top:2px dashed #94a3b8; padding-top:10px;">
                <h4 style="color:#fc3d21; font-size:0.6rem; font-family:'Press Start 2P', monospace; margin:0 0 8px 0;">🎯 REGLAS:</h4>
                <p style="margin:6px 0; font-size:0.95rem; color:#991b1b; line-height:1.25;">☄️ <strong>Asteroides rápidos:</strong> cada choque resta <strong>12%</strong> de energía.</p>
                <p style="margin:6px 0; font-size:0.95rem; color:#b45309; line-height:1.25;">⚠️ <strong>Derrota:</strong> si llegas a 0%, pierdes el <strong>50% de tu energía</strong>.</p>
                <p style="margin:6px 0; font-size:0.95rem; color:#15803d; line-height:1.25;">☀️ <strong>Zonas solares:</strong> recargan +10% batería.</p>
              </div>
            </div>

            <div style="margin-top:10px; background:#0b3d91; padding:8px; border:2px solid #090d16; font-size:0.85rem; color:#f8fafc; text-align:center; font-weight:bold;">
              ⏱️ Duración de tránsito: 30s
            </div>
          </aside>
        </div>
      </div>
    `;

    container.querySelector('#btn-abandonar-tramo-flight')?.addEventListener('click', () => {
      const mision = window.estadoMision;
      if (!mision || faseActual !== 'minijuego') return;
      limpiarCiclos();
      const tramosSaltados = Number(mision.tramosSaltados);
      mision.tramosSaltados = (Number.isFinite(tramosSaltados) ? Math.max(0, tramosSaltados) : 0) + 1;
      mision.lanzamientoBonus = 0;
      mision.muestrasRecolectadas = 0;
      mision.edlPuntos = 0;
      mision.edlPrecision = 0;
      const historial = Array.isArray(mision.historialCausaEfecto) ? mision.historialCausaEfecto : [];
      const lanzamiento = [...historial].reverse().find(item => item?.etapa === '1. Secuencia de Lanzamiento');
      if (lanzamiento) {
        lanzamiento.consecuencia = 'Bono de lanzamiento: 0/100 pts (tramo abandonado)';
        lanzamiento.explicacion = 'El jugador abandonó el tramo y perdió el bono obtenido durante el ascenso.';
      }
      mision.registrarCausaEfecto?.(
        '2. Tránsito Interplanetario',
        'Tramo abandonado por el jugador',
        '0 pts de lanzamiento; 0 muestras; penalización de 50 pts en decisiones',
        'El tramo se abandonó explícitamente y no se conceden puntos por su desempeño.'
      );
      faseActual = 'alerta';
      render(container);
    });

    iniciarLoopCanvasFlight(container, estado, evaluacion);
  }

  function iniciarLoopCanvasFlight(container, estado, evaluacion) {
    const canvas = container.querySelector('#canvas-flight');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const W = canvas.width;
    const H = canvas.height;
    const bateriaInicialTransito = Math.max(20, Math.round(estado.bateriaActual || 100));
    let tramoTerminado = false;

    const nave = {
      x: W / 2,
      y: H - 55,
      w: 44,
      h: 52,
      vx: 0,
      vel: 430,
      flash: 0,
      flameTick: 0
    };

    const estrellas = Array.from({ length: 70 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: 1 + Math.random() * 2.5,
      speed: 90 + Math.random() * 180
    }));

    let asteroides = [];
    let zonasSolares = [];
    let textosFlotantes = [];
    let particulas = [];

    let tiempoRestante = 30;
    const hudTimer = container.querySelector('#hud-timer-flight');
    const hudBateria = container.querySelector('#hud-bateria-flight');
    const overlayPrep = container.querySelector('#flight-countdown-overlay');
    const numPrep = container.querySelector('#flight-countdown-number');

    let juegoIniciado = false;
    let prepSegundos = 3;

    function terminarPorDerrota() {
      if (tramoTerminado) return;
      tramoTerminado = true;
      juegoIniciado = false;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }

      // Penalización del 50% de la energía con la que entró al tránsito
      const nuevaBateria = Math.max(10, Math.round(bateriaInicialTransito * 0.5));
      estado.bateriaActual = nuevaBateria;
      if (hudBateria) hudBateria.textContent = `${nuevaBateria}%`;
      if (window.UI?.actualizarBarraRecursos) {
        window.UI.actualizarBarraRecursos(evaluacion, estado);
      }

      estado.registrarCausaEfecto?.(
        '2. Tránsito Interplanetario',
        'Colisiones múltiples en cinturón de escombros',
        `Derrota en tránsito: pérdida del 50% de energía (batería ajustada a ${nuevaBateria}%)`,
        'Los impactos contra meteoroides saturaron los escudos y consumieron la mitad de la reserva energética.'
      );

      setTimeout(() => {
        limpiarCiclos();
        faseActual = 'alerta';
        render(container);
      }, 1500);
    }

    countdownInterval = setInterval(() => {
      prepSegundos--;
      if (prepSegundos > 0) {
        if (numPrep) numPrep.textContent = String(prepSegundos);
      } else if (prepSegundos === 0) {
        if (numPrep) {
          numPrep.textContent = '¡INICIO!';
          numPrep.style.fontSize = '2.2rem';
          numPrep.style.color = '#38bdf8';
        }
      } else {
        clearInterval(countdownInterval);
        countdownInterval = null;
        if (overlayPrep) overlayPrep.style.display = 'none';
        juegoIniciado = true;

        timerInterval = setInterval(() => {
          if (tramoTerminado) return;
          tiempoRestante--;
          if (hudTimer) hudTimer.textContent = `${tiempoRestante}s`;
          if (tiempoRestante <= 0) {
            tramoTerminado = true;
            clearInterval(timerInterval);
            timerInterval = null;
            setTimeout(() => {
              limpiarCiclos();
              faseActual = 'alerta';
              render(container);
            }, 300);
          }
        }, 1000);
      }
    }, 1000);

    const teclas = { izquierda: false, derecha: false };

    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') teclas.izquierda = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') teclas.derecha = true;
    };
    const onKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') teclas.izquierda = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') teclas.derecha = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    listenersActivos.push({ elemento: window, evento: 'keydown', handler: onKeyDown });
    listenersActivos.push({ elemento: window, evento: 'keyup', handler: onKeyUp });

    let spawnAsteroidTick = 0;
    let spawnSolarTick = 0;
    let lastTime = performance.now();

    function loop(now) {
      const dt = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;

      nave.vx = 0;
      if (!tramoTerminado) {
        if (teclas.izquierda) nave.vx -= nave.vel;
        if (teclas.derecha) nave.vx += nave.vel;
      }
      nave.x += nave.vx * dt;
      nave.x = Math.max(nave.w / 2 + 14, Math.min(W - nave.w / 2 - 14, nave.x));
      nave.flameTick += dt * 18;

      if (nave.flash > 0) nave.flash = Math.max(0, nave.flash - dt * 2.5);
      if (nave.flash < 0) nave.flash = Math.min(0, nave.flash + dt * 2.5);

      estrellas.forEach(star => {
        star.y += star.speed * dt;
        if (star.y > H) {
          star.y = 0;
          star.x = Math.random() * W;
        }
      });

      // Asteroides mucho más rápidos y frecuentes
      if (juegoIniciado && !tramoTerminado) {
        spawnAsteroidTick += dt;
        if (spawnAsteroidTick > 0.52) {
          spawnAsteroidTick = 0;
          asteroides.push({
            x: 28 + Math.random() * (W - 56),
            y: -25,
            r: 14 + Math.random() * 16,
            vy: 290 + Math.random() * 170,
            ang: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 4
          });
        }

        spawnSolarTick += dt;
        if (spawnSolarTick > 3.2) {
          spawnSolarTick = 0;
          zonasSolares.push({
            x: 40 + Math.random() * (W - 140),
            y: -40,
            w: 95 + Math.random() * 35,
            h: 45,
            vy: 185,
            activa: true
          });
        }
      }

      asteroides.forEach(ast => {
        ast.y += ast.vy * dt;
        ast.ang += ast.spin * dt;

        if (tramoTerminado) return;
        const dx = ast.x - nave.x;
        const dy = ast.y - nave.y;
        const dist = Math.hypot(dx, dy);

        if (dist < ast.r + nave.w / 2.2) {
          estado.bateriaActual = Math.max(0, (estado.bateriaActual || 100) - 12);
          nave.flash = 1;
          textosFlotantes.push({ text: '-12% ENERGÍA', x: nave.x, y: nave.y - 24, color: '#ff3344', alpha: 1 });

          for (let p = 0; p < 10; p++) {
            particulas.push({
              x: ast.x, y: ast.y,
              vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200,
              color: '#ffdd00', life: 0.45
            });
          }

          ast.y = H + 200;
          if (hudBateria) hudBateria.textContent = `${Math.round(estado.bateriaActual)}%`;
          if (window.UI?.actualizarBarraRecursos) {
            window.UI.actualizarBarraRecursos(evaluacion, estado);
          }

          if (estado.bateriaActual <= 0) {
            terminarPorDerrota();
          }
        }
      });
      asteroides = asteroides.filter(a => a.y <= H + 50);

      zonasSolares.forEach(zona => {
        zona.y += zona.vy * dt;
        if (zona.activa && !tramoTerminado) {
          const colX = nave.x + nave.w / 2 > zona.x && nave.x - nave.w / 2 < zona.x + zona.w;
          const colY = nave.y + nave.h / 2 > zona.y && nave.y - nave.h / 2 < zona.y + zona.h;
          if (colX && colY) {
            const prev = estado.bateriaActual || 100;
            estado.bateriaActual = Math.min(100, prev + 10);
            const delta = Math.round(estado.bateriaActual - prev);
            zona.activa = false;
            nave.flash = -1;
            textosFlotantes.push({ text: `+${delta}% RECARGA`, x: nave.x, y: nave.y - 26, color: '#00ff66', alpha: 1 });
            if (hudBateria) hudBateria.textContent = `${Math.round(estado.bateriaActual)}%`;
            if (window.UI?.actualizarBarraRecursos) {
              window.UI.actualizarBarraRecursos(evaluacion, estado);
            }
          }
        }
      });
      zonasSolares = zonasSolares.filter(z => z.y <= H + 60);

      textosFlotantes.forEach(tf => {
        tf.y -= 38 * dt;
        tf.alpha -= 1.1 * dt;
      });
      textosFlotantes = textosFlotantes.filter(tf => tf.alpha > 0);

      particulas.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      });
      particulas = particulas.filter(p => p.life > 0);

      ctx.fillStyle = '#060911';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#ffffff';
      estrellas.forEach(s => {
        ctx.globalAlpha = Math.min(1, s.s * 0.45);
        ctx.fillRect(s.x, s.y, s.s, s.s);
      });
      ctx.globalAlpha = 1;

      zonasSolares.forEach(z => {
        if (!z.activa) return;
        const grad = ctx.createLinearGradient(z.x, z.y, z.x, z.y + z.h);
        grad.addColorStop(0, 'rgba(255, 221, 0, 0.48)');
        grad.addColorStop(1, 'rgba(255, 221, 0, 0.08)');
        ctx.fillStyle = grad;
        ctx.fillRect(z.x, z.y, z.w, z.h);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.strokeRect(z.x, z.y, z.w, z.h);
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('☀️ ZONA SOLAR +10%', z.x + 8, z.y + z.h / 2 + 4);
      });

      asteroides.forEach(ast => {
        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.rotate(ast.ang);
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const vertices = 7;
        for (let i = 0; i < vertices; i++) {
          const a = (i / vertices) * Math.PI * 2;
          const varR = ast.r * (0.8 + ((i % 3) * 0.15));
          const vx = Math.cos(a) * varR;
          const vy = Math.sin(a) * varR;
          if (i === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(-ast.r * 0.2, -ast.r * 0.2, ast.r * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      particulas.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life * 2);
        ctx.fillRect(p.x, p.y, 4, 4);
      });
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.translate(nave.x, nave.y);
      const flameH = 14 + Math.sin(nave.flameTick) * 6;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(-7, nave.h / 2 - 2);
      ctx.lineTo(7, nave.h / 2 - 2);
      ctx.lineTo(0, nave.h / 2 + flameH);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#1d4ed8';
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-nave.w / 2 - 10, -4, 11, 20);
      ctx.strokeRect(-nave.w / 2 - 10, -4, 11, 20);
      ctx.fillRect(nave.w / 2 - 1, -4, 11, 20);
      ctx.strokeRect(nave.w / 2 - 1, -4, 11, 20);

      ctx.fillStyle = (nave.flash > 0) ? '#ef4444' : ((nave.flash < 0) ? '#22c55e' : '#f8fafc');
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -nave.h / 2);
      ctx.lineTo(nave.w / 2 - 4, nave.h / 2 - 6);
      ctx.lineTo(nave.w / 2 - 8, nave.h / 2);
      ctx.lineTo(-nave.w / 2 + 8, nave.h / 2);
      ctx.lineTo(-nave.w / 2 + 4, nave.h / 2 - 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0b3d91';
      ctx.fillRect(-5, -nave.h / 4, 10, 10);
      ctx.restore();

      textosFlotantes.forEach(tf => {
        ctx.globalAlpha = tf.alpha;
        ctx.font = 'bold 12px "Press Start 2P"';
        ctx.fillStyle = tf.color;
        ctx.textAlign = 'center';
        ctx.fillText(tf.text, tf.x, tf.y);
      });
      ctx.globalAlpha = 1;

      if (tramoTerminado && estado.bateriaActual <= 50 && tiempoRestante > 0) {
        ctx.fillStyle = 'rgba(153, 27, 27, 0.88)';
        ctx.fillRect(60, H / 2 - 48, W - 120, 96);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.strokeRect(60, H / 2 - 48, W - 120, 96);
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 13px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ DERROTA EN TRÁNSITO ESPACIAL', W / 2, H / 2 - 10);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px "Press Start 2P", monospace';
        ctx.fillText(`PENALIZACIÓN APLICADA: -50% ENERGÍA (${estado.bateriaActual}% RESTANTE)`, W / 2, H / 2 + 22);
      }

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);
  }

  /**
   * Pantalla de Decisión 2 (Tormenta Solar / SPE) dentro de .marco-nasa y 3 columnas.
   */
  function renderAlertaTormenta(container, estado, diseno, evaluacion) {
    if (window.Sound?.playAlarm) window.Sound.playAlarm();
    const tieneBlindaje = Boolean(diseno.blindaje);
    const tieneRedundancia = Boolean(diseno.redundancia);
    const antenaId = diseno.antena || 'baja';

    container.innerHTML = `
      <div class="marco-nasa" style="width:95vw; max-width:1380px; margin:12px auto; text-align:left; padding:22px;">
        <span class="badge-tag" style="background:#fc3d21; color:#ffffff; border:2px solid #090d16;">
          ⚠️ ALERTA ESPACIAL CRÍTICA · FASE 2B
        </span>
        <h1 style="color:#fde047; font-size:1.05rem; margin:10px 0 8px;">
          Decisión 2: Tormenta Solar (Evento de Partículas SPE)
        </h1>
        <p style="color:#f8fafc; font-size:1rem; margin-bottom:14px;">
          Los detectores de radiación alertan de una potente eyección de masa coronal que impactará en 45 minutos.
        </p>

        <div style="background:#090d16; border:3px solid #fc3d21; padding:14px 16px; margin-bottom:18px; display:flex; gap:14px; align-items:center; flex-wrap:wrap;">
          <div style="font-size:2rem;">☀️💥</div>
          <div style="flex:1 1 500px;">
            <h3 style="color:#facc15; margin:0 0 6px 0; font-size:0.78rem;">Fulguración Solar Clase X detectada en trayectoria directa</h3>
            <p style="margin:0 0 10px 0; color:#e2e8f0; font-size:0.95rem; line-height:1.35;">
              El flujo de protones de alta energía amenaza con degradar las células de los paneles solares y sobrecargar la aviónica. Ordena el protocolo de actuación de Ares-I:
            </p>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <span style="padding:5px 10px; font-size:0.85rem; font-weight:bold; border:2px solid ${tieneBlindaje ? '#22c55e' : '#ef4444'}; background:${tieneBlindaje ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)'}; color:#f8fafc;">
                ${tieneBlindaje ? '🛡️ Blindaje Antirradiación: INSTALADO' : '⚠️ Blindaje: NO INSTALADO'}
              </span>
              <span style="padding:5px 10px; font-size:0.85rem; font-weight:bold; border:2px solid ${tieneRedundancia ? '#22c55e' : '#ef4444'}; background:${tieneRedundancia ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)'}; color:#f8fafc;">
                ${tieneRedundancia ? '🔄 Redundancia: INSTALADA' : '⚠️ Redundancia: NO INSTALADA'}
              </span>
              <span style="padding:5px 10px; font-size:0.85rem; font-weight:bold; border:2px solid #38bdf8; background:rgba(56,189,248,0.18); color:#f8fafc;">
                📡 Antena: ${antenaId === 'alta' ? 'Alta Ganancia (50 UD)' : 'Baja Ganancia (20 UD)'}
              </span>
            </div>
          </div>
        </div>

        <div class="cards-grid" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px; width:100%;">
          
          <!-- Opción 1: Modo Seguro -->
          <div class="decision-card" id="card-dec-modo-seguro" style="background:#f8fafc; color:#090d16; border:3px solid #0b3d91; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 0 #090d16;">
            <div>
              <span style="display:inline-block; background:#0b3d91; color:#fff; padding:4px 8px; font-family:'Press Start 2P', monospace; font-size:0.55rem; margin-bottom:8px;">OPCIÓN 1</span>
              <h3 style="color:#0b3d91; font-size:0.78rem; margin:0 0 10px 0;">🛡️ Modo Seguro</h3>
              <p style="color:#1e293b; font-size:0.95rem; line-height:1.35; margin-bottom:12px;">
                Orientar la nave protegiendo los sensores, plegar antenas y apagar instrumentos científicos no críticos.
              </p>
              <div style="background:#e2e8f0; border-left:4px solid #0b3d91; padding:8px 10px; margin-bottom:14px; font-size:0.9rem; color:#090d16;">
                <div>🔋 Batería: <strong>-5%</strong></div>
                <div>📡 Datos de Tránsito: <strong>-30%</strong></div>
                <div style="color:#15803d;">🛡️ Daño en Paneles: <strong>0% (Protegidos)</strong></div>
              </div>
            </div>
            <button type="button" class="btn btn-launch" id="btn-dec-seguro" style="width:100%; font-size:0.62rem; padding:12px;">
              EJECUTAR MODO SEGURO
            </button>
          </div>

          <!-- Opción 2: Maniobra Inteligente -->
          <div class="decision-card" id="card-dec-maniobra" style="background:#f8fafc; color:#090d16; border:3px solid #0b3d91; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 0 #090d16;">
            <div>
              <span style="display:inline-block; background:#0b3d91; color:#fff; padding:4px 8px; font-family:'Press Start 2P', monospace; font-size:0.55rem; margin-bottom:8px;">OPCIÓN 2</span>
              <h3 style="color:#0b3d91; font-size:0.78rem; margin:0 0 10px 0;">🧠 Maniobra Inteligente</h3>
              <p style="color:#1e293b; font-size:0.95rem; line-height:1.35; margin-bottom:12px;">
                Giro oblicuo para amortiguar el flujo solar con el chasis y enviar ráfagas cortas de telemetría comprimida.
              </p>
              <div style="background:#e2e8f0; border-left:4px solid #eab308; padding:8px 10px; margin-bottom:14px; font-size:0.9rem; color:#090d16;">
                <div>🔋 Batería: <strong>-15%</strong></div>
                <div>☀️ Daño en Paneles: <strong>5%</strong></div>
                <div>📡 Enlace: <strong>${antenaId === 'baja' ? '⚠️ Parcial (Antena Baja)' : '✅ Ráfaga completa'}</strong></div>
              </div>
            </div>
            <button type="button" class="btn btn-launch" id="btn-dec-maniobra" style="width:100%; font-size:0.62rem; padding:12px;">
              MANIOBRA INTELIGENTE
            </button>
          </div>

          <!-- Opción 3: Seguir al Máximo -->
          <div class="decision-card" id="card-dec-maximo" style="background:#f8fafc; color:#090d16; border:3px solid #fc3d21; padding:16px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 0 #090d16;">
            <div>
              <span style="display:inline-block; background:#fc3d21; color:#fff; padding:4px 8px; font-family:'Press Start 2P', monospace; font-size:0.55rem; margin-bottom:8px;">OPCIÓN 3 · ALTO RIESGO</span>
              <h3 style="color:#b91c1c; font-size:0.78rem; margin:0 0 10px 0;">⚡ Seguir al Máximo</h3>
              <p style="color:#1e293b; font-size:0.95rem; line-height:1.35; margin-bottom:12px;">
                Mantener todos los sensores científicos operando a plena potencia para registrar el interior del evento solar.
              </p>
              <div style="background:#fee2e2; border-left:4px solid #fc3d21; padding:8px 10px; margin-bottom:14px; font-size:0.9rem; color:#090d16;">
                <div>🔋 Batería: <strong>${tieneRedundancia ? '-30%' : '-40% (sin redundancia)'}</strong></div>
                <div>☀️ Daño Paneles: <strong>${tieneBlindaje ? '20% (blindado)' : '40% (sin blindaje)'}</strong></div>
                <div style="color:#15803d;">🔬 Ciencia: <strong>+15 Pts extra</strong></div>
              </div>
            </div>
            <button type="button" class="btn btn-launch" id="btn-dec-maximo" style="width:100%; font-size:0.62rem; padding:12px;">
              SEGUIR AL MÁXIMO
            </button>
          </div>

        </div>
      </div>
    `;

    conectarDecisiones(container, estado, diseno, evaluacion);
  }

  function conectarDecisiones(container, estado, diseno, evaluacion) {
    const tieneBlindaje = Boolean(diseno.blindaje);
    const tieneRedundancia = Boolean(diseno.redundancia);
    const antenaId = diseno.antena || 'baja';

    container.querySelector('#btn-dec-seguro')?.addEventListener('click', () => {
      estado.bateriaActual = Math.max(0, (estado.bateriaActual || 100) - 5);
      estado.datosTransito = Math.max(0, (estado.datosTransito || 0) - 30);
      estado.danoPaneles = (estado.danoPaneles || 0) + 0;
      estado.decision2 = 'modo_seguro';

      estado.registrarCausaEfecto(
        '2. Tránsito Interplanetario (Tormenta Solar)',
        'Modo Seguro: Instrumentos apagados y paneles replegados',
        `Batería: ${Math.round(estado.bateriaActual)}% (-5%) | Datos de tránsito: -30% | Daño paneles: 0%`,
        'Priorizar la conservación evitó daños a las celdas solares, aunque se suspendió la transmisión científica temporalmente.'
      );

      finalizarDecision2();
    });

    container.querySelector('#btn-dec-maniobra')?.addEventListener('click', () => {
      estado.bateriaActual = Math.max(0, (estado.bateriaActual || 100) - 15);
      estado.danoPaneles = (estado.danoPaneles || 0) + 5;
      estado.decision2 = 'maniobra_inteligente';

      let textoComms = 'Telemetría completa transmitida a la Red del Espacio Profundo.';
      if (antenaId === 'baja') {
        textoComms = 'Antena de baja ganancia causó que los mensajes llegaran a medias (penalización en enlace).';
        estado.commsPenalizadas = true;
      }

      estado.registrarCausaEfecto(
        '2. Tránsito Interplanetario (Tormenta Solar)',
        `Maniobra Inteligente (Giro defensivo + ráfagas con Antena ${antenaId})`,
        `Batería: ${Math.round(estado.bateriaActual)}% (-15%) | Daño paneles: +5% | ${textoComms}`,
        'La orientación oblicua mitigó el 95% de la radiación ionizante manteniendo un flujo mínimo de telemetría de navegación.'
      );

      finalizarDecision2();
    });

    container.querySelector('#btn-dec-maximo')?.addEventListener('click', () => {
      let deltaBateria = 30;
      if (!tieneRedundancia) {
        deltaBateria += 10;
        estado.falloEnCadenaRedundancia = true;
      }
      estado.bateriaActual = Math.max(0, (estado.bateriaActual || 100) - deltaBateria);

      const deltaDanoPaneles = tieneBlindaje ? 20 : 40;
      estado.danoPaneles = (estado.danoPaneles || 0) + deltaDanoPaneles;

      if (evaluacion) {
        evaluacion.ciencia = (evaluacion.ciencia || 0) + 15;
      }
      estado.decision2 = 'seguir_al_maximo';

      const textoRedundancia = tieneRedundancia
        ? 'El kit de redundancia aisló los cortocircuitos secundarios.'
        : '⚠️ Sin redundancia: se produjo un fallo en cadena en el bus de potencia (-10% batería extra).';

      const textoBlindaje = tieneBlindaje
        ? 'El blindaje antirradiación redujo el daño de celdas al 20%.'
        : 'Sin blindaje: los paneles sufrieron un 40% de daño severo por partículas alfa.';

      estado.registrarCausaEfecto(
        '2. Tránsito Interplanetario (Tormenta Solar)',
        'Seguir al Máximo: Medición científica total durante la fulguración',
        `Batería: ${Math.round(estado.bateriaActual)}% (-${deltaBateria}%) | Daño paneles: +${deltaDanoPaneles}% | +15 pts Ciencia`,
        `${textoBlindaje} ${textoRedundancia}`
      );

      finalizarDecision2();
    });
  }

  function finalizarDecision2() {
    limpiarCiclos();
    const estado = window.estadoMision;
    if (window.Engine?.evaluarDiseno && estado?.diseno) {
      const res = window.Engine.evaluarDiseno(estado.diseno, estado.presupuestoMax);
      estado.evaluacionActual = res;
      if (window.UI?.actualizarBarraRecursos) {
        window.UI.actualizarBarraRecursos(res, estado);
      }
    }

    if (window.UI?.cambiarEscena) {
      window.UI.cambiarEscena('rover');
    }
  }

  function iniciar() {
    const contenedor = document.getElementById('escena-flight');
    if (!contenedor) return;
    limpiarCiclos();
    faseActual = 'lanzamiento';
    if (window.estadoMision) window.estadoMision.lanzamientoBonus = 0;
    render(contenedor);
  }

  window.FlightScene = {
    iniciar,
    render
  };

})(typeof window !== 'undefined' ? window : this);