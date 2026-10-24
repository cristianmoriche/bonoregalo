/* bonoregalo.es · piezas comunes de la página, la herramienta de tarjetas, la imagen de vista previa y la portada.
   Sin librerías. Todo texto que viene de los datos entra con textContent, nunca como HTML. */
(function () {
  'use strict';

  const TEMAS = ['rosa', 'noche', 'bosque', 'calma'];
  const TEMA_POR_SECTOR = {
    estetica: 'rosa', peluqueria: 'noche', barberia: 'noche', gimnasio: 'bosque',
    pilates: 'calma', fisio: 'calma', masajes: 'calma',
  };
  const NS = 'http://www.w3.org/2000/svg';
  const PRECIO_DEMO = '49 €';

  /* ---------------------------------------------------------------- DOM */

  function anexar(padre, hijos) {
    for (const h of hijos.flat(Infinity)) {
      if (h === null || h === undefined || h === false) continue;
      padre.append(h.nodeType ? h : document.createTextNode(String(h)));
    }
    return padre;
  }

  function el(etiqueta, atributos, ...hijos) {
    const nodo = document.createElement(etiqueta);
    for (const [k, v] of Object.entries(atributos || {})) {
      if (v === false || v === null || v === undefined) continue;
      if (k === 'class') nodo.className = v;
      else if (k.startsWith('on') && typeof v === 'function') nodo.addEventListener(k.slice(2), v);
      else nodo.setAttribute(k, v === true ? '' : v);
    }
    return anexar(nodo, hijos);
  }

  function svgEl(etiqueta, atributos, ...hijos) {
    const nodo = document.createElementNS(NS, etiqueta);
    for (const [k, v] of Object.entries(atributos || {})) {
      if (v === false || v === null || v === undefined) continue;
      nodo.setAttribute(k, v === true ? '' : v);
    }
    return anexar(nodo, hijos);
  }

  /* ---------------------------------------------- Formas (SVG y canvas) */
  // Todas devuelven datos de trazado "d". El mismo texto sirve en un <path> y en new Path2D().

  const formas = {
    // Destello de cuatro puntas centrado en (cx, cy) con radio r.
    estrella(cx, cy, r) {
      const p = (x, y) => (cx + x * r).toFixed(2) + ' ' + (cy + y * r).toFixed(2);
      return 'M' + p(0, -1) + 'C' + p(0.1, -0.32) + ' ' + p(0.32, -0.1) + ' ' + p(1, 0) +
        'C' + p(0.32, 0.1) + ' ' + p(0.1, 0.32) + ' ' + p(0, 1) +
        'C' + p(-0.1, 0.32) + ' ' + p(-0.32, 0.1) + ' ' + p(-1, 0) +
        'C' + p(-0.32, -0.1) + ' ' + p(-0.1, -0.32) + ' ' + p(0, -1) + 'Z';
    },
    // Copo de nieve de seis brazos con dos ramitas por brazo (solo trazo).
    copo(cx, cy, r) {
      let d = '';
      const f = (v) => v.toFixed(2);
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 - Math.PI / 2;
        const ux = Math.cos(a);
        const uy = Math.sin(a);
        d += 'M' + f(cx + ux * 0.1 * r) + ' ' + f(cy + uy * 0.1 * r) + 'L' + f(cx + ux * r) + ' ' + f(cy + uy * r);
        for (const [t, largo] of [[0.52, 0.3], [0.76, 0.2]]) {
          const bx = cx + ux * t * r;
          const by = cy + uy * t * r;
          for (const s of [-1, 1]) {
            const ang = a + s * Math.PI / 3;
            d += 'M' + f(bx) + ' ' + f(by) + 'L' + f(bx + Math.cos(ang) * largo * r) + ' ' + f(by + Math.sin(ang) * largo * r);
          }
        }
      }
      return d;
    },
    // Ramita de pino que crece hacia arriba desde (0, 0); mide unos 100 de alto (solo trazo).
    rama() {
      let d = 'M0 0C1.4 -28 -1.4 -62 0.6 -97';
      const pares = 10;
      for (let i = 1; i <= pares; i++) {
        const t = i / (pares + 1);
        const y = -7 - i * 8.6;
        const ancho = 15.5 * (1 - t * 0.6);
        const alto = 10.5 * (1 - t * 0.35);
        d += 'M0 ' + y.toFixed(1) + 'L' + (-ancho).toFixed(1) + ' ' + (y - alto).toFixed(1);
        d += 'M0 ' + y.toFixed(1) + 'L' + ancho.toFixed(1) + ' ' + (y - alto).toFixed(1);
      }
      return d;
    },
    // Tres bayas en la base de la rama (relleno).
    bayas() {
      const c = (x, y, r) => 'M' + (x + r) + ' ' + y + 'A' + r + ' ' + r + ' 0 1 0 ' + (x - r) + ' ' + y +
        'A' + r + ' ' + r + ' 0 1 0 ' + (x + r) + ' ' + y + 'Z';
      return c(-5.2, -3.4, 3.1) + c(5.2, -3, 3.1) + c(0.2, -9.6, 3.1);
    },
  };

  // Lazo de 200 × 120 con el nudo en (100, 56). La mitad derecha es la izquierda reflejada.
  const reflejar = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => (200 - parseFloat(x)) + ' ' + y);
  const IZQ = {
    lazada: 'M99 54C93 28 63 6 33 9C10 12 1 36 12 52C23 68 68 71 99 61Z',
    hueco: 'M90 56C85 40 65 26 42 26C30 27 24 40 32 50C42 60 70 63 90 59Z',
    pliegue: 'M96 57C76 53 50 45 21 32',
    brillo: 'M92 40C78 24 56 13 33 14',
    cola: 'M94 66C88 82 77 96 61 111L77 106L85 118C94 102 101 86 106 70Z',
  };
  const lazo = {
    ancho: 200,
    alto: 120,
    lazadaIzq: IZQ.lazada,
    lazadaDer: reflejar(IZQ.lazada),
    huecoIzq: IZQ.hueco,
    huecoDer: reflejar(IZQ.hueco),
    pliegueIzq: IZQ.pliegue,
    pliegueDer: reflejar(IZQ.pliegue),
    brilloIzq: IZQ.brillo,
    brilloDer: reflejar(IZQ.brillo),
    colaIzq: IZQ.cola,
    colaDer: reflejar(IZQ.cola),
    nudo: 'M86 45Q100 38 114 45L116 69Q100 77 84 69Z',
    brilloNudo: 'M90 49Q100 44 110 49',
  };

  /* ------------------------------------------------------------ Iconos */

  const ICONOS = {
    chat: 'M20.5 11.6c0 4.5-3.8 8.1-8.5 8.1-1.3 0-2.6-.3-3.7-.8l-4.8 1.5 1.4-4.2a7.9 7.9 0 0 1-1.4-4.6c0-4.5 3.8-8.1 8.5-8.1s8.5 3.6 8.5 8.1z M8.6 11.6h.01 M12 11.6h.01 M15.4 11.6h.01',
    pin: 'M12 21.2s6.8-5.7 6.8-11.2a6.8 6.8 0 1 0-13.6 0c0 5.5 6.8 11.2 6.8 11.2z M12 12.2a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z',
    tel: 'M6.6 3.5h3l1.5 4-2 1.3a10.5 10.5 0 0 0 5.1 5.1l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z',
    calendario: 'M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v11.5A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z M3.5 10h17 M8 3.5v4 M16 3.5v4',
    abajo: 'M6 9.5l6 6 6-6',
    derecha: 'M9.5 6l6 6-6 6',
    izquierda: 'M14.5 6l-6 6 6 6',
    descargar: 'M12 4v11 M7.5 10.8l4.5 4.5 4.5-4.5 M5 19.5h14',
    compartir: 'M12 15.5V4 M7.8 8.2L12 4l4.2 4.2 M6 12v6.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V12',
    copiar: 'M9 8.5h9a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 19v-9A1.5 1.5 0 0 1 9 8.5z M16.5 8.5V6A1.5 1.5 0 0 0 15 4.5H6A1.5 1.5 0 0 0 4.5 6v9A1.5 1.5 0 0 0 6 16.5h1.5',
    papelera: 'M4.5 7h15 M9.5 7V4.5h5V7 M6.5 7l.9 12.5h9.2L17.5 7 M10 11v5.5 M14 11v5.5',
    otro: 'M19.5 12a7.5 7.5 0 0 0-13-5 M5.5 3.8v3.7h3.7 M4.5 12a7.5 7.5 0 0 0 13 5 M18.5 20.2v-3.7h-3.7',
    check: 'M5 12.5l4.5 4.5L19 7.5',
  };

  function icono(nombre, clase) {
    return svgEl('svg', { class: 'icono' + (clase ? ' ' + clase : ''), viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
      svgEl('path', { d: ICONOS[nombre] }));
  }

  function svgEstrella(clase, tam) {
    return svgEl('svg', { class: clase, viewBox: '-1 -1 2 2', 'aria-hidden': 'true', focusable: 'false', width: tam, height: tam },
      svgEl('path', { d: formas.estrella(0, 0, 1) }));
  }

  /* ----------------------------------------------------- Datos y tema */

  function texto(v) {
    return typeof v === 'string' ? v.trim() : '';
  }

  function soloHttp(url) {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
    } catch (e) {
      return '';
    }
  }

  function leerNegocio() {
    const nodo = document.getElementById('negocio');
    let d;
    try {
      d = JSON.parse(nodo.textContent);
    } catch (e) {
      return null;
    }
    if (!d || typeof d !== 'object') return null;
    const sector = texto(d.sector);
    const entero = (v) => Math.max(0, Math.round(Number(v)) || 0);
    return {
      slug: texto(d.slug) || 'negocio',
      nombre: texto(d.nombre) || 'Tu negocio',
      sector,
      tema: TEMAS.includes(d.tema) ? d.tema : (TEMA_POR_SECTOR[sector] || 'rosa'),
      localidad: texto(d.localidad),
      direccion: texto(d.direccion),
      mapa: soloHttp(texto(d.mapa)),
      whatsapp: texto(d.whatsapp).replace(/\D/g, ''),
      telefono: texto(d.telefono_visible),
      demo: d.demo === true,
      validez: texto(d.validez),
      prefijo: (texto(d.prefijo_codigo).replace(/[^A-Za-z]/g, '').toUpperCase() + 'BON').slice(0, 3),
      bonos: (Array.isArray(d.bonos) ? d.bonos : [])
        .map((b) => ({ titulo: texto(b && b.titulo), detalle: texto(b && b.detalle), precio: entero(b && b.precio) }))
        .filter((b) => b.titulo),
      importes: (Array.isArray(d.importes) ? d.importes : []).map(entero).filter((x) => x > 0),
    };
  }

  const COLOR_BARRA = { rosa: '#FBF6F1', noche: '#1C1A19', bosque: '#1F4D3A', calma: '#F4F7F9' };

  function aplicarTema(n) {
    document.documentElement.setAttribute('data-tema', n.tema);
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = el('meta', { name: 'theme-color' });
      document.head.append(meta);
    }
    meta.setAttribute('content', n.demo ? '#211D1F' : COLOR_BARRA[n.tema]);
  }

  function mensajeError(texto) {
    document.body.append(el('main', { class: 'error' },
      el('h1', {}, 'No se ha podido cargar la página'),
      el('p', {}, texto)));
  }

  /* --------------------------------------------------- Textos y enlaces */

  // «40 €» con espacio duro para que el símbolo no quede solo en otra línea.
  function euros(n) {
    return String(n) + '\u00A0€';
  }

  function eurosPlano(n) {
    return String(n) + ' €';
  }

  function urlWhatsApp(n, mensaje) {
    return 'https://wa.me/' + n.whatsapp + '?text=' + encodeURIComponent(mensaje);
  }

  function telHref(tel) {
    const cifras = tel.replace(/\D/g, '');
    if (cifras.length === 11 && cifras.startsWith('34')) return 'tel:+' + cifras;
    return 'tel:' + cifras;
  }

  /* ------------------------------------------------------- Aviso de demo */

  // Franja fija arriba: una línea compacta y, al tocarla, la oferta y el enlace.
  function crearAvisoDemo(n, enlace) {
    return el('details', { class: 'demo' },
      el('summary', { class: 'demo__barra' },
        svgEstrella('demo__estrella', 14),
        el('span', { class: 'demo__texto' }, 'Demo para ' + n.nombre + ' · ', el('span', { class: 'demo__nota' }, 'Precios de ejemplo')),
        el('span', { class: 'demo__mas' },
          el('span', { class: 'demo__si-cerrado' }, 'Ver más'), el('span', { class: 'demo__si-abierto' }, 'Cerrar'),
          icono('abajo', 'demo__flecha'))),
      el('div', { class: 'demo__panel' },
        el('p', { class: 'demo__oferta' },
          'Si os gusta, la dejo con vuestros servicios y precios por ' + PRECIO_DEMO + ', pago único. Contestad al WhatsApp de Cristian.'),
        el('a', { class: 'demo__enlace', href: enlace.href }, enlace.texto, icono('derecha'))));
  }

  /* ------------------------------------------------------ Tarjeta (HTML) */

  // La tarjeta regalo dibujada con HTML, CSS y SVG. Sirve en la portada, en la imagen de vista previa y en la portada del sitio.
  function crearLazo(clase) {
    return svgEl('svg', { class: clase, viewBox: '0 0 ' + lazo.ancho + ' ' + lazo.alto, 'aria-hidden': 'true', focusable: 'false' },
      svgEl('path', { class: 'lazo__cola', d: lazo.colaIzq }),
      svgEl('path', { class: 'lazo__cola', d: lazo.colaDer }),
      svgEl('path', { class: 'lazo__lazada', d: lazo.lazadaIzq }),
      svgEl('path', { class: 'lazo__lazada', d: lazo.lazadaDer }),
      svgEl('path', { class: 'lazo__hueco', d: lazo.huecoIzq }),
      svgEl('path', { class: 'lazo__hueco', d: lazo.huecoDer }),
      svgEl('path', { class: 'lazo__pliegue', d: lazo.pliegueIzq }),
      svgEl('path', { class: 'lazo__pliegue', d: lazo.pliegueDer }),
      svgEl('path', { class: 'lazo__brillo', d: lazo.brilloIzq }),
      svgEl('path', { class: 'lazo__brillo', d: lazo.brilloDer }),
      svgEl('path', { class: 'lazo__nudo', d: lazo.nudo }),
      svgEl('path', { class: 'lazo__brillo', d: lazo.brilloNudo }));
  }

  // Dos ramitas de pino que salen en horizontal de una estrella, con sus bayas junto al centro.
  function crearRama(clase) {
    const lado = (x, giro) => svgEl('g', { transform: 'translate(' + x + ' 0) rotate(' + giro + ') scale(.95)' },
      svgEl('path', { class: 'rama__trazo', d: formas.rama() }),
      svgEl('path', { class: 'rama__baya', d: formas.bayas() }));
    return svgEl('svg', { class: clase, viewBox: '-112 -17 224 34', 'aria-hidden': 'true', focusable: 'false' },
      lado(-9, -90), lado(9, 90),
      svgEl('path', { class: 'rama__estrella', d: formas.estrella(0, 0, 8.5) }));
  }

  function crearCopo(clase) {
    return svgEl('svg', { class: clase, viewBox: '-11 -11 22 22', 'aria-hidden': 'true', focusable: 'false' },
      svgEl('path', { d: formas.copo(0, 0, 10) }));
  }

  function crearTarjeta(n, opciones) {
    const o = opciones || {};
    const pie = [];
    if (n.validez && o.validez !== false) pie.push(el('span', {}, 'Válido hasta el ' + n.validez));
    if (n.localidad) pie.push(el('span', { class: 'regalo__lugar' }, n.localidad));
    return el('div', { class: 'regalo' + (o.clase ? ' ' + o.clase : ''), 'data-tema': o.tema || n.tema, 'aria-hidden': 'true' },
      el('div', { class: 'regalo__cara' },
        el('span', { class: 'regalo__marco' }),
        el('span', { class: 'regalo__marco regalo__marco--fino' }),
        crearCopo('regalo__copo regalo__copo--a'),
        crearCopo('regalo__copo regalo__copo--b'),
        svgEstrella('regalo__estrella'),
        el('p', { class: 'regalo__rotulo' }, 'Tarjeta regalo'),
        el('div', { class: 'regalo__zona' }, el('p', { class: 'regalo__nombre' }, n.nombre)),
        el('div', { class: 'regalo__cinta' }, crearLazo('regalo__lazo')),
        el('div', { class: 'regalo__bajo' },
          el('p', { class: 'regalo__lema' }, 'Bonos regalo de Navidad'),
          crearRama('regalo__rama'),
          el('p', { class: 'regalo__pie' }, pie))));
  }

  /* --------------------------------------------------- Ajuste de textos */

  // Busca el mayor tamaño entre min y max con el que el texto cabe en `lineas` líneas
  // sin que ninguna palabra se salga por los lados. Con unidad 'em' el resultado escala con la tarjeta.
  function ajustarTexto(nodo, o) {
    const unidad = o.unidad || 'px';
    const paso = o.paso || (unidad === 'em' ? 0.02 : 0.5);
    nodo.classList.remove('rompe');
    const poner = (v) => { nodo.style.fontSize = v.toFixed(3) + unidad; };
    const cabe = () => {
      const cs = getComputedStyle(nodo);
      const linea = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      // el último renglón se pasa un poco por debajo (rabo de las letras): se cuenta con holgura
      const usadas = Math.floor(nodo.scrollHeight / linea + 0.3);
      if (nodo.scrollWidth > nodo.clientWidth + 1 || usadas > o.lineas) return false;
      if (o.limiteAlto && nodo.parentElement) {
        const pcs = getComputedStyle(nodo.parentElement);
        const libre = nodo.parentElement.clientHeight - parseFloat(pcs.paddingTop) - parseFloat(pcs.paddingBottom);
        if (nodo.scrollHeight > libre + linea * 0.12) return false;
      }
      return true;
    };
    poner(o.max);
    if (cabe()) return o.max;
    poner(o.min);
    if (!cabe()) {
      nodo.classList.add('rompe');
      return o.min;
    }
    let bajo = o.min;
    let alto = o.max;
    while (alto - bajo > paso) {
      const medio = (bajo + alto) / 2;
      poner(medio);
      if (cabe()) bajo = medio; else alto = medio;
    }
    poner(bajo);
    return bajo;
  }

  function ajustarTarjetas(raiz) {
    for (const nodo of (raiz || document).querySelectorAll('.regalo__nombre')) {
      ajustarTexto(nodo, { min: 0.78, max: 1.9, lineas: 3, unidad: 'em', limiteAlto: true });
    }
  }

  /* ----------------------------------------------------------- Fuentes */

  const MUESTRA = 'ÁÉÍÓÚÑáéíóúñüç¡¿€«»·ºª0123456789';

  // Espera a que Fraunces y Manrope estén cargadas (o a 3,5 s: sin red se usan las del sistema).
  function fuentesListas() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const pedidas = [
      '600 40px Fraunces', '700 40px Fraunces', 'italic 500 40px Fraunces', 'italic 400 40px Fraunces',
      '400 20px Manrope', '600 20px Manrope', '700 20px Manrope', '800 20px Manrope',
    ].map((f) => document.fonts.load(f, MUESTRA).catch(() => null));
    const limite = new Promise((ok) => setTimeout(ok, 3500));
    return Promise.race([Promise.all(pedidas), limite]);
  }

  function alResize(fn) {
    let reloj = 0;
    window.addEventListener('resize', () => {
      clearTimeout(reloj);
      reloj = setTimeout(fn, 120);
    });
  }

  /* -------------------------------------------------------------- Chispas */

  // Estrellitas y copos sueltos para el fondo de las portadas: [x %, y %, tamaño px, tipo].
  const CHISPAS = [
    [7, 9, 13, 'e'], [88, 6, 17, 'e'], [94, 31, 9, 'e'], [2.5, 40, 9, 'e'], [93, 52, 24, 'c'],
    [2.5, 66, 26, 'c'], [84, 84, 12, 'e'], [47, 3, 9, 'e'], [70, 20, 8, 'e'], [24, 95, 10, 'e'], [60, 96, 14, 'e'],
  ];

  function crearChispas(lista) {
    return el('div', { class: 'chispas', 'aria-hidden': 'true' },
      (lista || CHISPAS).map(([x, y, tam, tipo]) => {
        const nodo = tipo === 'c' ? crearCopo('chispa chispa--copo') : svgEstrella('chispa', tam);
        nodo.setAttribute('style', 'left:' + x + '%;top:' + y + '%;width:' + tam + 'px;height:' + tam + 'px');
        return nodo;
      }));
  }

  /* ------------------------------------------------------------ Paleta */

  // Los colores del tema salen del CSS, así la tarjeta de canvas y la de HTML nunca se separan.
  function paleta() {
    const cs = getComputedStyle(document.documentElement);
    const g = (nombre) => cs.getPropertyValue(nombre).trim();
    return {
      a: g('--t-a'), b: g('--t-b'), brillo: g('--t-brillo'), punto: g('--t-punto'),
      texto: g('--t-texto'), suave: g('--t-suave'), etiqueta: g('--t-etq'),
      oro: g('--t-oro'), oro1: g('--t-oro-1'), oro2: g('--t-oro-2'),
      cinta1: g('--t-cinta-1'), cinta2: g('--t-cinta-2'), cinta3: g('--t-cinta-3'),
      cintaBorde: g('--t-cinta-borde'),
    };
  }

  window.BONO = {
    TEMAS, formas, lazo, el, svgEl, icono, svgEstrella,
    leerNegocio, aplicarTema, mensajeError, euros, eurosPlano, urlWhatsApp, telHref,
    crearAvisoDemo, crearTarjeta, crearLazo, crearRama, crearCopo, crearChispas,
    ajustarTexto, ajustarTarjetas, fuentesListas, alResize, paleta,
  };
})();
