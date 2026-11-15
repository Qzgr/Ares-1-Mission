/**
 * Misión Ares-I: Diseña, Lanza y Sobrevive
 * js/scenes/flight.js - Escena 2: Vuelo y Tránsito Interplanetario
 * 
 * Incluye el Minijuego Arcade en Canvas 2D (Tramo 2A: 30 segundos)
 * y la Decisión 2 (Tormenta Solar / SPE).
 */

(function (window) {
  'use strict';

  let faseActual = 'lanzamiento'; // 'lanzamiento' | 'minijuego' | 'alerta'
  let animId = null;
  let timerInterval = null;
  let listenersActivos = [];

  /**
   * Limpia animaciones e intervalos previos para evitar fugas de memoria.
   */
  function limpiarCiclos() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    listenersActivos.forEach(({ elemento, evento, handler }) => {
      elemento.removeEventListener(evento, handler);
    });
    listenersActivos = [];
  }

  /**
   * Renderiza la fase activa del vuelo.
   */
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
      <div class="marco-nasa fase-lanzamiento">
        <span class="badge-tag">FASE 1 · SECUENCIA DE LANZAMIENTO</span>
        <h1>¡Despegue de Ares-I!</h1>
        <p>Mantén el empuje en la zona verde (60–85%) durante los 12 segundos de ascenso.</p>
        <div class="lanzamiento-hud">
          <strong>TIEMPO: <span id="launch-time">12.0</span> s</strong>
          <strong>POTENCIA: <span id="launch-power">50</span>%</strong>
          <strong>BONO: <span id="launch-score">0</span> pts</strong>
        </div>
        <div class="lanzamiento-medidor" role="meter" aria-label="Potencia de empuje"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
          <div class="lanzamiento-zona-verde"></div>
          <div class="lanzamiento-aguja" id="launch-needle"></div>
        </div>
        <canvas id="canvas-lanzamiento" width="640" height="360"
                aria-label="Cohete Ares-I despegando desde la plataforma"></canvas>
        <button type="button" class="btn btn-launch" id="btn-mantener-empuje"
                aria-pressed="false">MANTENER EMPUJE</button>
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

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#132247';
      ctx.fillRect(0, 0, canvas.width, 240);
      ctx.fillStyle = '#facc15';
      [[90, 50], [188, 88], [470, 43], [555, 105]].forEach(([x, y]) => ctx.fillRect(x, y, 3, 3));

      const groundY = 280;
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(242, groundY - 5, 156, 10);
      ctx.fillRect(270, groundY - 55, 10, 55);
      ctx.fillRect(360, groundY - 55, 10, 55);
      ctx.fillStyle = '#475569';
      ctx.fillRect(264, groundY - 38, 96, 8);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(276, groundY - 44, 72, 6);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(272, groundY - 144, 8, 100);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(280, groundY - 119, 16, 4);
      ctx.fillRect(280, groundY - 79, 16, 4);

      const lift = elapsed * 8;
      const yBase = groundY - 24 - lift;
      if (pushing) {
        ctx.fillStyle = power >= 60 && power <= 85 ? '#22c55e' : '#f97316';
        ctx.beginPath();
        ctx.moveTo(306, yBase - 18);
        ctx.lineTo(318, yBase + 8 + Math.random() * 8);
        ctx.lineTo(330, yBase - 18);
        ctx.fill();
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(278, 0, 76, yBase - 18);
      ctx.clip();
      window.Sprites.dibujarCoheteModular(ctx, 300, yBase, diseno, 4);
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
   * Tramo 2A: Minijuego en Canvas 2D (30 segundos).
   */
  function renderMinijuego(container, estado, diseno, evaluacion) {
    container.innerHTML = `
      <div class="escena-header">
        <div class="escena-titulo">
          <span class="badge-tag">Fase 2 • Tránsito Espacial (Tramo 2A)</span>
          <h1>Navegación en el Cinturón de Escombros (30s)</h1>
          <p>Usa las Flechas o A/D (o botones táctiles) para mover la sonda Ares-I. Esquiva los asteroides y atraviesa las zonas solares.</p>
        </div>
      </div>

      <div class="minijuego-box">
        <div class="minijuego-barra-superior">
          <div class="minijuego-info-left">
            <span>⏱️ TIEMPO: <strong class="minijuego-hud-timer" id="hud-timer-flight">30s</strong></span>
            <span>🔋 BATERÍA: <strong id="hud-bateria-flight" style="color: var(--cyan-glow)">${estado.bateriaActual || 100}%</strong></span>
          </div>
          <button type="button" class="btn-secondary" id="btn-abandonar-tramo-flight"
                  style="border-color: var(--neon-orange); color: var(--neon-orange)">
            ⚠ ABANDONAR TRAMO (0 PTS)
          </button>
        </div>

        <div class="canvas-wrapper">
          <canvas id="canvas-flight" class="arcade-canvas" width="640" height="360"></canvas>
        </div>

        <!-- Controles táctiles para celulares -->
        <div class="touch-controls">
          <button type="button" class="btn-touch" id="btn-touch-left">◀️ IZQUIERDA</button>
          <button type="button" class="btn-touch" id="btn-touch-right">DERECHA ▶️</button>
        </div>
      </div>
    `;

    container.querySelector('#btn-abandonar-tramo-flight')?.addEventListener('click', () => {
      const mision = window.estadoMision;
      if (!mision || faseActual !== 'minijuego') return;
      const tramosSaltados = Number(mision.tramosSaltados);
      mision.tramosSaltados = (Number.isFinite(tramosSaltados) ? Math.max(0, tramosSaltados) : 0) + 1;
      mision.lanzamientoBonus = 0;
      mision.muestrasRecolectadas = 0;
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
      limpiarCiclos();
      faseActual = 'alerta';
      render(container);
    });

    iniciarLoopCanvasFlight(container, estado, evaluacion);
  }

  /**
   * Lógica y ciclo de dibujo del Canvas 2D en Tramo 2A.
   */
  function iniciarLoopCanvasFlight(container, estado, evaluacion) {
    const canvas = container.querySelector('#canvas-flight');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const W = canvas.width;
    const H = canvas.height;

    // Estado del jugador
    const nave = {
      x: W / 2,
      y: H - 55,
      w: 38,
      h: 46,
      vx: 0,
      vel: 340,
      flash: 0, // >0 si chocó (rojo), <0 si recargó (dorado)
      flameTick: 0
    };

    // Estrellas de fondo parallax
    const estrellas = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: 0.5 + Math.random() * 2.5,
      speed: 40 + Math.random() * 120
    }));

    // Objetos en caída
    let asteroides = [];
    let zonasSolares = [];
    let textosFlotantes = [];
    let particulas = [];

    let tiempoRestante = 30;
    const hudTimer = container.querySelector('#hud-timer-flight');
    const hudBateria = container.querySelector('#hud-bateria-flight');

    // Intervalo de cuenta regresiva
    timerInterval = setInterval(() => {
      tiempoRestante--;
      if (hudTimer) hudTimer.textContent = `${tiempoRestante}s`;
      if (tiempoRestante <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        // Al llegar el reloj a 0, congelar y pasar a la alerta de tormenta
        setTimeout(() => {
          limpiarCiclos();
          faseActual = 'alerta';
          render(container);
        }, 300);
      }
    }, 1000);

    // Controles de teclado
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

    // Controles táctiles
    const btnLeft = container.querySelector('#btn-touch-left');
    const btnRight = container.querySelector('#btn-touch-right');

    const bindTouch = (elem, tecla) => {
      if (!elem) return;
      const start = (e) => { e.preventDefault(); teclas[tecla] = true; };
      const end = (e) => { e.preventDefault(); teclas[tecla] = false; };
      elem.addEventListener('mousedown', start);
      elem.addEventListener('mouseup', end);
      elem.addEventListener('mouseleave', end);
      elem.addEventListener('touchstart', start, { passive: false });
      elem.addEventListener('touchend', end, { passive: false });
    };

    bindTouch(btnLeft, 'izquierda');
    bindTouch(btnRight, 'derecha');

    // Generador de asteroides y zonas solares
    let spawnAsteroidTick = 0;
    let spawnSolarTick = 0;
    let lastTime = performance.now();

    function loop(now) {
      const dt = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;

      // 1. Actualizar movimiento de nave
      nave.vx = 0;
      if (teclas.izquierda) nave.vx -= nave.vel;
      if (teclas.derecha) nave.vx += nave.vel;
      nave.x += nave.vx * dt;
      nave.x = Math.max(nave.w / 2 + 10, Math.min(W - nave.w / 2 - 10, nave.x));
      nave.flameTick += dt * 15;

      if (nave.flash > 0) nave.flash = Math.max(0, nave.flash - dt * 2.5);
      if (nave.flash < 0) nave.flash = Math.min(0, nave.flash + dt * 2.5);

      // 2. Fondo de estrellas
      estrellas.forEach(star => {
        star.y += star.speed * dt;
        if (star.y > H) {
          star.y = 0;
          star.x = Math.random() * W;
        }
      });

      // 3. Spawns
      spawnAsteroidTick += dt;
      if (spawnAsteroidTick > 0.85) {
        spawnAsteroidTick = 0;
        asteroides.push({
          x: 25 + Math.random() * (W - 50),
          y: -25,
          r: 12 + Math.random() * 14,
          vy: 140 + Math.random() * 90,
          ang: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 3
        });
      }

      spawnSolarTick += dt;
      if (spawnSolarTick > 2.8) {
        spawnSolarTick = 0;
        zonasSolares.push({
          x: 40 + Math.random() * (W - 120),
          y: -40,
          w: 75 + Math.random() * 30,
          h: 40 + Math.random() * 20,
          vy: 110,
          activa: true
        });
      }

      // 4. Actualizar asteroides y colisiones
      asteroides.forEach(ast => {
        ast.y += ast.vy * dt;
        ast.ang += ast.spin * dt;

        // Colisión con la nave Ares-I
        const dx = ast.x - nave.x;
        const dy = ast.y - nave.y;
        const dist = Math.hypot(dx, dy);

        if (dist < ast.r + nave.w / 2.2) {
          // Impacto: Chocar resta 3% de batería
          estado.bateriaActual = Math.max(0, (estado.bateriaActual || 100) - 3);
          nave.flash = 1; // flash rojo
          textosFlotantes.push({ text: '-3% BATERÍA', x: nave.x, y: nave.y - 20, color: '#ff3344', alpha: 1 });

          // Partículas de chispas
          for (let p = 0; p < 8; p++) {
            particulas.push({
              x: ast.x, y: ast.y,
              vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160,
              color: '#ffdd00', life: 0.4
            });
          }

          // Eliminar asteroide
          ast.y = H + 200;

          if (hudBateria) hudBateria.textContent = `${estado.bateriaActual}%`;
          if (window.UI?.actualizarBarraRecursos) {
            window.UI.actualizarBarraRecursos(evaluacion, estado);
          }
        }
      });
      asteroides = asteroides.filter(a => a.y <= H + 50);

      // 5. Actualizar zonas solares y recargas
      zonasSolares.forEach(zona => {
        zona.y += zona.vy * dt;

        if (zona.activa) {
          // Bounding box overlap con nave
          const colX = nave.x + nave.w / 2 > zona.x && nave.x - nave.w / 2 < zona.x + zona.w;
          const colY = nave.y + nave.h / 2 > zona.y && nave.y - nave.h / 2 < zona.y + zona.h;

          if (colX && colY) {
            // Pasar por ellas recarga hasta +10% de batería
            const prev = estado.bateriaActual || 100;
            estado.bateriaActual = Math.min(100, prev + 10);
            const delta = estado.bateriaActual - prev;

            zona.activa = false;
            nave.flash = -1; // flash dorado
            textosFlotantes.push({ text: `+${delta}% RECARGA`, x: nave.x, y: nave.y - 25, color: '#00ff66', alpha: 1 });

            // Partículas solares
            for (let p = 0; p < 10; p++) {
              particulas.push({
                x: nave.x + (Math.random() - 0.5) * 30, y: nave.y + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 80, vy: -50 - Math.random() * 80,
                color: '#00f0ff', life: 0.5
              });
            }

            if (hudBateria) hudBateria.textContent = `${estado.bateriaActual}%`;
            if (window.UI?.actualizarBarraRecursos) {
              window.UI.actualizarBarraRecursos(evaluacion, estado);
            }
          }
        }
      });
      zonasSolares = zonasSolares.filter(z => z.y <= H + 60);

      // 6. Textos flotantes y partículas
      textosFlotantes.forEach(tf => {
        tf.y -= 35 * dt;
        tf.alpha -= 1.1 * dt;
      });
      textosFlotantes = textosFlotantes.filter(tf => tf.alpha > 0);

      particulas.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      });
      particulas = particulas.filter(p => p.life > 0);

      // --- DIBUJADO CANVAS ---
      ctx.fillStyle = '#060911';
      ctx.fillRect(0, 0, W, H);

      // Dibujar estrellas
      ctx.fillStyle = '#ffffff';
      estrellas.forEach(s => {
        ctx.globalAlpha = Math.min(1, s.s * 0.45);
        ctx.fillRect(s.x, s.y, s.s, s.s);
      });
      ctx.globalAlpha = 1;

      // Dibujar zonas solares (anillos / bandas doradas)
      zonasSolares.forEach(z => {
        if (!z.activa) return;
        const grad = ctx.createLinearGradient(z.x, z.y, z.x, z.y + z.h);
        grad.addColorStop(0, 'rgba(255, 221, 0, 0.45)');
        grad.addColorStop(0.5, 'rgba(255, 170, 0, 0.25)');
        grad.addColorStop(1, 'rgba(255, 221, 0, 0.05)');
        ctx.fillStyle = grad;
        ctx.fillRect(z.x, z.y, z.w, z.h);

        ctx.strokeStyle = 'rgba(255, 221, 0, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(z.x, z.y, z.w, z.h);

        // Icono solar
        ctx.fillStyle = '#ffea00';
        ctx.font = '10px "Share Tech Mono"';
        ctx.fillText('☀️ ZONA SOLAR +10%', z.x + 8, z.y + z.h / 2 + 3);
      });

      // Dibujar asteroides
      asteroides.forEach(ast => {
        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.rotate(ast.ang);

        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;

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

        // Cráter central
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(-ast.r * 0.2, -ast.r * 0.2, ast.r * 0.28, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Dibujar partículas
      particulas.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life * 2);
        ctx.fillRect(p.x, p.y, 3, 3);
      });
      ctx.globalAlpha = 1;

      // Dibujar nave Ares-I (Pixel-art espacial)
      ctx.save();
      ctx.translate(nave.x, nave.y);

      // Llama propulsora animada
      const flameH = 12 + Math.sin(nave.flameTick) * 5;
      const gradF = ctx.createLinearGradient(0, nave.h / 2, 0, nave.h / 2 + flameH);
      gradF.addColorStop(0, '#00f0ff');
      gradF.addColorStop(0.5, '#f97316');
      gradF.addColorStop(1, 'transparent');
      ctx.fillStyle = gradF;
      ctx.beginPath();
      ctx.moveTo(-6, nave.h / 2 - 2);
      ctx.lineTo(6, nave.h / 2 - 2);
      ctx.lineTo(0, nave.h / 2 + flameH);
      ctx.closePath();
      ctx.fill();

      // Efecto flash si choca o recarga
      if (nave.flash > 0) {
        ctx.shadowColor = '#ff3344';
        ctx.shadowBlur = 18;
      } else if (nave.flash < 0) {
        ctx.shadowColor = '#00ff66';
        ctx.shadowBlur = 18;
      } else {
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
      }

      // Paneles solares laterales de la nave
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      // Panel izq
      ctx.fillRect(-nave.w / 2 - 8, -4, 9, 18);
      ctx.strokeRect(-nave.w / 2 - 8, -4, 9, 18);
      // Panel der
      ctx.fillRect(nave.w / 2 - 1, -4, 9, 18);
      ctx.strokeRect(nave.w / 2 - 1, -4, 9, 18);

      // Chasis fuselaje central
      ctx.fillStyle = (nave.flash > 0) ? '#ff3344' : ((nave.flash < 0) ? '#00ff66' : '#f1f5f9');
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(0, -nave.h / 2);
      ctx.lineTo(nave.w / 2 - 4, nave.h / 2 - 6);
      ctx.lineTo(nave.w / 2 - 8, nave.h / 2);
      ctx.lineTo(-nave.w / 2 + 8, nave.h / 2);
      ctx.lineTo(-nave.w / 2 + 4, nave.h / 2 - 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ventanilla / núcleo
      ctx.fillStyle = '#060911';
      ctx.fillRect(-4, -nave.h / 4, 8, 8);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(-2, -nave.h / 4 + 2, 4, 4);

      ctx.restore();

      // Textos flotantes
      textosFlotantes.forEach(tf => {
        ctx.globalAlpha = tf.alpha;
        ctx.font = 'bold 11px "Press Start 2P"';
        ctx.fillStyle = tf.color;
        ctx.textAlign = 'center';
        ctx.fillText(tf.text, tf.x, tf.y);
      });
      ctx.globalAlpha = 1;

      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);
  }

  /**
   * Pantalla de Decisión 2 (Tormenta Solar / SPE).
   */
  function renderAlertaTormenta(container, estado, diseno, evaluacion) {
    const tieneBlindaje = Boolean(diseno.blindaje);
    const tieneRedundancia = Boolean(diseno.redundancia);
    const antenaId = diseno.antena || 'baja';

    container.innerHTML = `
      <div class="escena-header">
        <div class="escena-titulo">
          <span class="badge-tag" style="background: rgba(239, 68, 68, 0.15); color: var(--color-red); border-color: var(--color-red)">
            ⚠️ Alerta Espacial Crítica
          </span>
          <h1>Decisión 2: Tormenta Solar (Evento de Partículas SPE)</h1>
          <p>Los detectores de radiación alertan de una potente eyección de masa coronal que impactará en 45 minutos.</p>
        </div>
      </div>

      <div class="decision-container alerta-tormenta">
        <!-- Resumen de situación y protecciones instaladas -->
        <div class="alerta-banner">
          <div class="alerta-icono">☀️💥</div>
          <div class="alerta-texto">
            <h3>Fulguración Solar Clase X detectada en trayectoria directa</h3>
            <p>
              El flujo de protones de alta energía amenaza con degradar las células de los paneles solares y sobrecargar 
              la aviónica. Debes ordenar el protocolo de actuación de la nave Ares-I.
            </p>
            <div class="protecciones-status">
              <span class="badge-micro ${tieneBlindaje ? 'badge-ok' : 'badge-warn'}">
                ${tieneBlindaje ? '🛡️ Blindaje Antirradiación: INSTALADO' : '⚠️ Blindaje: NO INSTALADO'}
              </span>
              <span class="badge-micro ${tieneRedundancia ? 'badge-ok' : 'badge-warn'}">
                ${tieneRedundancia ? '🔄 Redundancia de Sistemas: INSTALADA' : '⚠️ Redundancia: NO INSTALADA'}
              </span>
              <span class="badge-micro">
                📡 Antena: ${antenaId === 'alta' ? 'Alta Ganancia (50 UD)' : 'Baja Ganancia (20 UD)'}
              </span>
            </div>
          </div>
        </div>

        <!-- LAS 3 OPCIONES CON SUS REGLAS EXACTAS -->
        <div class="decisiones-grid">
          
          <!-- Opción 1: Modo Seguro -->
          <div class="decision-card" id="card-dec-modo-seguro">
            <div class="decision-card-top">
              <span class="decision-num">Opción 1</span>
              <h3 class="decision-titulo">🛡️ Modo Seguro</h3>
            </div>
            <p class="decision-desc">
              Orientar la nave protegiendo los sensores, plegar antenas y apagar instrumentos científicos no críticos.
            </p>
            <div class="decision-impactos">
              <div class="impacto-line negativo"><span>Batería:</span> <strong>-5%</strong></div>
              <div class="impacto-line negativo"><span>Datos de Tránsito:</span> <strong>Pierdes 30%</strong></div>
              <div class="impacto-line positivo"><span>Daño en Paneles:</span> <strong>0% (Protegidos)</strong></div>
            </div>
            <button type="button" class="btn-decision" id="btn-dec-seguro">
              Ejecutar Modo Seguro
            </button>
          </div>

          <!-- Opción 2: Maniobra Inteligente -->
          <div class="decision-card" id="card-dec-maniobra">
            <div class="decision-card-top">
              <span class="decision-num">Opción 2</span>
              <h3 class="decision-titulo">🧠 Maniobra Inteligente</h3>
            </div>
            <p class="decision-desc">
              Giro oblicuo para amortiguar el flujo solar con el chasis y enviar ráfagas cortas de telemetría comprimida.
            </p>
            <div class="decision-impactos">
              <div class="impacto-line negativo"><span>Batería:</span> <strong>-15%</strong></div>
              <div class="impacto-line negativo"><span>Daño en Paneles:</span> <strong>5%</strong></div>
              <div class="impacto-line neutro">
                <span>Comunicaciones:</span> 
                <strong>${antenaId === 'baja' ? '⚠️ Mensaje a medias (Antena Baja)' : '✅ Ráfaga completa transmitida'}</strong>
              </div>
            </div>
            <button type="button" class="btn-decision" id="btn-dec-maniobra">
              Ejecutar Maniobra Inteligente
            </button>
          </div>

          <!-- Opción 3: Seguir al Máximo -->
          <div class="decision-card" id="card-dec-maximo">
            <div class="decision-card-top">
              <span class="decision-num">Opción 3</span>
              <h3 class="decision-titulo">⚡ Seguir al Máximo</h3>
            </div>
            <p class="decision-desc">
              Mantener todos los sensores científicos operando a plena potencia para registrar el interior del evento solar.
            </p>
            <div class="decision-impactos">
              <div class="impacto-line ${tieneRedundancia ? 'negativo' : 'peligro'}">
                <span>Batería:</span> 
                <strong>${tieneRedundancia ? '-30%' : '-40% (-10% extra por fallo en cadena)'}</strong>
              </div>
              <div class="impacto-line negativo">
                <span>Daño en Paneles:</span> 
                <strong>${tieneBlindaje ? '20% (Atenuado por Blindaje)' : '40% (Sin protección)'}</strong>
              </div>
              <div class="impacto-line positivo">
                <span>Retorno Científico:</span> 
                <strong>+15 Pts de Ciencia extra</strong>
              </div>
            </div>
            <button type="button" class="btn-decision" id="btn-dec-maximo">
              Seguir al Máximo
            </button>
          </div>

        </div>
      </div>
    `;

    conectarDecisiones(container, estado, diseno, evaluacion);
  }

  /**
   * Conecta los eventos de las 3 opciones de la Decisión 2.
   */
  function conectarDecisiones(container, estado, diseno, evaluacion) {
    const tieneBlindaje = Boolean(diseno.blindaje);
    const tieneRedundancia = Boolean(diseno.redundancia);
    const antenaId = diseno.antena || 'baja';

    // 1. Modo Seguro
    container.querySelector('#btn-dec-seguro')?.addEventListener('click', () => {
      estado.bateriaActual = Math.max(0, (estado.bateriaActual || 100) - 5);
      estado.datosTransito = Math.max(0, (estado.datosTransito || 0) - 30);
      estado.danoPaneles = (estado.danoPaneles || 0) + 0;
      estado.decision2 = 'modo_seguro';

      estado.registrarCausaEfecto(
        '2. Tránsito Interplanetario (Tormenta Solar)',
        'Modo Seguro: Instrumentos apagados y paneles replegados',
        `Batería: ${estado.bateriaActual}% (-5%) | Datos de tránsito: -30% | Daño paneles: 0%`,
        'Priorizar la conservación evitó daños a las celdas solares, aunque se suspendió la transmisión científica temporalmente.'
      );

      finalizarDecision2();
    });

    // 2. Maniobra Inteligente
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
        `Batería: ${estado.bateriaActual}% (-15%) | Daño paneles: +5% | ${textoComms}`,
        'La orientación oblicua mitigó el 95% de la radiación ionizante manteniendo un flujo mínimo de telemetría de navegación.'
      );

      finalizarDecision2();
    });

    // 3. Seguir al Máximo
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
        `Batería: ${estado.bateriaActual}% (-${deltaBateria}%) | Daño paneles: +${deltaDanoPaneles}% | +15 pts Ciencia`,
        `${textoBlindaje} ${textoRedundancia}`
      );

      finalizarDecision2();
    });
  }

  /**
   * Finaliza la Decisión 2 y avanza a la Escena 3 (Rover).
   */
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

  /**
   * Inicializa la Escena 2.
   */
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
