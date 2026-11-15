/**
 * Misión Ares-I: Diseña, Lanza y Sobrevive
 * js/ui.js - Gestor de interfaz de usuario y barra de recursos en tiempo real
 * 
 * Expone window.UI para control de pantallas y actualización visual de telemetría.
 */

(function (window) {
  'use strict';

  /**
   * Determina la clase de color (success, warning, danger) según límites.
   */
  function obtenerClaseEstado(valor, limiteAmarillo, limiteRojo, invertido = false) {
    if (!invertido) {
      if (valor > limiteRojo) return 'danger';
      if (valor >= limiteAmarillo) return 'warning';
      return 'success';
    } else {
      // Para métricas donde mayor es mejor (como energía o cobertura)
      if (valor < limiteRojo) return 'danger';
      if (valor < limiteAmarillo) return 'warning';
      return 'success';
    }
  }

  /**
   * Actualiza los 6 recursos de la barra superior fija.
   * 
   * @param {Object} metricas - Resultado de Engine.evaluarDiseno
   * @param {Object} estado - Objeto estadoMision
   */
  function actualizarBarraRecursos(metricas, estado) {
    if (!metricas) return;
    const data = window.DATA || {};
    const presupuestoMax = estado?.presupuestoMax || 500;
    const ventanaMeses = data.ventanaMeses || 28;

    // 1. Presupuesto (M USD)
    const elPresupuestoVal = document.getElementById('res-presupuesto-val');
    const elPresupuestoBar = document.getElementById('res-presupuesto-bar');
    if (elPresupuestoVal && elPresupuestoBar) {
      const pctPresupuesto = Math.min(100, Math.round((metricas.costoTotal / presupuestoMax) * 100));
      elPresupuestoVal.textContent = `${metricas.costoTotal} / ${presupuestoMax} M$`;
      elPresupuestoBar.style.width = `${pctPresupuesto}%`;
      elPresupuestoBar.className = `progress-fill ${obtenerClaseEstado(metricas.costoTotal, presupuestoMax * 0.9, presupuestoMax)}`;
    }

    // 2. Masa (kg / capacidad cohete)
    const elMasaVal = document.getElementById('res-masa-val');
    const elMasaBar = document.getElementById('res-masa-bar');
    if (elMasaVal && elMasaBar) {
      const capCohete = metricas.capacidadCohete || 400;
      const pctMasa = Math.min(100, Math.round((metricas.masaTotal / capCohete) * 100));
      elMasaVal.textContent = `${metricas.masaTotal} / ${capCohete} kg`;
      elMasaBar.style.width = `${pctMasa}%`;
      elMasaBar.className = `progress-fill ${obtenerClaseEstado(metricas.masaTotal, capCohete * 0.9, capCohete)}`;
    }

    // 3. Energía (factorEnergia % ponderado por batería y estado de paneles)
    const elEnergiaVal = document.getElementById('res-energia-val');
    const elEnergiaBar = document.getElementById('res-energia-bar');
    if (elEnergiaVal && elEnergiaBar) {
      let fe = metricas.factorEnergia;
      if (typeof estado?.bateriaActual === 'number') {
        const coefBat = estado.bateriaActual / 100;
        const coefPan = Math.max(0.1, 1 - ((estado.danoPaneles || 0) / 100));
        fe = fe * (coefBat * 0.5 + coefPan * 0.5);
      }
      const pctEnergia = Math.min(100, Math.round(fe * 100));
      elEnergiaVal.textContent = `${pctEnergia}%`;
      elEnergiaBar.style.width = `${pctEnergia}%`;
      // Rojo si factorEnergia < 0.5 (50%), amarillo si < 0.90 (90%)
      elEnergiaBar.className = `progress-fill ${obtenerClaseEstado(fe, 0.9, 0.5, true)}`;
    }

    // 4. Capacidad de transmisión / datos generados (UD)
    const elDatosVal = document.getElementById('res-datos-val');
    const elDatosBar = document.getElementById('res-datos-bar');
    if (elDatosVal && elDatosBar) {
      elDatosVal.textContent = `${metricas.capacidadTx} / ${metricas.datosGenerados} UD`;
      const pctDatos = metricas.datosGenerados === 0 ? 100 : Math.min(100, Math.round(metricas.datosEntregados * 100));
      elDatosBar.style.width = `${pctDatos}%`;
      elDatosBar.className = `progress-fill ${obtenerClaseEstado(metricas.datosEntregados, 0.99, 0.70, true)}`;
    }

    // 5. Comunicaciones (cobertura %)
    const elCommsVal = document.getElementById('res-comms-val');
    const elCommsBar = document.getElementById('res-comms-bar');
    if (elCommsVal && elCommsBar) {
      const relayId = estado?.diseno?.relay || 'ninguno';
      const relayObj = data.relays?.[relayId] || { cobertura: 0.40, cob: 0.40 };
      const cobVal = Number(relayObj.cobertura ?? relayObj.cob ?? 0.40);
      const pctComms = Math.round(cobVal * 100);
      elCommsVal.textContent = `${pctComms}%`;
      elCommsBar.style.width = `${pctComms}%`;
      elCommsBar.className = `progress-fill ${obtenerClaseEstado(cobVal, 0.65, 0.45, true)}`;
    }

    // 6. Tiempo (meses / 28)
    const elTiempoVal = document.getElementById('res-tiempo-val');
    const elTiempoBar = document.getElementById('res-tiempo-bar');
    if (elTiempoVal && elTiempoBar) {
      const pctTiempo = Math.min(100, Math.round((metricas.meses / ventanaMeses) * 100));
      elTiempoVal.textContent = `${metricas.meses} / ${ventanaMeses} m`;
      elTiempoBar.style.width = `${pctTiempo}%`;
      elTiempoBar.className = `progress-fill ${obtenerClaseEstado(metricas.meses, 25, ventanaMeses)}`;
    }
  }

  function actualizarObjetivoActivo(objetivo) {
    const nombres = {
      agua: 'Buscar agua antigua',
      mapeo: 'Mapear el cráter',
      economica: 'Misión económica'
    };
    const elObjetivo = document.getElementById('hud-objetivo-activo');
    if (elObjetivo) {
      elObjetivo.textContent = `Objetivo: ${nombres[objetivo] || nombres.agua}`;
    }
  }

  function limpiarBarraRecursos() {
    const valoresIniciales = {
      'res-presupuesto-val': '-- / -- M$',
      'res-masa-val': '-- / -- kg',
      'res-energia-val': '--%',
      'res-datos-val': '-- / -- UD',
      'res-comms-val': '--%',
      'res-tiempo-val': `-- / ${(window.DATA || {}).ventanaMeses || 28} m`
    };

    Object.entries(valoresIniciales).forEach(([id, valor]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = valor;
    });

    document.querySelectorAll('.progress-fill').forEach(barra => {
      barra.style.width = '0%';
      barra.className = 'progress-fill';
    });
  }

  /**
   * Cambia la escena visible activa en la interfaz.
   * 
   * @param {string} nombreEscena - Nombre de la escena ('briefing', 'design', 'flight', 'rover', 'report')
   */
  function cambiarEscena(nombreEscena) {
    const escenas = document.querySelectorAll('.escena');
    escenas.forEach(el => el.classList.remove('activa'));

    const escenaDestino = document.getElementById(`escena-${nombreEscena}`);
    if (escenaDestino) {
      escenaDestino.classList.add('activa');
    }

    if (window.estadoMision) {
      window.estadoMision.escenaActual = nombreEscena;
    }

    // Inicializar la escena correspondiente si existe su controlador
    if (nombreEscena === 'briefing' && window.BriefingScene?.iniciar) {
      window.BriefingScene.iniciar();
    } else if (nombreEscena === 'design' && window.DesignScene?.iniciar) {
      window.DesignScene.iniciar();
    } else if (nombreEscena === 'flight' && window.FlightScene?.iniciar) {
      window.FlightScene.iniciar();
    } else if (nombreEscena === 'rover' && window.RoverScene?.iniciar) {
      window.RoverScene.iniciar();
    } else if (nombreEscena === 'report' && window.ReportScene?.iniciar) {
      window.ReportScene.iniciar();
    }
  }

  window.UI = {
    actualizarBarraRecursos,
    actualizarObjetivoActivo,
    limpiarBarraRecursos,
    cambiarEscena
  };

})(typeof window !== 'undefined' ? window : this);
