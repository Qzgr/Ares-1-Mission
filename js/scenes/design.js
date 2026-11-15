/**
 * Misión Ares-I – js/scenes/design.js
 * Taller de diseño con canvas de ensamblaje paso a paso (1→2→3→4)
 * y astronautas animados de fondo.
 */
(function (window) {
  'use strict';

  /* ─── estado local del taller ─── */
  let pasoActual = 1;           // 1-4
  let animInterval = null;      // setInterval del canvas
  let astronFrame = 0;          // 0 | 1 (alternancia camina)
  let astronBob = 0;            // sub-píxel bobbing
  let initialized = false;

  /* ─── tooltips educativos ─── */
  const TOOLTIPS = {
    ligero: 'Cohete Ligero: Máxima economía y rapidez, pero carga útil limitada a 400 kg.',
    medio:  'Cohete Medio: Balance óptimo (700 kg / 94% fiabilidad), cuesta 140 M$ y +2 meses.',
    pesado: 'Cohete Pesado: 1100 kg a un costo astronómico (260 M$), devora el presupuesto.',
    S: 'Panel Solar S: Ligero y barato, pero sus 200 W apenas cubren la aviónica básica.',
    M: 'Panel Solar M: 400 W estables para sensores; añade 55 kg.',
    L: 'Panel Solar L: 700 W para taladro y radar; penaliza con 90 kg y 35 M$.',
    basica:   'Batería Básica: 600 Wh, ligera, pero se agota en tormentas de polvo.',
    avanzada: 'Batería Avanzada: 1200 Wh nocturna, +45 kg y 20 M$.',
    baja:  'Antena Baja Ganancia: Consumo mínimo, 20 UD; dependes del relay.',
    alta:  'Antena Alta Ganancia: 50 UD para alta resolución; consume 60 W y 30 kg.',
    blindaje:    'Blindaje Antirradiación: Protege en tormentas solares; +15 kg sin generar ciencia.',
    redundancia: 'Kit de Redundancia: Evita fallos en cadena; +10 kg, 10 M$ y 1 mes.',
    camaraPan:    'Cámara Panorámica: 10 pts científicos, ligera y económica.',
    camaraAlta:   'Cámara Alta Resolución: 25 pts, exige 60 W y 30 kg.',
    espectrometro:'Espectrómetro: 30 pts detectando minerales; 30 M$ y 40 W.',
    radar:  'Radar de Subsuelo: detecta hielo enterrado; 55 W, 35 kg, 50 M$.',
    meteo:  'Estación Meteorológica: Ligera (5 kg), 10 W, 8 pts.',
    taladro:'Taladro: Máximo valor (40 pts) accediendo al subsuelo; 40 kg y 70 W.',
    ninguno:        'Sin Relay: 0 M$, cobertura fija 40%.',
    baja:          'Órbita Baja Relay: 65% cobertura, 25 M$, 25 kg.',
    eliptica:      'Órbita Elíptica Relay: 80% cobertura, 32 M$, 30 kg.',
    areoestacionaria:'Areoestacionaria: 95% cobertura permanente, 50 M$, +3 meses.'
  };

  /* ─── helpers HTML ─── */
  function specLine(label, val) {
    return `<div class="spec-line"><span>${label}:</span><span class="spec-val">${val}</span></div>`;
  }

  function opcionCard(tipo, item, extraSpecs) {
    const tip = (TOOLTIPS[item.id] || '').replace(/"/g, '&quot;');
    return `
      <div class="opcion-card" data-tipo="${tipo}" data-id="${item.id}"
           data-tooltip="${tip}" role="button" tabindex="0">
        <div class="opcion-top">
          <canvas data-icono="${tipo === 'cohete' ? 'cohete' : tipo === 'relay' ? 'relay' : tipo === 'panel' || tipo === 'bateria' || tipo === 'antena' ? 'nave' : 'cohete'}"
                  data-escala="2" style="width:24px;height:24px;"></canvas>
          <span class="opcion-nombre">${item.nombre}</span>
          <input type="radio" name="radio-${tipo}" value="${item.id}">
        </div>
        <div class="opcion-specs">${extraSpecs}</div>
      </div>`;
  }

  function checkCard(id, label, detalles, tip) {
    const safeTip = (tip || '').replace(/"/g, '&quot;');
    return `
      <label class="checkbox-card" id="card-${id}" data-tooltip="${safeTip}">
        <input type="checkbox" id="check-${id}">
        <div class="checkbox-info">
          <div class="checkbox-nombre">${label}</div>
          <div class="checkbox-detalles">${detalles}</div>
        </div>
      </label>`;
  }

  /* ─── render HTML completo ─── */
  function render(container) {
    const data = window.DATA || {};

    const coheteCards = Object.values(data.cohetes || {}).map(c =>
      opcionCard('cohete', c,
        specLine('Capacidad', c.capacidad + ' kg') +
        specLine('Costo', c.costo + ' M$') +
        specLine('Fiabilidad', Math.round(c.fiabilidad * 100) + '%') +
        specLine('Plazo', '+' + c.meses + ' m')
      )
    ).join('');

    const panelCards = Object.values(data.paneles || {}).map(p =>
      opcionCard('panel', p,
        specLine('Potencia', (p.potenciaW || p.consumoW || 0) + ' W') +
        specLine('Masa', p.masa + ' kg') +
        specLine('Costo', p.costo + ' M$')
      )
    ).join('');

    const batCards = Object.values(data.baterias || {}).map(b =>
      opcionCard('bateria', b,
        specLine('Capacidad', (b.capacidadWh || b.wh || 0) + ' Wh') +
        specLine('Masa', b.masa + ' kg') +
        specLine('Costo', b.costo + ' M$')
      )
    ).join('');

    const antCards = Object.values(data.antenas || {}).map(a =>
      opcionCard('antena', a,
        specLine('Ancho Banda', (a.datosUD || a.ud || 0) + ' UD') +
        specLine('Consumo', (a.consumoW || 0) + ' W') +
        specLine('Masa', a.masa + ' kg') +
        specLine('Costo', a.costo + ' M$')
      )
    ).join('');

    const instCards = Object.values(data.instrumentos || {}).map(inst => {
      const tip = (TOOLTIPS[inst.id] || '').replace(/"/g, '&quot;');
      return `
        <label class="checkbox-card" id="card-inst-${inst.id}" data-tooltip="${tip}">
          <input type="checkbox" name="instrumento" value="${inst.id}">
          <div class="checkbox-info">
            <div class="checkbox-nombre">${inst.nombre}</div>
            <div class="checkbox-detalles">
              <span class="badge-micro badge-ciencia">🔬 Ciencia: +${inst.ciencia} pts</span>
              <span class="badge-micro">⚡ ${inst.consumoW} W</span>
              <span class="badge-micro">⚖️ ${inst.masa} kg</span>
              <span class="badge-micro">💰 ${inst.costo} M$</span>
            </div>
          </div>
        </label>`;
    }).join('');

    const relayCards = Object.values(data.relays || {}).map(r =>
      opcionCard('relay', r,
        specLine('Cobertura', Math.round((r.cobertura || r.cob || 0) * 100) + '%') +
        specLine('Masa', r.masa + ' kg') +
        specLine('Costo', r.costo + ' M$') +
        specLine('Plazo', '+' + r.meses + ' m')
      )
    ).join('');

    container.innerHTML = `
<div class="marco-nasa" id="taller-wrapper">

  <!-- BARRA DE PASOS -->
  <div class="pasos-ensamblaje" id="pasos-bar">
    <div class="paso-pill ${pasoActual===1?'activo':'completado'}" data-paso="1">① COHETE</div>
    <div class="paso-pill ${pasoActual===2?'activo':pasoActual>2?'completado':''}" data-paso="2">② NAVE</div>
    <div class="paso-pill ${pasoActual===3?'activo':pasoActual>3?'completado':''}" data-paso="3">③ CIENCIA</div>
    <div class="paso-pill ${pasoActual===4?'activo':''}" data-paso="4">④ RELAY</div>
  </div>

  <!-- CANVAS TALLER -->
  <canvas id="canvas-taller" width="760" height="230"
          style="width:100%;max-width:760px;"></canvas>

  <!-- PASO 1: COHETE -->
  <div class="paso-seccion" id="paso-1" ${pasoActual!==1?'style="display:none"':''}>
    <h2>🚀 Paso 1 — Vehículo de Lanzamiento</h2>
    <p>Elige el cohete. Determina la carga útil máxima y la probabilidad de éxito.</p>
    <div class="opciones-grid" id="grid-cohetes">${coheteCards}</div>
    <div class="paso-nav">
      <button type="button" class="btn btn-launch" id="btn-p1-next">SIGUIENTE: NAVE ➔</button>
    </div>
  </div>

  <!-- PASO 2: NAVE -->
  <div class="paso-seccion" id="paso-2" ${pasoActual!==2?'style="display:none"':''}>
    <h2>🛸 Paso 2 — Subsistemas de la Nave</h2>

    <h3>☀️ Paneles Solares</h3>
    <div class="opciones-grid" id="grid-paneles">${panelCards}</div>

    <h3>🔋 Baterías</h3>
    <div class="opciones-grid" id="grid-baterias">${batCards}</div>

    <h3>📡 Antena de Comunicación</h3>
    <div class="opciones-grid" id="grid-antenas">${antCards}</div>

    <h3>🛡️ Protecciones</h3>
    <div class="opciones-grid">
      ${checkCard('blindaje', 'Blindaje Antirradiación',
          '<span class="badge-micro">⚖️ 15 kg</span><span class="badge-micro">💰 12 M$</span>',
          TOOLTIPS.blindaje)}
      ${checkCard('redundancia', 'Kit de Redundancia',
          '<span class="badge-micro">⚖️ 10 kg</span><span class="badge-micro">💰 10 M$</span><span class="badge-micro">⏳ +1 m</span>',
          TOOLTIPS.redundancia)}
    </div>

    <div class="paso-nav">
      <button type="button" class="btn" id="btn-p2-back">⬅ ATRÁS</button>
      <button type="button" class="btn btn-launch" id="btn-p2-next">SIGUIENTE: CIENCIA ➔</button>
    </div>
  </div>

  <!-- PASO 3: CIENCIA -->
  <div class="paso-seccion" id="paso-3" ${pasoActual!==3?'style="display:none"':''}>
    <h2>🔬 Paso 3 — Instrumentos Científicos
      <span class="tab-badge" id="badge-contador-inst">0/4</span>
    </h2>
    <p>Selecciona hasta 4 sensores. Equilibra ciencia, masa y consumo.</p>
    <div class="opciones-grid" id="grid-instrumentos">${instCards}</div>
    <div class="paso-nav">
      <button type="button" class="btn" id="btn-p3-back">⬅ ATRÁS</button>
      <button type="button" class="btn btn-launch" id="btn-p3-next">SIGUIENTE: RELAY ➔</button>
    </div>
  </div>

  <!-- PASO 4: RELAY + SEMÁFORO + LANZAR -->
  <div class="paso-seccion" id="paso-4" ${pasoActual!==4?'style="display:none"':''}>
    <h2>🛰️ Paso 4 — Mini-Satélite Relay</h2>
    <div class="opciones-grid" id="grid-relays">${relayCards}</div>

    <!-- Semáforo de seguridad -->
    <h2 style="margin-top:18px;">🚦 Panel de Revisión de Seguridad</h2>
    <div class="semaforo-grid">
      <div class="sem-item" id="sem-masa">
        <div class="sem-label">Masa vs Cohete</div>
        <div class="sem-valor" id="val-sem-masa">-- / -- kg</div>
        <div class="sem-msg"   id="msg-sem-masa">Verificando...</div>
      </div>
      <div class="sem-item" id="sem-costo">
        <div class="sem-label">Presupuesto</div>
        <div class="sem-valor" id="val-sem-costo">-- / -- M$</div>
        <div class="sem-msg"   id="msg-sem-costo">Verificando...</div>
      </div>
      <div class="sem-item" id="sem-energia">
        <div class="sem-label">Balance Energía</div>
        <div class="sem-valor" id="val-sem-energia">--%</div>
        <div class="sem-msg"   id="msg-sem-energia">Verificando...</div>
      </div>
      <div class="sem-item" id="sem-datos">
        <div class="sem-label">Capacidad TX / datos generados</div>
        <div class="sem-valor" id="val-sem-datos">-- / -- UD</div>
        <div class="sem-msg"   id="msg-sem-datos">Verificando...</div>
      </div>
      <div class="sem-item" id="sem-meses">
        <div class="sem-label">Plazo (28 m)</div>
        <div class="sem-valor" id="val-sem-meses">-- / 28 m</div>
        <div class="sem-msg"   id="msg-sem-meses">Verificando...</div>
      </div>
    </div>

    <div class="paso-nav" style="margin-top:20px;">
      <button type="button" class="btn" id="btn-p4-back">⬅ ATRÁS</button>
      <button type="button" class="btn btn-launch" id="btn-lanzar" disabled>🚀 LANZAR MISIÓN</button>
    </div>
  </div>

</div><!-- fin .marco-nasa -->
`;
  }

  /* ─── navegación entre pasos ─── */
  function irPaso(n) {
    pasoActual = n;
    [1,2,3,4].forEach(i => {
      const sec = document.getElementById('paso-' + i);
      if (sec) sec.style.display = i === n ? '' : 'none';
    });
    // actualizar pills
    document.querySelectorAll('.paso-pill').forEach(p => {
      const pi = parseInt(p.dataset.paso);
      p.className = 'paso-pill ' + (pi === n ? 'activo' : pi < n ? 'completado' : '');
    });
    if (window.Sprites?.pintarIconosDOM) window.Sprites.pintarIconosDOM();
    evaluarYActualizarUI();
  }

  /* ─── canvas animado del taller ─── */
  function iniciarCanvas() {
    const cv = document.getElementById('canvas-taller');
    if (!cv || !window.Sprites) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;

    let frame = 0;
    if (animInterval) clearInterval(animInterval);

    animInterval = setInterval(() => {
      frame++;
      const diseno = window.estadoMision?.diseno || {};

      // fondo
      const ySuelo = window.Sprites.dibujarEscenarioMarte(ctx, W, H, {
        conSubsuelo: false,
        conBase: true
      });

      // cohete en construcción
      window.Sprites.dibujarCoheteModular(ctx, 130, ySuelo, diseno, pasoActual);

      // astronautas animados (bobbing 1 px)
      const bob = frame % 2 === 0 ? 0 : -1;
      const anim = frame % 8 < 4 ? 'camina1' : 'camina2';
      const personajes = [
        { id: 'dan',  x: 320 },
        { id: 'ana',  x: 380 },
        { id: 'leo',  x: 440 },
        { id: 'maya', x: 500 }
      ];
      personajes.forEach(p => {
        window.Sprites.dibujarAstronauta(ctx, p.id, p.x, ySuelo - 52 + bob, {
          escala: 2,
          estado: anim,
          voltear: true,
          mostrarNombre: true
        });
      });
    }, 400);
  }

  /* ─── sincronizar controles desde estado ─── */
  function sincronizarControles() {
    const estado = window.estadoMision;
    if (!estado?.diseno) return;
    const d = estado.diseno;

    marcarRadio('radio-cohete',  d.cohete);
    marcarRadio('radio-panel',   d.panel);
    marcarRadio('radio-bateria', d.bateria);
    marcarRadio('radio-antena',  d.antena);
    marcarRadio('radio-relay',   d.relay);

    const cb = document.getElementById('check-blindaje');
    if (cb) { cb.checked = Boolean(d.blindaje); document.getElementById('card-blindaje')?.classList.toggle('selected', cb.checked); }
    const cr = document.getElementById('check-redundancia');
    if (cr) { cr.checked = Boolean(d.redundancia); document.getElementById('card-redundancia')?.classList.toggle('selected', cr.checked); }

    const checksInst = document.querySelectorAll('input[name="instrumento"]');
    const elegidos = Array.isArray(d.instrumentos) ? d.instrumentos : [];
    checksInst.forEach(chk => {
      chk.checked = elegidos.includes(chk.value);
      document.getElementById('card-inst-' + chk.value)?.classList.toggle('selected', chk.checked);
    });
  }

  function marcarRadio(name, valor) {
    const r = document.querySelector(`input[name="${name}"][value="${valor}"]`);
    if (r) { r.checked = true; refrescarEstiloRadio(name); }
  }

  function refrescarEstiloRadio(name) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
      r.closest('.opcion-card')?.classList.toggle('selected', r.checked);
    });
  }

  /* ─── límite de 4 instrumentos ─── */
  function actualizarLimiteInstrumentos() {
    const checks = Array.from(document.querySelectorAll('input[name="instrumento"]'));
    const marcados = checks.filter(c => c.checked);
    const badge = document.getElementById('badge-contador-inst');
    if (badge) badge.textContent = marcados.length + '/4';

    const lleno = marcados.length >= 4;
    checks.forEach(chk => {
      if (!chk.checked) {
        chk.disabled = lleno;
        document.getElementById('card-inst-' + chk.value)?.classList.toggle('bloqueada', lleno);
      } else {
        chk.disabled = false;
        document.getElementById('card-inst-' + chk.value)?.classList.remove('bloqueada');
      }
    });
    return marcados.map(c => c.value);
  }

  /* ─── evaluación y semáforo ─── */
  function evaluarYActualizarUI() {
    if (!window.Engine || !window.estadoMision) return;
    const estado = window.estadoMision;
    const diseno = estado.diseno;
    const presupuestoMax = estado.presupuestoMax || 500;
    const res = window.Engine.evaluarDiseno(diseno, presupuestoMax);
    estado.evaluacionActual = res;

    if (window.UI?.actualizarBarraRecursos) window.UI.actualizarBarraRecursos(res, estado);
    actualizarSemaforo(res, presupuestoMax);
  }

  function semSet(id, clase, valor, msg) {
    const el = document.getElementById('sem-' + id);
    if (el) el.className = 'sem-item ' + clase;
    const v = document.getElementById('val-sem-' + id);
    if (v) v.textContent = valor;
    const m = document.getElementById('msg-sem-' + id);
    if (m) m.textContent = msg;
  }

  function actualizarSemaforo(res, presupuestoMax) {
    let hayRojos = false;

    // Masa
    if (res.masaTotal > res.capacidadCohete) {
      semSet('masa', 'rojo', `${res.masaTotal}/${res.capacidadCohete} kg`, `Sobrecarga +${res.masaTotal - res.capacidadCohete} kg`);
      hayRojos = true;
    } else if (res.masaTotal >= res.capacidadCohete * 0.9) {
      semSet('masa', 'amarillo', `${res.masaTotal}/${res.capacidadCohete} kg`, 'Cerca del límite (≥90%)');
    } else {
      semSet('masa', 'verde', `${res.masaTotal}/${res.capacidadCohete} kg`, 'Dentro del límite ✓');
    }

    // Costo
    if (res.costoTotal > presupuestoMax) {
      semSet('costo', 'rojo', `${res.costoTotal}/${presupuestoMax} M$`, `Déficit +${res.costoTotal - presupuestoMax} M$`);
      hayRojos = true;
    } else if (res.costoTotal >= presupuestoMax * 0.9) {
      semSet('costo', 'amarillo', `${res.costoTotal}/${presupuestoMax} M$`, 'Presupuesto al límite');
    } else {
      semSet('costo', 'verde', `${res.costoTotal}/${presupuestoMax} M$`, 'Fondos suficientes ✓');
    }

    // Energía
    const pctE = Math.round(res.factorEnergia * 100);
    if (res.factorEnergia < 0.5) {
      semSet('energia', 'rojo', `${pctE}%`, 'Blackout crítico (<50%)');
      hayRojos = true;
    } else if (res.factorEnergia < 0.9) {
      semSet('energia', 'amarillo', `${pctE}%`, 'Margen reducido');
    } else {
      semSet('energia', 'verde', `${pctE}%`, 'Balance óptimo ✓');
    }

    // Datos
    if (res.datosEntregados < 0.7 && res.datosGenerados > 0) {
      semSet('datos', 'rojo', `${res.capacidadTx}/${res.datosGenerados} UD`, `Pérdida severa (${Math.round(res.datosEntregados*100)}%)`);
      hayRojos = true;
    } else if (res.datosEntregados < 1 && res.datosGenerados > 0) {
      semSet('datos', 'amarillo', `${res.capacidadTx}/${res.datosGenerados} UD`, `Cuello de botella (${Math.round(res.datosEntregados*100)}%)`);
    } else {
      semSet('datos', 'verde', `${res.capacidadTx}/${res.datosGenerados} UD`, 'Enlace completo ✓');
    }

    // Meses
    if (res.meses > 28) {
      semSet('meses', 'rojo', `${res.meses}/28 m`, `Ventana perdida (+${res.meses-28} m)`);
      hayRojos = true;
    } else if (res.meses > 25) {
      semSet('meses', 'amarillo', `${res.meses}/28 m`, 'Calendario muy ajustado');
    } else {
      semSet('meses', 'verde', `${res.meses}/28 m`, 'A tiempo ✓');
    }

    // Botón lanzar
    const btn = document.getElementById('btn-lanzar');
    if (btn) btn.disabled = hayRojos;
  }

  /* ─── conectar eventos ─── */
  function conectarEventos() {
    const estado = window.estadoMision;
    if (!estado?.diseno) return;
    const d = estado.diseno;

    // Navegación de pasos
    document.getElementById('btn-p1-next')?.addEventListener('click', () => { irPaso(2); window.Sound?.playStepNext?.(); });
    document.getElementById('btn-p2-back')?.addEventListener('click', () => { irPaso(1); window.Sound?.playStepBack?.(); });
    document.getElementById('btn-p2-next')?.addEventListener('click', () => { irPaso(3); window.Sound?.playStepNext?.(); });
    document.getElementById('btn-p3-back')?.addEventListener('click', () => { irPaso(2); window.Sound?.playStepBack?.(); });
    document.getElementById('btn-p3-next')?.addEventListener('click', () => { irPaso(4); window.Sound?.playStepNext?.(); });
    document.getElementById('btn-p4-back')?.addEventListener('click', () => { irPaso(3); window.Sound?.playStepBack?.(); });

    // Radios
    ['cohete','panel','bateria','antena','relay'].forEach(cat => {
      document.querySelectorAll(`input[name="radio-${cat}"]`).forEach(inp => {
        inp.addEventListener('change', () => {
          if (inp.checked) {
            d[cat] = inp.value;
            refrescarEstiloRadio('radio-' + cat);
            evaluarYActualizarUI();
            if (window.Sound?.playSelect) window.Sound.playSelect();
          }
        });
        inp.closest('.opcion-card')?.addEventListener('click', e => {
          if (e.target !== inp) { inp.checked = true; inp.dispatchEvent(new Event('change')); }
        });
      });
    });

    // Checkboxes extras
    ['blindaje','redundancia'].forEach(id => {
      const chk = document.getElementById('check-' + id);
      if (!chk) return;
      chk.addEventListener('change', () => {
        d[id] = chk.checked;
        document.getElementById('card-' + id)?.classList.toggle('selected', chk.checked);
        evaluarYActualizarUI();
        if (chk.checked) {
          window.Sound?.playSelect ? window.Sound.playSelect() : window.Sound?.playBeep?.();
        } else {
          window.Sound?.playDeselect ? window.Sound.playDeselect() : window.Sound?.playBeep?.();
        }
      });
    });

    // Instrumentos
    document.querySelectorAll('input[name="instrumento"]').forEach(chk => {
      chk.addEventListener('change', () => {
        const sel = actualizarLimiteInstrumentos();
        d.instrumentos = sel;
        document.getElementById('card-inst-' + chk.value)?.classList.toggle('selected', chk.checked);
        evaluarYActualizarUI();
        if (chk.checked) {
          window.Sound?.playSelect ? window.Sound.playSelect() : window.Sound?.playBeep?.();
        } else {
          window.Sound?.playDeselect ? window.Sound.playDeselect() : window.Sound?.playBeep?.();
        }
      });
    });

    // Lanzar misión
    document.getElementById('btn-lanzar')?.addEventListener('click', () => {
      if (window.Sound?.playLaunch) window.Sound.playLaunch();
      const res = estado.evaluacionActual || window.Engine.evaluarDiseno(d, estado.presupuestoMax);
      estado.evaluacionActual = res;
      estado.evaluacion = res;
      estado.registrarCausaEfecto('Taller de Diseño',
        `Diseño aprobado: Cohete ${d.cohete}, Panel ${d.panel}, Batería ${d.bateria}`,
        `Masa:${res.masaTotal}kg | Costo:${res.costoTotal}M$ | Plazo:${res.meses}m`,
        'Todos los indicadores de seguridad en verde.');
      window.UI?.cambiarEscena?.('flight');
    });
  }

  /* ─── inicialización pública ─── */
  function iniciar() {
    const contenedor = document.getElementById('escena-design');
    if (!contenedor) return;

    if (!initialized || contenedor.children.length === 0) {
      pasoActual = 1;
      render(contenedor);
      conectarEventos();
      iniciarCanvas();
      initialized = true;
    } else {
      irPaso(1);
    }

    sincronizarControles();
    actualizarLimiteInstrumentos();
    evaluarYActualizarUI();
    if (window.Sprites?.pintarIconosDOM) window.Sprites.pintarIconosDOM();
  }

  window.DesignScene = { iniciar, evaluarYActualizarUI };

})(typeof window !== 'undefined' ? window : this);
