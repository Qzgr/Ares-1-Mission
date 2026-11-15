// js/sprites.js — Motor de Pixel Art 16-bit estilo Terraria / NASA (sin imágenes externas)
window.Sprites = (function () {
    const PALETA = {
        '.': null,
        'K': '#090d16', // Contorno negro pixel art
        'C': '#f8fafc', // Casco blanco luz
        'G': '#94a3b8', // Sombra metálica / casco
        'V': '#1d4ed8', // Visor azul
        'L': '#bae6fd', // Brillo visor / cristal / hielo
        'M': '#64748b', // Mochila / acero
        'B': '#1e293b', // Botas / llantas
        'O': '#fbbf24', // Luz / fuego propulsor / oro
        'W': '#f1f5f9', // Blanco cohete / rover
        'R': '#dc2626', // Rojo NASA / cohete
        'D': '#334155', // Gris oscuro industrial
        'E': '#22c55e'  // Verde sensor / líquido
    };

    const TRAJES = {
        dan: { T: '#f97316', S: '#c2410c', nombre: 'DAN' },   // Comandante (Naranja)
        ana: { T: '#22c55e', S: '#15803d', nombre: 'ANA' },   // Ciencia (Verde)
        leo: { T: '#eab308', S: '#a16207', nombre: 'LEO' },   // Ingeniería (Amarillo)
        maya: { T: '#a855f7', S: '#7e22ce', nombre: 'MAYA' }  // Comunicaciones (Morado)
    };

    const ASTRONAUTA_QUIETO = [
        ".....KKKKKK.....",
        "....KCCCCCCK....",
        "..KKCCCCCCCCKK..",
        ".KCCVVVVVVVVCCK.",
        ".KCCVLLVVVVVCCK.",
        ".KCCVVVVVVVVCCK.",
        "..KKGGGGGGGGKK..",
        "....KKKKKKKK....",
        ".KKKTTTTTTTTKKK.",
        "KMMKTTTOOTTTKMMK",
        "KMMKTTTTTTTTKMMK",
        "KMMKSSSSSSSSKMMK",
        ".KKKTTTTTTTTKKK.",
        "....KTTTTTTK....",
        "....KTTKKTTK....",
        "....KSSKKSSK....",
        "...KBBBK.KBBBK..",
        "...KKKKK.KKKKK.."
    ];

    const ASTRONAUTA_CAMINA_1 = [
        ...ASTRONAUTA_QUIETO.slice(0, 14),
        "....KTTKKTTK....",
        "...KSSK..KSSK...",
        "..KBBBK...KBBBK.",
        "..KKKKK...KKKKK."
    ];

    const ASTRONAUTA_CAMINA_2 = [
        ...ASTRONAUTA_QUIETO.slice(0, 14),
        ".....KTTTTK.....",
        ".....KSSKK......",
        "....KBBBK.......",
        "....KKKKK......."
    ];

    const ASTRONAUTA_SALTA = [
        ...ASTRONAUTA_QUIETO.slice(0, 13),
        "KOO.KTTTTTTK.OOK",
        ".O..KTTKKTTK..O.",
        "...KBBBK..KBBBK.",
        "...KKKKK..KKKKK.",
        "................"
    ];

    const LLAVE_INGLESA = [
        ".KK..KK.",
        "KGGKKGGK",
        "KGGGGGGK",
        ".KKGGKK.",
        "..KGGK..",
        "..KGGK..",
        ".KGGGGK.",
        "..KKKK.."
    ];

    const ROVER = [
        "....................K...",
        "...................KVK..",
        ".........KKKKKKKK..KMK..",
        "........KWWWWWWWWKKKMK..",
        ".......KWVVVVWWWWWWKMK..",
        "..KKKK.KWVLLVWWWWWWKMK..",
        ".KOOOO.KGGGGGGGGGGGGMK..",
        "KO....KKKKKKKKKKKKKKKKK.",
        "K....KDDDDDDDDDDDDDDDDDK",
        "....KBBBBK..KBBBBK..KBBK",
        "...KBGGGGK..KBGGGGK.KBGK",
        "...KBGGGGK..KBGGGGK.KBGK",
        "...KBBBBBK..KBBBBBK.KBBK",
        "....KKKKK....KKKKK...KK."
    ];

    const ICONOS = {
        cohete: [
            ".....KK.....",
            "....KWWK....",
            "....KWWK....",
            "...KWWWWK...",
            "...KWVVWK...",
            "...KWWWWK...",
            "..KKRRRRKK..",
            ".KRRWWWWWRK.",
            ".KRKWWWWKRK.",
            ".KK.KKKK.KK.",
            "....KOOK....",
            ".....OO....."
        ],
        nave: [
            "..KK....KK..",
            ".KVVK..KVVK.",
            ".KVVK..KVVK.",
            ".KVVKKKKVVK.",
            ".KVVWWWWVVK.",
            ".KVVWVVWVVK.",
            ".KVVWWWWVVK.",
            ".KVVKKKKVVK.",
            "..KK.KK.KK..",
            "....KGGK....",
            ".....KK.....",
            "............"
        ],
        ciencia: [
            "....KKKK....",
            ".....KK.....",
            ".....KK.....",
            "....KWWK....",
            "....KWWK....",
            "...KWLLWK...",
            "..KWLLLLWK..",
            ".KWLLLLLLWK.",
            ".KWLLLLLLWK.",
            ".KKKKKKKKKK.",
            "............",
            "............"
        ],
        relay: [
            "......KK.KK.",
            ".....K..K..K",
            "..KK....K...",
            ".KWWK..K....",
            "KWWWWKK.....",
            "KWWWWWKK....",
            ".KWWWWWWK...",
            "..KKWWWWK...",
            "....KKKK....",
            "....KGGK....",
            "..KKKKKKKK..",
            "............"
        ]
    };

    function dibujarMatriz(ctx, mapa, coloresExtra, x, y, escala = 3, voltear = false) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const ancho = mapa[0].length * escala;
        if (voltear) {
            ctx.translate(Math.round(x + ancho), Math.round(y));
            ctx.scale(-1, 1);
            x = 0;
            y = 0;
        } else {
            x = Math.round(x);
            y = Math.round(y);
        }

        for (let f = 0; f < mapa.length; f++) {
            const fila = mapa[f];
            for (let c = 0; c < fila.length; c++) {
                const ch = fila[c];
                if (ch === '.') continue;
                ctx.fillStyle = (coloresExtra && coloresExtra[ch]) ? coloresExtra[ch] : (PALETA[ch] || '#ffffff');
                ctx.fillRect(x + c * escala, y + f * escala, escala, escala);
            }
        }
        ctx.restore();
    }

    function dibujarAstronauta(ctx, idPersonaje, x, y, opciones = {}) {
        const {
            escala = 3,
            estado = 'quieto',
            voltear = false,
            mostrarNombre = true
        } = opciones;

        const traje = TRAJES[idPersonaje] || TRAJES.dan;
        let mapa = ASTRONAUTA_QUIETO;
        if (estado === 'camina1') mapa = ASTRONAUTA_CAMINA_1;
        if (estado === 'camina2') mapa = ASTRONAUTA_CAMINA_2;
        if (estado === 'salta') mapa = ASTRONAUTA_SALTA;

        dibujarMatriz(ctx, mapa, traje, x, y, escala, voltear);

        if (idPersonaje === 'leo') {
            const lx = voltear ? x - 4 * escala : x + 13 * escala;
            dibujarMatriz(ctx, LLAVE_INGLESA, null, lx, y + 6 * escala, Math.max(2, escala - 1), voltear);
        }

        if (mostrarNombre) {
            ctx.save();
            ctx.font = 'bold 9px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            const cx = x + (16 * escala) / 2;
            ctx.fillStyle = '#090d16';
            ctx.fillText(traje.nombre, cx + 1, y - 5);
            ctx.fillStyle = traje.T;
            ctx.fillText(traje.nombre, cx, y - 6);
            ctx.restore();
        }
    }

    function dibujarRover(ctx, x, y, escala = 3, voltear = false) {
        dibujarMatriz(ctx, ROVER, null, x, y, escala, voltear);
    }

    function dibujarIcono(ctx, nombreIcono, x, y, escala = 3) {
        const mapa = ICONOS[nombreIcono];
        if (mapa) dibujarMatriz(ctx, mapa, null, x, y, escala, false);
    }

    // Módulo de aterrizaje EDL blanco/rojo NASA fiel al cohete ensamblado
    function dibujarNaveDescenso(ctx, x, y, diseno, frenando = false) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const cx = Math.round(x);
        const cy = Math.round(y);
        const panel = (diseno && diseno.panel) || 'M';
        const anchoPanel = panel === 'L' ? 40 : (panel === 'M' ? 28 : 18);

        // Patas de aterrizaje desplegadas (4 patas con zapatas)
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy + 42);
        ctx.lineTo(cx - 34, cy + 60);
        ctx.moveTo(cx + 20, cy + 42);
        ctx.lineTo(cx + 34, cy + 60);
        ctx.stroke();

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy + 42);
        ctx.lineTo(cx - 34, cy + 60);
        ctx.moveTo(cx + 20, cy + 42);
        ctx.lineTo(cx + 34, cy + 60);
        ctx.stroke();

        // Zapatas de apoyo
        ctx.fillStyle = '#eab308';
        ctx.fillRect(cx - 40, cy + 58, 12, 4);
        ctx.fillRect(cx + 28, cy + 58, 12, 4);
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - 40, cy + 58, 12, 4);
        ctx.strokeRect(cx + 28, cy + 58, 12, 4);

        // Paneles solares laterales azules con celdas
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(cx - 22 - anchoPanel, cy + 16, anchoPanel, 12);
        ctx.fillRect(cx + 22, cy + 16, anchoPanel, 12);
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx - 22 - anchoPanel, cy + 16, anchoPanel, 12);
        ctx.strokeRect(cx + 22, cy + 16, anchoPanel, 12);

        // Ojiva roja superior NASA y antena
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(cx - 1, cy - 16, 2, 10);
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 8);
        ctx.lineTo(cx + 18, cy + 8);
        ctx.lineTo(cx - 18, cy + 8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Cuerpo principal blanco aeroespacial
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(cx - 22, cy + 8, 44, 34);
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - 22, cy + 8, 44, 34);

        // Franja roja NASA y emblema azul
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(cx - 20, cy + 28, 40, 7);
        ctx.fillStyle = '#0b3d91';
        ctx.beginPath();
        ctx.arc(cx, cy + 18, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(cx - 3, cy + 15, 6, 4);

        // Escudo térmico inferior y 3 toberas
        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - 24, cy + 42, 48, 6);
        ctx.strokeRect(cx - 24, cy + 42, 48, 6);

        // Escudo antirradiación si está equipado
        if (diseno && diseno.blindaje) {
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
            ctx.lineWidth = 2;
            ctx.strokeRect(cx - 26, cy - 10, 52, 60);
        }

        // Llamas de retropropulsores al frenar
        if (frenando) {
            [-14, 0, 14].forEach((ox, idx) => {
                const altoLlama = (idx === 1 ? 26 : 18) + Math.random() * 10;
                ctx.fillStyle = '#f97316';
                ctx.beginPath();
                ctx.moveTo(cx + ox - 6, cy + 48);
                ctx.lineTo(cx + ox, cy + 48 + altoLlama);
                ctx.lineTo(cx + ox + 6, cy + 48);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = '#fef08a';
                ctx.beginPath();
                ctx.moveTo(cx + ox - 3, cy + 48);
                ctx.lineTo(cx + ox, cy + 48 + altoLlama * 0.6);
                ctx.lineTo(cx + ox + 3, cy + 48);
                ctx.closePath();
                ctx.fill();
            });
        }

        ctx.restore();
    }

    function dibujarEscenarioMarte(ctx, w, h, opciones = {}) {
        const { conSubsuelo = false, conBase = true } = opciones;
        ctx.save();
        ctx.imageSmoothingEnabled = false;

        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#070b19');
        grad.addColorStop(0.55, '#132247');
        grad.addColorStop(1, '#3b1812');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < 48; i++) {
            const sx = (i * 173 + 29) % w;
            const sy = (i * 97 + 17) % Math.floor(h * 0.55);
            ctx.fillStyle = i % 3 === 0 ? '#fef08a' : '#e2e8f0';
            ctx.fillRect(sx, sy, 2, 2);
            if (i % 9 === 0) {
                ctx.fillRect(sx - 2, sy, 6, 2);
                ctx.fillRect(sx, sy - 2, 2, 6);
            }
        }

        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(w - 95, 26, 18, 18);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(w - 91, 30, 6, 6);
        ctx.fillRect(w - 83, 36, 4, 4);

        const nivelSuelo = conSubsuelo ? Math.floor(h * 0.60) : Math.floor(h * 0.78);

        ctx.fillStyle = '#451a14';
        for (let mx = 0; mx < w; mx += 16) {
            const altoMesa = 28 + Math.floor(Math.sin(mx * 0.018) * 18 + Math.cos(mx * 0.045) * 10);
            ctx.fillRect(mx, nivelSuelo - altoMesa, 16, altoMesa);
        }

        if (conBase) {
            const bx = Math.floor(w * 0.58);
            const by = nivelSuelo;
            ctx.fillStyle = '#1d4ed8';
            ctx.fillRect(bx + 24, by - 46, 56, 22);
            ctx.fillRect(bx + 32, by - 54, 40, 8);
            ctx.fillStyle = '#93c5fd';
            ctx.fillRect(bx + 30, by - 42, 16, 12);
            ctx.fillRect(bx + 54, by - 42, 16, 12);
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(bx + 10, by - 26, 96, 26);
            ctx.strokeStyle = '#090d16';
            ctx.strokeRect(bx + 10, by - 26, 96, 26);
            ctx.fillStyle = '#fde047';
            ctx.fillRect(bx + 18, by - 18, 16, 10);
            ctx.fillRect(bx + 78, by - 18, 16, 10);
            ctx.fillStyle = '#475569';
            ctx.fillRect(bx + 48, by - 20, 16, 20);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(bx + 51, by - 68, 2, 14);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(bx + 50, by - 70, 4, 4);

            for (let p = 0; p < 2; p++) {
                const px = bx - 58 + p * 30;
                ctx.fillStyle = '#334155';
                ctx.fillRect(px + 10, by - 14, 4, 14);
                ctx.fillStyle = '#1e3a8a';
                ctx.fillRect(px, by - 28, 24, 16);
                ctx.strokeStyle = '#93c5fd';
                ctx.strokeRect(px, by - 28, 24, 16);
            }
        }

        ctx.fillStyle = '#c2410c';
        ctx.fillRect(0, nivelSuelo, w, 8);
        ctx.fillStyle = '#9a3412';
        ctx.fillRect(0, nivelSuelo + 8, w, 18);

        if (conSubsuelo) {
            const bloque = 18;
            for (let y = nivelSuelo + 26; y < h; y += bloque) {
                for (let x = 0; x < w; x += bloque) {
                    ctx.fillStyle = ((x + y) / bloque) % 2 === 0 ? '#5c2314' : '#4a1b10';
                    ctx.fillRect(x, y, bloque, bloque);
                    ctx.fillStyle = '#36120a';
                    ctx.fillRect(x, y + bloque - 2, bloque, 2);
                    ctx.fillRect(x + bloque - 2, y, 2, bloque);
                }
            }
        } else {
            ctx.fillStyle = '#7c2d12';
            ctx.fillRect(0, nivelSuelo + 26, w, h - (nivelSuelo + 26));
        }

        ctx.restore();
        return nivelSuelo;
    }

    function dibujarCoheteModular(ctx, x, yBase, diseno, pasoActual = 4) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = '#475569';
        ctx.fillRect(x - 36, yBase - 8, 96, 8);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x - 24, yBase - 14, 72, 6);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x - 28, yBase - 120, 8, 106);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(x - 20, yBase - 95, 16, 4);
        ctx.fillRect(x - 20, yBase - 55, 16, 4);

        const tipoCohete = (diseno && diseno.cohete) || 'ligero';
        const ancho = tipoCohete === 'pesado' ? 32 : (tipoCohete === 'medio' ? 24 : 18);
        const altoCuerpo = tipoCohete === 'pesado' ? 76 : (tipoCohete === 'medio' ? 66 : 56);
        const cx = x + 12 - Math.floor(ancho / 2);
        const topCohete = yBase - 14 - altoCuerpo;

        if (pasoActual >= 1) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(cx + 2, yBase - 20, ancho - 4, 6);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(cx, topCohete, ancho, altoCuerpo - 6);
            ctx.strokeStyle = '#090d16';
            ctx.lineWidth = 2;
            ctx.strokeRect(cx, topCohete, ancho, altoCuerpo - 6);

            ctx.fillStyle = '#dc2626';
            ctx.fillRect(cx + 2, topCohete + 14, ancho - 4, 8);
            ctx.fillRect(cx - 6, yBase - 34, 6, 16);
            ctx.fillRect(cx + ancho, yBase - 34, 6, 16);

            if (tipoCohete === 'pesado') {
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(cx - 10, topCohete + 24, 8, altoCuerpo - 32);
                ctx.fillRect(cx + ancho + 2, topCohete + 24, 8, altoCuerpo - 32);
            }
        }

        if (pasoActual >= 2) {
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(cx + 2, topCohete - 10, ancho - 4, 10);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(cx + 5, topCohete - 18, ancho - 10, 8);

            const panel = (diseno && diseno.panel) || 'S';
            const largoPanel = panel === 'L' ? 28 : (panel === 'M' ? 20 : 12);
            ctx.fillStyle = '#1d4ed8';
            ctx.fillRect(cx - largoPanel, topCohete + 4, largoPanel, 10);
            ctx.fillRect(cx + ancho, topCohete + 4, largoPanel, 10);
            ctx.strokeStyle = '#93c5fd';
            ctx.strokeRect(cx - largoPanel, topCohete + 4, largoPanel, 10);
            ctx.strokeRect(cx + ancho, topCohete + 4, largoPanel, 10);

            if (diseno && diseno.blindaje) {
                ctx.strokeStyle = '#38bdf8';
                ctx.strokeRect(cx - 3, topCohete - 21, ancho + 6, 24);
            }
        }

        if (pasoActual >= 3 && diseno && Array.isArray(diseno.instrumentos)) {
            diseno.instrumentos.forEach((_, idx) => {
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(cx + 4 + idx * 4, topCohete + 26, 3, 6);
            });
        }

        if (pasoActual >= 4 && diseno && diseno.relay && diseno.relay !== 'ninguno') {
            const rx = cx + 45;
            const ry = topCohete - 36;
            ctx.fillStyle = '#facc15';
            ctx.fillRect(rx, ry, 10, 10);
            ctx.fillStyle = '#2563eb';
            ctx.fillRect(rx - 10, ry + 2, 8, 6);
            ctx.fillRect(rx + 12, ry + 2, 8, 6);
            ctx.strokeStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(rx + 5, ry + 12, 8, 0.2, Math.PI - 0.2);
            ctx.stroke();
        }

        ctx.restore();
    }

    function pintarIconosDOM() {
        document.querySelectorAll('canvas[data-icono]').forEach(cv => {
            const icono = cv.getAttribute('data-icono');
            const escala = parseInt(cv.getAttribute('data-escala') || '3', 10);
            cv.width = 12 * escala;
            cv.height = 12 * escala;
            const ctx = cv.getContext('2d');
            ctx.clearRect(0, 0, cv.width, cv.height);
            dibujarIcono(ctx, icono, 0, 0, escala);
        });
    }

    // Escenario de regreso: Jezero al anochecer con la Tierra visible
    function dibujarEscenarioRegresoMarte(ctx, w, h) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;

        const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
        sky.addColorStop(0, '#050814');
        sky.addColorStop(0.35, '#120d2b');
        sky.addColorStop(0.7, '#2b1029');
        sky.addColorStop(1, '#7c2310');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h * 0.62);

        const neb = ctx.createRadialGradient(w * 0.45, h * 0.25, 10, w * 0.45, h * 0.25, 180);
        neb.addColorStop(0, 'rgba(168, 85, 247, 0.16)');
        neb.addColorStop(0.6, 'rgba(56, 189, 248, 0.08)');
        neb.addColorStop(1, 'transparent');
        ctx.fillStyle = neb;
        ctx.fillRect(0, 0, w, h * 0.62);

        for (let i = 0; i < 40; i++) {
            const sx = (i * 157 + 23) % w;
            const sy = (i * 73 + 11) % Math.floor(h * 0.48);
            const br = i % 3 === 0;
            ctx.fillStyle = br ? '#fef08a' : '#f8fafc';
            ctx.fillRect(sx, sy, br ? 2 : 1, br ? 2 : 1);
        }

        ctx.fillStyle = '#451208';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.52);
        for (let mx = 0; mx <= w; mx += 90) {
            ctx.lineTo(mx, h * (0.44 + ((mx / 90) % 2) * 0.06));
        }
        ctx.lineTo(w, h * 0.62);
        ctx.lineTo(0, h * 0.62);
        ctx.closePath();
        ctx.fill();

        const tx = w - 90, ty = 38, tr = 30;
        const haloTierra = ctx.createRadialGradient(tx, ty, tr - 2, tx, ty, tr + 10);
        haloTierra.addColorStop(0, 'rgba(56, 189, 248, 0.5)');
        haloTierra.addColorStop(1, 'transparent');
        ctx.fillStyle = haloTierra;
        ctx.beginPath();
        ctx.arc(tx, ty, tr + 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(tx, ty, tr, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#16a34a';
        ctx.fillRect(tx - 18, ty - 14, 10, 10);
        ctx.fillRect(tx - 14, ty - 4, 8, 12);
        ctx.fillRect(tx + 2, ty - 16, 9, 8);
        ctx.fillRect(tx + 4, ty - 7, 10, 14);

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(tx - 8, ty - tr + 2, 16, 4);
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tx, ty, tr, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
        ctx.fillRect(tx - 30, ty + tr + 6, 60, 15);
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx - 30, ty + tr + 6, 60, 15);
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TIERRA', tx, ty + tr + 17);

        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(w * 0.42, h * 0.60);
        ctx.quadraticCurveTo(w * 0.52, h * 0.08, tx - 10, ty + tr);
        ctx.stroke();
        ctx.restore();

        const suelo = Math.floor(h * 0.62);
        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(0, suelo, w, h - suelo);
        ctx.fillStyle = '#9a3412';
        ctx.fillRect(0, suelo, w, 8);
        ctx.fillStyle = '#b45309';
        for (let bx = 0; bx < w; bx += 14) {
            ctx.fillRect(bx, suelo + 1, 10, 3);
        }

        ctx.fillStyle = '#451a03';
        ctx.fillRect(0, suelo + 18, w, h - (suelo + 18));

        const domoX = Math.floor(w * 0.17);
        ctx.fillStyle = '#475569';
        ctx.fillRect(domoX - 38, suelo - 8, 76, 8);
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(domoX, suelo - 8, 30, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(domoX, suelo - 20, 10, 0, Math.PI * 2);
        ctx.fill();

        dibujarRover(ctx, domoX - 95, suelo - 42, 3, false);

        const platX = Math.floor(w * 0.42);
        ctx.fillStyle = '#334155';
        ctx.fillRect(platX - 50, suelo - 16, 100, 16);
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2;
        ctx.strokeRect(platX - 50, suelo - 16, 100, 16);
        for (let hx = platX - 48; hx < platX + 48; hx += 8) {
            ctx.fillStyle = '#eab308';
            ctx.fillRect(hx, suelo - 15, 4, 5);
            ctx.fillStyle = '#090d16';
            ctx.fillRect(hx + 4, suelo - 15, 4, 5);
        }
        ctx.fillStyle = '#475569';
        ctx.fillRect(platX - 42, suelo - 95, 8, 79);

        ctx.restore();
        return suelo;
    }

    // Escenario de amerizaje con helicóptero de rescate recogiendo a los 4 astronautas
    function dibujarEscenarioAmerizaje(ctx, w, h, capsulaY, velocidadVy, opts = {}) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;

        const {
            frenando = false,
            faseRescate = false,
            progresoRescate = 0
        } = opts;

        const nivelMar = Math.floor(h * 0.66);
        const capX = Math.floor(w * 0.42);
        const capYclamp = capsulaY !== undefined ? Math.min(nivelMar - 26, Math.max(18, capsulaY)) : h * 0.28;
        const enAgua = capYclamp >= nivelMar - 27;

        // 1. Cielo diurno
        const sky = ctx.createLinearGradient(0, 0, 0, nivelMar);
        sky.addColorStop(0, '#38bdf8');
        sky.addColorStop(0.55, '#7dd3fc');
        sky.addColorStop(1, '#bae6fd');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, nivelMar);

        // Sol pixelado
        const sunX = w - 105, sunY = 44;
        ctx.fillStyle = '#fde047';
        ctx.fillRect(sunX - 16, sunY - 16, 32, 32);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(sunX - 12, sunY - 12, 24, 24);
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2;
        ctx.strokeRect(sunX - 16, sunY - 16, 32, 32);

        // Nubes
        [[65, 28, 100, 26], [280, 44, 120, 30], [540, 24, 95, 24]].forEach(([cx, cy, cw, ch]) => {
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(cx + 4, cy + ch - 6, cw - 8, 6);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(cx, cy, cw, ch - 4);
            ctx.fillRect(cx + 12, cy - 10, cw - 24, 12);
        });

        // 2. Océano
        const marGrad = ctx.createLinearGradient(0, nivelMar, 0, h);
        marGrad.addColorStop(0, '#0284c7');
        marGrad.addColorStop(0.35, '#0369a1');
        marGrad.addColorStop(1, '#0c4a6e');
        ctx.fillStyle = marGrad;
        ctx.fillRect(0, nivelMar, w, h - nivelMar);

        const waveStep = Math.floor(performance.now() / 320) % 2;
        for (let wx = 0; wx < w; wx += 24) {
            const waveY = nivelMar - 3 + ((wx / 24) % 2 === 0 ? waveStep * 2 : (1 - waveStep) * 2);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(wx, waveY, 20, 4);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(wx + 4, waveY - 2, 10, 2);
        }

        // 3. Boya de Rescate
        const boyaX = Math.floor(w * 0.18), boyaY = nivelMar - 14;
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(boyaX - 12, boyaY, 24, 18);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(boyaX - 12, boyaY + 6, 24, 6);
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(boyaX - 12, boyaY, 24, 18);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(boyaX - 1, boyaY - 26, 2, 26);
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(boyaX + 1, boyaY - 26);
        ctx.lineTo(boyaX + 26, boyaY - 18);
        ctx.lineTo(boyaX + 1, boyaY - 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 4. Buque de Recuperación NASA (derecha)
        const barcoX = Math.floor(w * 0.67), barcoY = nivelMar - 28;
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(barcoX, barcoY + 8);
        ctx.lineTo(barcoX + 18, barcoY + 30);
        ctx.lineTo(barcoX + 185, barcoY + 30);
        ctx.lineTo(barcoX + 198, barcoY + 8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#dc2626';
        ctx.fillRect(barcoX + 14, barcoY + 17, 170, 5);
        ctx.fillStyle = '#0b3d91';
        ctx.font = 'bold 12px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NASA', barcoX + 95, barcoY + 15);

        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(barcoX + 26, barcoY - 24, 68, 24);
        ctx.strokeRect(barcoX + 26, barcoY - 24, 68, 24);
        ctx.fillStyle = '#0284c7';
        for (let vx = barcoX + 32; vx < barcoX + 86; vx += 13) {
            ctx.fillRect(vx, barcoY - 18, 8, 8);
        }

        // Helipuerto en popa
        const helipadX = barcoX + 132;
        const helipadY = barcoY - 14;
        ctx.fillStyle = '#334155';
        ctx.fillRect(barcoX + 108, barcoY - 4, 66, 4);
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1;
        ctx.strokeRect(barcoX + 108, barcoY - 4, 66, 4);

        // 5. Paracaídas (se pliegan al tocar el agua)
        if (!enAgua) {
            [
                { ox: -58, oy: -72, rad: 28 },
                { ox: 0, oy: -88, rad: 32 },
                { ox: 58, oy: -72, rad: 28 }
            ].forEach(({ ox, oy, rad }) => {
                const px = capX + ox, py = capYclamp + oy;
                ctx.beginPath();
                ctx.arc(px, py, rad, Math.PI, 0);
                ctx.closePath();
                ctx.fillStyle = '#f8fafc';
                ctx.fill();
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.moveTo(px, py - rad);
                ctx.arc(px, py, rad, Math.PI * 1.15, Math.PI * 1.38);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(px, py - rad);
                ctx.arc(px, py, rad, Math.PI * 1.62, Math.PI * 1.85);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#090d16';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(px, py, rad, Math.PI, 0);
                ctx.closePath();
                ctx.stroke();

                ctx.strokeStyle = '#475569';
                ctx.lineWidth = 1;
                [px - rad + 3, px, px + rad - 3].forEach(lx => {
                    ctx.beginPath();
                    ctx.moveTo(lx, py);
                    ctx.lineTo(capX, capYclamp - 2);
                    ctx.stroke();
                });
            });
        } else {
            // Paracaídas flotando plegado en el agua a la izquierda de la cápsula
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(capX - 68, nivelMar - 5, 34, 6);
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(capX - 60, nivelMar - 5, 16, 6);
            ctx.strokeStyle = '#090d16';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(capX - 68, nivelMar - 5, 34, 6);
        }

        // 6. Cápsula Ares-I
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(capX, capYclamp - 6);
        ctx.lineTo(capX + 26, capYclamp + 22);
        ctx.lineTo(capX - 26, capYclamp + 22);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#dc2626';
        ctx.fillRect(capX - 18, capYclamp + 12, 36, 5);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(capX - 26, capYclamp + 22, 52, 5);
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.ellipse(capX, capYclamp + 5, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        if (enAgua) {
            ctx.fillStyle = '#f8fafc';
            for (let sp = -34; sp <= 34; sp += 10) {
                ctx.fillRect(capX + sp, nivelMar - 4 + (Math.abs(sp) % 4), 6, 4);
            }
        }

        if ((frenando || (velocidadVy !== undefined && velocidadVy < 2.2)) && !enAgua) {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.moveTo(capX - 14, capYclamp + 27);
            ctx.lineTo(capX, capYclamp + 48 + Math.random() * 10);
            ctx.lineTo(capX + 14, capYclamp + 27);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.moveTo(capX - 7, capYclamp + 27);
            ctx.lineTo(capX, capYclamp + 38 + Math.random() * 6);
            ctx.lineTo(capX + 7, capYclamp + 27);
            ctx.closePath();
            ctx.fill();
        }

        // 7. Helicóptero de Rescate NASA (estacionado o volando a recoger a los astronautas)
        let heliX = helipadX;
        let heliY = helipadY;
        const hoverX = capX - 14;
        const hoverY = nivelMar - 115;

        if (faseRescate) {
            const p = Math.max(0, Math.min(1, progresoRescate));
            if (p < 0.30) {
                // Vuela desde el barco hasta encima de la cápsula
                const t = p / 0.30;
                const ease = t * t * (3 - 2 * t);
                heliX = helipadX + (hoverX - helipadX) * ease;
                heliY = helipadY + (hoverY - helipadY) * ease;
            } else if (p < 0.72) {
                // Suspendido sobre la cápsula recogiendo a los 4 astronautas
                heliX = hoverX;
                heliY = hoverY + Math.sin(p * 40) * 2;
                const tRescate = (p - 0.30) / 0.42;

                // Cable de rescate y canastilla
                const cableLargo = 86;
                ctx.strokeStyle = '#090d16';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(heliX + 14, heliY + 12);
                ctx.lineTo(heliX + 14, heliY + 12 + cableLargo);
                ctx.stroke();

                // Astronautas saliendo de la cápsula y subiendo al helicóptero uno tras otro
                const ids = ['dan', 'ana', 'leo', 'maya'];
                ids.forEach((idAstro, idx) => {
                    const inicioAstro = idx * 0.22;
                    const progAstro = Math.max(0, Math.min(1, (tRescate - inicioAstro) / 0.32));
                    if (progAstro > 0 && progAstro < 1) {
                        const astroY = (nivelMar - 32) - progAstro * 74;
                        dibujarAstronauta(ctx, idAstro, heliX + 4, astroY, {
                            escala: 2,
                            estado: 'salta',
                            mostrarNombre: false
                        });
                    }
                });

                // Cartel informativo en el cielo
                ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
                ctx.fillRect(w / 2 - 175, 22, 350, 26);
                ctx.strokeStyle = '#eab308';
                ctx.lineWidth = 2;
                ctx.strokeRect(w / 2 - 175, 22, 350, 26);
                ctx.fillStyle = '#fde047';
                ctx.font = 'bold 9px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('RESCATANDO TRIPULACIÓN ARES-I...', w / 2, 39);
            } else {
                // Regresa al barco de la NASA
                const t = (p - 0.72) / 0.28;
                const ease = t * t * (3 - 2 * t);
                heliX = hoverX + (helipadX - hoverX) * ease;
                heliY = hoverY + (helipadY - hoverY) * ease;

                ctx.fillStyle = 'rgba(11, 61, 145, 0.92)';
                ctx.fillRect(w / 2 - 175, 22, 350, 26);
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 2;
                ctx.strokeRect(w / 2 - 175, 22, 350, 26);
                ctx.fillStyle = '#f8fafc';
                ctx.font = 'bold 9px "Press Start 2P", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('✓ TRIPULACIÓN A BORDO (4/4)', w / 2, 39);
            }
        }

        // Dibujo del helicóptero NASA (blanco, azul y amarillo rescate)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(heliX, heliY, 32, 12);
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(heliX, heliY, 32, 12);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(heliX + 2, heliY + 6, 28, 3);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(heliX + 20, heliY + 1, 10, 7);
        // Cola
        ctx.fillStyle = '#eab308';
        ctx.fillRect(heliX - 14, heliY + 3, 14, 5);
        ctx.fillStyle = '#090d16';
        ctx.fillRect(heliX - 16, heliY - 2, 3, 12);
        // Rotor principal giratorio
        const rotorSpan = (faseRescate && Math.floor(performance.now() / 50) % 2 === 0) ? 26 : 46;
        ctx.fillStyle = '#090d16';
        ctx.fillRect(heliX + 14, heliY - 5, 4, 5);
        ctx.fillStyle = '#334155';
        ctx.fillRect(heliX + 16 - rotorSpan / 2, heliY - 6, rotorSpan, 2);
        // Patines
        ctx.fillStyle = '#090d16';
        ctx.fillRect(heliX + 2, heliY + 12, 26, 2);
        ctx.fillRect(heliX + 7, heliY + 11, 2, 2);
        ctx.fillRect(heliX + 21, heliY + 11, 2, 2);

        ctx.restore();
        return nivelMar;
    }

    // Escenario de celebración estilo Terraria con UN solo globo limpio en lo alto
    function dibujarCelebracionTerraria(ctx, w, h, tick, arg5, arg6) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;

        const t = tick || 0;
        let hablanteId = null;
        let hablanteFrase = null;

        if (typeof arg5 === 'string' && typeof arg6 === 'string' && arg6.trim()) {
            hablanteId = arg5;
            hablanteFrase = arg6;
        } else if (arg5 && typeof arg5 === 'object') {
            for (const [k, v] of Object.entries(arg5)) {
                if (v) {
                    hablanteId = k;
                    hablanteFrase = v;
                    break;
                }
            }
        }

        const suelo = Math.floor(h * 0.68);

        // 1. Cielo nocturno festivo
        const sky = ctx.createLinearGradient(0, 0, 0, suelo);
        sky.addColorStop(0, '#060814');
        sky.addColorStop(0.5, '#0f172a');
        sky.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, suelo);

        for (let s = 0; s < 32; s++) {
            const sx = (s * 61) % w;
            const sy = (s * 29) % Math.floor(suelo * 0.65);
            ctx.fillStyle = (s + t) % 3 === 0 ? '#fef08a' : '#94a3b8';
            ctx.fillRect(sx, sy, 2, 2);
        }

        // 2. Fuegos artificiales
        const fuegos = [
            { x: Math.floor(w * 0.14), y: 80, col: '#facc15', col2: '#ea580c', delay: 0 },
            { x: Math.floor(w * 0.86), y: 75, col: '#ec4899', col2: '#f43f5e', delay: 18 }
        ];
        fuegos.forEach(({ x, y, col, col2, delay }) => {
            const fTick = (t + delay) % 70;
            if (fTick >= 30) {
                const expProgress = (fTick - 30) / 40;
                const radius = expProgress * 46;
                ctx.save();
                ctx.globalAlpha = Math.max(0, 1 - expProgress);
                for (let a = 0; a < 12; a++) {
                    const ang = (a * Math.PI) / 6;
                    ctx.fillStyle = col;
                    ctx.fillRect(Math.round(x + Math.cos(ang) * radius), Math.round(y + Math.sin(ang) * radius), 4, 4);
                    ctx.fillStyle = col2;
                    ctx.fillRect(Math.round(x + Math.cos(ang + 0.25) * radius * 0.6), Math.round(y + Math.sin(ang + 0.25) * radius * 0.6), 3, 3);
                }
                ctx.restore();
            }
        });

        // 3. Torres de piedra Terraria a los lados
        const muroAncho = 96;
        [0, w - muroAncho].forEach(baseMuroX => {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(baseMuroX, suelo - 95, muroAncho, 95);
            ctx.fillStyle = '#334155';
            for (let my = suelo - 95; my < suelo; my += 14) {
                for (let mx = baseMuroX; mx < baseMuroX + muroAncho; mx += 24) {
                    ctx.fillRect(mx, my, 22, 12);
                    ctx.strokeStyle = '#090d16';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(mx, my, 22, 12);
                }
            }
            for (let ax = baseMuroX; ax < baseMuroX + muroAncho; ax += 24) {
                ctx.fillStyle = '#475569';
                ctx.fillRect(ax, suelo - 110, 14, 15);
                ctx.fillStyle = '#15803d';
                ctx.fillRect(ax, suelo - 112, 14, 3);
            }
        });

        // 4. Gran Panel Central NASA (bien proporcionado para 960px)
        const stageW = 460, stageH = 104;
        const stageX = Math.floor((w - stageW) / 2);
        const stageY = suelo - 122;

        ctx.fillStyle = '#0b1e4a';
        ctx.fillRect(stageX, stageY, stageW, stageH);
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.strokeRect(stageX, stageY, stageW, stageH);

        ctx.fillStyle = '#0b3d91';
        ctx.beginPath();
        ctx.arc(stageX + 56, stageY + 54, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(stageX + 56, stageY + 54, 32, 10, -0.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 11px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NASA', stageX + 56, stageY + 58);

        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 13px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('¡BIENVENIDOS A CASA!', stageX + 104, stageY + 46);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px "Press Start 2P", monospace';
        ctx.fillText('MISIÓN ARES-I · TRIPULACIÓN A SALVO', stageX + 104, stageY + 68);

        // 5. Suelo Terraria y Alfombra Roja
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, suelo, w, h - suelo);
        ctx.fillStyle = '#475569';
        for (let bx = 0; bx < w; bx += 22) {
            ctx.fillRect(bx, suelo + 2, 20, 16);
            ctx.fillRect(bx + 11, suelo + 20, 20, 16);
            ctx.strokeStyle = '#090d16';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, suelo + 2, 20, 16);
            ctx.strokeRect(bx + 11, suelo + 20, 20, 16);
        }
        ctx.fillStyle = '#15803d';
        ctx.fillRect(0, suelo - 4, w, 5);

        const alfW = 410;
        const alfX = Math.floor((w - alfW) / 2);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(alfX, suelo - 8, alfW, 8);
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.strokeRect(alfX, suelo - 8, alfW, 8);

        // 6. Presidente y los 4 Astronautas bien separados
        const presX = alfX + 26;
        const presY = suelo - 60;
        ctx.fillStyle = '#fcd34d';
        ctx.fillRect(presX + 6, presY, 16, 15);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(presX + 6, presY, 16, 5);
        ctx.fillStyle = '#0f2b5c';
        ctx.fillRect(presX + 2, presY + 15, 24, 28);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(presX + 8, presY + 17, 4, 22);
        ctx.fillStyle = '#090d16';
        ctx.fillRect(presX + 4, presY + 43, 8, 15);
        ctx.fillRect(presX + 16, presY + 43, 8, 15);
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PRESIDENTE', presX + 14, presY - 8);

        const astroData = [
            { id: 'dan', x: alfX + 102, col: '#f97316', nom: 'DAN' },
            { id: 'ana', x: alfX + 174, col: '#22c55e', nom: 'ANA' },
            { id: 'leo', x: alfX + 246, col: '#eab308', nom: 'LEO' },
            { id: 'maya', x: alfX + 318, col: '#a855f7', nom: 'MAYA' }
        ];

        let speakerX = w / 2;
        astroData.forEach(({ id, x, col }, idx) => {
            const ay = suelo - 62;
            dibujarAstronauta(ctx, id, x, ay, {
                escala: 3.4,
                estado: 'quieto',
                voltear: false,
                mostrarNombre: true
            });
            if (id === hablanteId) speakerX = x + 26;

            const waving = (Math.floor((t + idx * 4) / 8) % 2 === 0);
            if (waving) {
                ctx.fillStyle = col;
                ctx.fillRect(x + 48, ay + 12, 7, 14);
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(x + 47, ay + 5, 9, 7);
            }
        });

        // 7. Multitud vitoreando
        const crowdCols = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
        for (let c = 0; c < 9; c++) {
            const cx = 104 + c * 18;
            const cy = suelo - 40 + (c % 2 ? 0 : 3);
            ctx.fillStyle = '#fcd34d';
            ctx.fillRect(cx + 4, cy, 8, 8);
            ctx.fillStyle = crowdCols[c % crowdCols.length];
            ctx.fillRect(cx + 2, cy + 8, 12, 16);
            ctx.fillStyle = '#090d16';
            ctx.fillRect(cx + 3, cy + 24, 4, 12);
            ctx.fillRect(cx + 9, cy + 24, 4, 12);

            const rcx = w - 260 + c * 18;
            const rcy = suelo - 40 + (c % 2 ? 3 : 0);
            ctx.fillStyle = '#fcd34d';
            ctx.fillRect(rcx + 4, rcy, 8, 8);
            ctx.fillStyle = crowdCols[(c + 3) % crowdCols.length];
            ctx.fillRect(rcx + 2, rcy + 8, 12, 16);
            ctx.fillStyle = '#090d16';
            ctx.fillRect(rcx + 3, rcy + 24, 4, 12);
            ctx.fillRect(rcx + 9, rcy + 24, 4, 12);
        }

        // 8. Confeti
        const confettiCols = ['#f43f5e', '#38bdf8', '#eab308', '#22c55e', '#a855f7', '#fb923c', '#f8fafc'];
        for (let ci = 0; ci < 55; ci++) {
            const cx = (ci * 41 + t * 1.5) % w;
            const cy = (ci * 31 + t * 2.6) % (h + 10) - 10;
            ctx.fillStyle = confettiCols[ci % confettiCols.length];
            ctx.fillRect(cx, cy, 4, 6);
        }

        // 9. UN ÚNICO GLOBO DE DIÁLOGO EN LO ALTO DEL CIELO (sin encimarse jamás)
        if (hablanteFrase) {
            const traje = TRAJES[hablanteId] || TRAJES.dan;
            const textoCompleto = `${traje.nombre}: "${hablanteFrase}"`;
            const bubbleW = Math.min(w - 140, Math.max(280, textoCompleto.length * 8.5 + 32));
            const bubbleH = 38;
            const bubbleX = Math.floor((w - bubbleW) / 2);
            const bubbleY = 18;

            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(bubbleX, bubbleY, bubbleW, bubbleH);
            ctx.strokeStyle = '#090d16';
            ctx.lineWidth = 3;
            ctx.strokeRect(bubbleX, bubbleY, bubbleW, bubbleH);

            // Línea de puntero sutil hacia el astronauta que habla
            ctx.strokeStyle = traje.T;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(speakerX, bubbleY + bubbleH);
            ctx.lineTo(speakerX, suelo - 86);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#090d16';
            ctx.font = 'bold 9px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(textoCompleto, w / 2, bubbleY + 23);
        }

        ctx.restore();
        return suelo;
    }

    return {
        TRAJES,
        dibujarMatriz,
        dibujarAstronauta,
        dibujarRover,
        dibujarIcono,
        dibujarNaveDescenso,
        dibujarEscenarioMarte,
        dibujarEscenarioRegresoMarte,
        dibujarEscenarioAmerizaje,
        dibujarCelebracionTerraria,
        dibujarCoheteModular,
        pintarIconosDOM
    };
})();