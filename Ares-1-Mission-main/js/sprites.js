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
        dan: { T: '#f97316', S: '#c2410c', nombre: 'DAN' },  // Comandante (Naranja)
        ana: { T: '#22c55e', S: '#15803d', nombre: 'ANA' },  // Ciencia (Verde)
        leo: { T: '#eab308', S: '#a16207', nombre: 'LEO' },  // Ingeniería (Amarillo)
        maya: { T: '#a855f7', S: '#7e22ce', nombre: 'MAYA' }  // Comunicaciones (Morado)
    };

    // Astronauta 16x18 con contorno K, reflejo L y sombra S
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

    // Llave inglesa pixel-art 8x8 para Leo
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

    // Rover marciano 24x14
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

    // Iconos 12x12 para tarjetas del Taller
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
            estado = 'quieto', // 'quieto' | 'camina1' | 'camina2' | 'salta'
            voltear = false,
            mostrarNombre = true
        } = opciones;

        const traje = TRAJES[idPersonaje] || TRAJES.dan;
        let mapa = ASTRONAUTA_QUIETO;
        if (estado === 'camina1') mapa = ASTRONAUTA_CAMINA_1;
        if (estado === 'camina2') mapa = ASTRONAUTA_CAMINA_2;
        if (estado === 'salta') mapa = ASTRONAUTA_SALTA;

        dibujarMatriz(ctx, mapa, traje, x, y, escala, voltear);

        // Leo lleva su llave inglesa característica
        if (idPersonaje === 'leo') {
            const lx = voltear ? x - 4 * escala : x + 13 * escala;
            dibujarMatriz(ctx, LLAVE_INGLESA, null, lx, y + 6 * escala, Math.max(2, escala - 1), voltear);
        }

        if (mostrarNombre) {
            ctx.save();
            ctx.font = '9px "Press Start 2P", monospace';
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

    // Escenario de Marte estilo Terraria (vista lateral + opcional corte subterráneo)
    function dibujarEscenarioMarte(ctx, w, h, opciones = {}) {
        const { conSubsuelo = false, conBase = true } = opciones;
        ctx.save();
        ctx.imageSmoothingEnabled = false;

        // 1. Cielo espacial marciano
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#070b19');
        grad.addColorStop(0.55, '#132247');
        grad.addColorStop(1, '#3b1812');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 2. Estrellas fijas pixeladas y destellos en cruz
        for (let i = 0; i < 42; i++) {
            const sx = (i * 173 + 29) % w;
            const sy = (i * 97 + 17) % Math.floor(h * 0.55);
            ctx.fillStyle = i % 3 === 0 ? '#fef08a' : '#e2e8f0';
            ctx.fillRect(sx, sy, 2, 2);
            if (i % 9 === 0) {
                ctx.fillRect(sx - 2, sy, 6, 2);
                ctx.fillRect(sx, sy - 2, 2, 6);
            }
        }

        // Luna Fobos en el cielo
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(w - 95, 26, 18, 18);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(w - 91, 30, 6, 6);
        ctx.fillRect(w - 83, 36, 4, 4);

        const nivelSuelo = conSubsuelo ? Math.floor(h * 0.62) : Math.floor(h * 0.78);

        // 3. Mesas y montañas marcianas escalonadas en el horizonte
        ctx.fillStyle = '#451a14';
        for (let mx = 0; mx < w; mx += 16) {
            const altoMesa = 28 + Math.floor(Math.sin(mx * 0.018) * 18 + Math.cos(mx * 0.045) * 10);
            ctx.fillRect(mx, nivelSuelo - altoMesa, 16, altoMesa);
        }

        // 4. Base científica con domo y paneles solares (como en la imagen de referencia)
        if (conBase) {
            const bx = Math.floor(w * 0.58);
            const by = nivelSuelo;
            // Domo de cristal
            ctx.fillStyle = '#1d4ed8';
            ctx.fillRect(bx + 24, by - 46, 56, 22);
            ctx.fillRect(bx + 32, by - 54, 40, 8);
            ctx.fillStyle = '#93c5fd';
            ctx.fillRect(bx + 30, by - 42, 16, 12);
            ctx.fillRect(bx + 54, by - 42, 16, 12);
            // Módulo habitacional metálico
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(bx + 10, by - 26, 96, 26);
            ctx.fillStyle = '#090d16';
            ctx.strokeRect(bx + 10, by - 26, 96, 26);
            // Ventanas iluminadas en amarillo
            ctx.fillStyle = '#fde047';
            ctx.fillRect(bx + 18, by - 18, 16, 10);
            ctx.fillRect(bx + 78, by - 18, 16, 10);
            // Puerta central y antena
            ctx.fillStyle = '#475569';
            ctx.fillRect(bx + 48, by - 20, 16, 20);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(bx + 51, by - 68, 2, 14);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(bx + 50, by - 70, 4, 4);

            // Arreglo de 2 paneles solares azules inclinados
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

        // 5. Superficie de Marte y corte transversal subterráneo tipo Terraria
        ctx.fillStyle = '#c2410c';
        ctx.fillRect(0, nivelSuelo, w, 8);
        ctx.fillStyle = '#9a3412';
        ctx.fillRect(0, nivelSuelo + 8, w, 18);

        if (conSubsuelo) {
            // Bloques de roca subterránea de 16x16 px
            const bloque = 16;
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

    // Dibuja la plataforma y el cohete armándose paso a paso (paso 1, 2, 3 o 4)
    function dibujarCoheteModular(ctx, x, yBase, diseno, pasoActual = 4) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;

        // Plataforma de lanzamiento de concreto y torre metálica
        ctx.fillStyle = '#475569';
        ctx.fillRect(x - 36, yBase - 8, 96, 8);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x - 24, yBase - 14, 72, 6);
        // Torre umbilical a la izquierda
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

        // PASO 1: Cuerpo del cohete propulsor
        if (pasoActual >= 1) {
            // Toberas
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(cx + 2, yBase - 20, ancho - 4, 6);
            // Fuselaje blanco con borde negro y franja roja NASA
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(cx, topCohete, ancho, altoCuerpo - 6);
            ctx.strokeStyle = '#090d16';
            ctx.lineWidth = 2;
            ctx.strokeRect(cx, topCohete, ancho, altoCuerpo - 6);

            ctx.fillStyle = '#dc2626';
            ctx.fillRect(cx + 2, topCohete + 14, ancho - 4, 8);
            // Aletas laterales
            ctx.fillRect(cx - 6, yBase - 34, 6, 16);
            ctx.fillRect(cx + ancho, yBase - 34, 6, 16);

            // Propulsores auxiliares si es cohete pesado
            if (tipoCohete === 'pesado') {
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(cx - 10, topCohete + 24, 8, altoCuerpo - 32);
                ctx.fillRect(cx + ancho + 2, topCohete + 24, 8, altoCuerpo - 32);
            }
        }

        // PASO 2: Cofia de la nave, paneles solares y escudo antirradiación
        if (pasoActual >= 2) {
            // Ojiva / cápsula superior
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(cx + 2, topCohete - 10, ancho - 4, 10);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(cx + 5, topCohete - 18, ancho - 10, 8);

            // Paneles solares desplegados según tamaño S, M o L
            const panel = (diseno && diseno.panel) || 'S';
            const largoPanel = panel === 'L' ? 28 : (panel === 'M' ? 20 : 12);
            ctx.fillStyle = '#1d4ed8';
            ctx.fillRect(cx - largoPanel, topCohete + 4, largoPanel, 10);
            ctx.fillRect(cx + ancho, topCohete + 4, largoPanel, 10);
            ctx.strokeStyle = '#93c5fd';
            ctx.strokeRect(cx - largoPanel, topCohete + 4, largoPanel, 10);
            ctx.strokeRect(cx + ancho, topCohete + 4, largoPanel, 10);

            // Escudo antirradiación si está equipado
            if (diseno && diseno.blindaje) {
                ctx.strokeStyle = '#38bdf8';
                ctx.strokeRect(cx - 3, topCohete - 21, ancho + 6, 24);
            }
        }

        // PASO 3: Módulos de instrumentos científicos encendidos
        if (pasoActual >= 3 && diseno && Array.isArray(diseno.instrumentos)) {
            diseno.instrumentos.forEach((_, idx) => {
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(cx + 4 + idx * 4, topCohete + 26, 3, 6);
            });
        }

        // PASO 4: Mini-satélite Relay orbitando arriba en el cielo
        if (pasoActual >= 4 && diseno && diseno.relay && diseno.relay !== 'ninguno') {
            const rx = cx + 45;
            const ry = topCohete - 36;
            ctx.fillStyle = '#facc15';
            ctx.fillRect(rx, ry, 10, 10);
            ctx.fillStyle = '#2563eb';
            ctx.fillRect(rx - 10, ry + 2, 8, 6);
            ctx.fillRect(rx + 12, ry + 2, 8, 6);
            // Ondas de señal
            ctx.strokeStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(rx + 5, ry + 12, 8, 0.2, Math.PI - 0.2);
            ctx.stroke();
        }

        ctx.restore();
    }

    // Pinta automáticamente cualquier mini-canvas que tenga data-icono="cohete|nave|ciencia|relay"
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

    return {
        TRAJES,
        dibujarMatriz,
        dibujarAstronauta,
        dibujarRover,
        dibujarIcono,
        dibujarEscenarioMarte,
        dibujarCoheteModular,
        pintarIconosDOM
    };
})();