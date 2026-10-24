/* bonoregalo.es · herramienta para crear la tarjeta regalo desde el móvil.
   Lee el JSON de #negocio, dibuja la tarjeta (1080 × 1350) en un <canvas> y la comparte, la descarga o copia el texto.
   Depende de comun.js. Los colores salen del CSS (--t-*), así la tarjeta y la portada nunca se separan. */
(function () {
  'use strict';

  const { el, icono, svgEl } = BONO;
  const n = BONO.leerNegocio();
  const app = document.getElementById('app');

  if (!n) {
    BONO.mensajeError('Faltan los datos del negocio. Si eres el dueño, escribe a Cristian por WhatsApp.');
    return;
  }
  BONO.aplicarTema(n);
  document.title = 'Crear tarjeta regalo · ' + n.nombre;

  /* ===================================================================== Estado */

  const MAX_MENSAJE = 120;
  const OTRO = 'otro';
  const opcionesRegalo = [];
  n.bonos.forEach((b, i) => opcionesRegalo.push({
    valor: 'bono:' + i, etiqueta: b.titulo + ' · ' + BONO.euros(b.precio), titulo: b.titulo, detalle: b.detalle,
  }));
  n.importes.forEach((x, i) => opcionesRegalo.push({
    valor: 'importe:' + i, etiqueta: 'Bono de ' + BONO.euros(x), titulo: 'Bono de ' + BONO.eurosPlano(x), detalle: '',
  }));

  const estado = {
    para: '',
    de: '',
    regalo: opcionesRegalo.length ? opcionesRegalo[0].valor : OTRO,
    otro: '',
    mensaje: '',
    validez: n.validez,
    codigo: '',
    codigoUsado: false, // cuando la tarjeta ya se ha creado, cualquier cambio pide código nuevo
  };

  function regaloActual() {
    const op = opcionesRegalo.find((o) => o.valor === estado.regalo);
    if (op) return { titulo: op.titulo, detalle: op.detalle, vacio: false };
    const libre = estado.otro.trim();
    return { titulo: libre || 'Escribe el regalo', detalle: '', vacio: !libre };
  }

  /* ===================================================================== Registro */

  const CLAVE = 'bonoregalo:' + n.slug + ':tarjetas';
  let enMemoria = [];
  let almacenOk = true;

  function leerRegistro() {
    try {
      const v = JSON.parse(localStorage.getItem(CLAVE) || '[]');
      return Array.isArray(v) ? v.filter((e) => e && typeof e.codigo === 'string') : [];
    } catch (e) {
      almacenOk = false;
      return enMemoria;
    }
  }

  function guardarRegistro(lista) {
    enMemoria = lista;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(lista));
    } catch (e) {
      almacenOk = false;
    }
  }

  function fechaCorta(iso) {
    const f = new Date(iso);
    if (Number.isNaN(f.getTime())) return '';
    return f.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
      f.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  /* ===================================================================== Código */

  // Sin 0, O, 1 ni I para que nadie los confunda al dictarlos.
  const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function aleatorio(max) {
    if (window.crypto && crypto.getRandomValues) {
      const v = new Uint32Array(1);
      const limite = Math.floor(0x100000000 / max) * max;
      do { crypto.getRandomValues(v); } while (v[0] >= limite);
      return v[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  function nuevoCodigo() {
    const usados = new Set(leerRegistro().map((e) => e.codigo));
    let codigo;
    do {
      let cola = '';
      for (let i = 0; i < 4; i++) cola += ALFABETO[aleatorio(ALFABETO.length)];
      codigo = n.prefijo + '-' + cola;
    } while (usados.has(codigo));
    return codigo;
  }

  estado.codigo = nuevoCodigo();

  /* ===================================================================== Textos */

  function textoParaEnviar() {
    const para = estado.para.trim();
    let t = (para ? '¡Hola ' + para + '!' : '¡Hola!') + ' Aquí tienes tu regalo: ' + regaloActual().titulo + ' en ' + n.nombre +
      '. Código: ' + estado.codigo + '.';
    const validez = estado.validez.trim().replace(/\.+$/, '');
    if (validez) t += ' Válido hasta el ' + validez + '.';
    if (n.telefono) t += ' Para reservar, escribe al ' + n.telefono + '.';
    return t;
  }

  function nombreArchivo() {
    const limpio = (estado.para || 'regalo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28) || 'regalo';
    return 'tarjeta-' + limpio + '-' + estado.codigo.toLowerCase() + '.png';
  }

  /* ===================================================================== Interfaz */

  const campos = {};

  function campo(id, etiqueta, control, ayuda) {
    return el('div', { class: 'campo' },
      el('label', { for: id }, etiqueta),
      control,
      ayuda && el('p', { class: 'campo__ayuda', id: id + '-ayuda' }, ayuda));
  }

  function entrada(id, atributos) {
    const c = el('input', Object.assign({ class: 'entrada', type: 'text', id, name: id, autocomplete: 'off', spellcheck: 'false' }, atributos));
    campos[id] = c;
    return c;
  }

  const selectRegalo = el('select', { class: 'entrada entrada--select', id: 'regalo', name: 'regalo' },
    opcionesRegalo.map((o) => el('option', { value: o.valor }, o.etiqueta)),
    el('option', { value: OTRO }, 'Otro…'));
  campos.regalo = selectRegalo;
  selectRegalo.value = estado.regalo;

  const cuentaMensaje = el('span', { class: 'campo__cuenta', id: 'mensaje-cuenta' }, '0/' + MAX_MENSAJE);
  const areaMensaje = el('textarea', {
    class: 'entrada entrada--area', id: 'mensaje', name: 'mensaje', rows: '3', maxlength: String(MAX_MENSAJE),
    'aria-describedby': 'mensaje-cuenta', placeholder: 'Por ejemplo: Feliz Navidad, mamá. Te lo mereces.',
  });
  campos.mensaje = areaMensaje;

  const campoOtro = campo('regalo-otro', 'Escribe el regalo', entrada('regalo-otro', { maxlength: '60', placeholder: 'Por ejemplo: Sesión de masaje de 30 minutos' }));
  campoOtro.hidden = true;

  const campoCodigo = el('input', { class: 'entrada entrada--codigo', type: 'text', id: 'codigo', name: 'codigo', readonly: true, 'aria-describedby': 'codigo-ayuda' });
  campos.codigo = campoCodigo;
  const botonOtroCodigo = el('button', { class: 'boton boton--contorno boton--chico', type: 'button', id: 'otro-codigo' }, icono('otro'), 'Otro código');

  const estadoMensaje = el('p', { class: 'estado', id: 'estado', role: 'status', 'aria-live': 'polite' });

  const botonCompartir = el('button', { class: 'boton boton--grande', type: 'button', id: 'compartir', hidden: true }, icono('compartir'), 'Compartir');
  const botonDescargar = el('button', { class: 'boton boton--grande', type: 'button', id: 'descargar' }, icono('descargar'), 'Descargar imagen');
  const botonCopiar = el('button', { class: 'boton boton--grande boton--contorno', type: 'button', id: 'copiar' }, icono('copiar'), 'Copiar texto');

  const lienzo = el('canvas', {
    id: 'lienzo', width: '1080', height: '1350', role: 'img', 'aria-label': 'Vista previa de la tarjeta regalo',
  });

  const listaRegistro = el('ul', { class: 'registro__lista' });
  const vacioRegistro = el('p', { class: 'registro__vacio' }, 'Todavía no has creado ninguna tarjeta en este móvil.');
  const botonCopiarLista = el('button', { class: 'boton boton--contorno boton--chico', type: 'button', id: 'copiar-lista' }, icono('copiar'), 'Copiar lista');
  const avisoAlmacen = el('p', { class: 'registro__aviso', hidden: true }, 'Este navegador no deja guardar datos: el registro solo dura mientras no cierres la página.');

  const formulario = el('form', { class: 'formulario', id: 'formulario', novalidate: true, autocomplete: 'off' },
    campo('para', 'Para', entrada('para', { maxlength: '40', autocapitalize: 'words', placeholder: 'Nombre de quien lo recibe', enterkeyhint: 'next', required: true })),
    campo('de', 'De parte de', entrada('de', { maxlength: '40', autocapitalize: 'words', placeholder: 'Tu nombre o el de quien lo regala', enterkeyhint: 'next' })),
    campo('regalo', 'Regalo', selectRegalo),
    campoOtro,
    campo('mensaje', 'Mensaje (opcional, máximo 120 caracteres)', areaMensaje),
    el('div', { class: 'campo__pie' }, cuentaMensaje),
    campo('validez', 'Válido hasta', entrada('validez', { maxlength: '40', placeholder: 'Por ejemplo: 31 de marzo de 2027' })),
    el('div', { class: 'campo' },
      el('label', { for: 'codigo' }, 'Código'),
      el('div', { class: 'campo__fila' }, campoCodigo, botonOtroCodigo),
      el('p', { class: 'campo__ayuda', id: 'codigo-ayuda' }, 'Sale solo y no se repite. Cada tarjeta tiene el suyo.')));
  formulario.addEventListener('submit', (e) => e.preventDefault());

  function crearRegistro() {
    return el('section', { class: 'registro', 'aria-labelledby': 'titulo-registro' },
      el('div', { class: 'registro__cabecera' },
        el('h2', { id: 'titulo-registro' }, 'Tarjetas creadas en este móvil'),
        botonCopiarLista),
      el('p', { class: 'registro__sub' }, 'Se guarda solo aquí, en este móvil. Apunta cada código al cobrar el regalo.'),
      avisoAlmacen, vacioRegistro, listaRegistro);
  }

  const hoja = el('div', { class: 'herr' },
    el('header', { class: 'herr__cabecera' },
      el('p', { class: 'sobretitulo' }, 'Para el negocio'),
      el('h1', {}, 'Crear tarjeta regalo', el('span', { class: 'sr' }, ' · '), el('span', { class: 'herr__nombre' }, n.nombre)),
      el('p', { class: 'seccion__sub' }, 'Rellena los datos, mira cómo queda y mándala por WhatsApp.')),
    el('div', { class: 'herr__rejilla' },
      el('figure', { class: 'vista' }, lienzo, el('figcaption', {}, 'Así se verá. Se envía como imagen.')),
      el('div', { class: 'herr__mando' },
        formulario,
        el('div', { class: 'acciones' }, botonCompartir, botonDescargar, botonCopiar),
        estadoMensaje,
        crearRegistro())));

  app.replaceChildren(...[
    n.demo ? BONO.crearAvisoDemo(n, { href: '../', texto: 'Volver a la página de bonos' }) : null,
    el('main', { id: 'contenido' }, hoja),
    el('footer', { class: 'pie' },
      el('p', { class: 'pie__nombre' }, n.localidad ? n.nombre + ' · ' + n.localidad : n.nombre),
      el('p', { class: 'pie__marca' }, el('a', { href: '../../' }, 'Herramienta de bonoregalo.es'))),
  ].filter(Boolean));

  /* ===================================================================== Avisos */

  let relojAviso = 0;
  function avisar(texto, error) {
    estadoMensaje.textContent = texto;
    estadoMensaje.classList.toggle('estado--error', !!error);
    clearTimeout(relojAviso);
    relojAviso = setTimeout(() => { estadoMensaje.textContent = ''; }, 7000);
  }

  /* ===================================================================== Dibujo (canvas) */

  const W = 1080;
  const H = 1350;
  const U = W / 20;
  const CX = W / 2;
  const FUENTE_T = 'Fraunces, "Iowan Old Style", "Palatino Linotype", Georgia, serif';
  const FUENTE_X = 'Manrope, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const fT = (px, peso, cursiva) => (cursiva ? 'italic ' : '') + (peso || 600) + ' ' + px.toFixed(1) + 'px ' + FUENTE_T;
  const fX = (px, peso) => (peso || 600) + ' ' + px.toFixed(1) + 'px ' + FUENTE_X;
  const ctx = lienzo.getContext('2d');
  const muestra = document.createElement('canvas').getContext('2d');

  /* ---- color */

  function rgba(color, alfa) {
    muestra.fillStyle = '#000';
    muestra.fillStyle = color;
    const v = muestra.fillStyle;
    let r; let g; let b; let a = 1;
    if (v[0] === '#') {
      r = parseInt(v.slice(1, 3), 16); g = parseInt(v.slice(3, 5), 16); b = parseInt(v.slice(5, 7), 16);
    } else {
      const m = v.match(/[\d.]+/g).map(Number);
      r = m[0]; g = m[1]; b = m[2]; if (m.length > 3) a = m[3];
    }
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (a * alfa).toFixed(3) + ')';
  }

  function luminancia(color) {
    muestra.fillStyle = '#000';
    muestra.fillStyle = color;
    const v = muestra.fillStyle;
    const c = v[0] === '#' ? [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)) : v.match(/[\d.]+/g).slice(0, 3).map(Number);
    const lin = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  }

  /* ---- texto */

  // Parte un texto en líneas que caben en `ancho`; una palabra más larga que la línea se corta por letras
  // (y el resultado lleva `partida = true`, para preferir un tamaño menor antes que cortar palabras).
  function partir(texto, ancho) {
    const palabras = texto.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const lineas = [];
    let actual = '';
    lineas.partida = false;
    const cabe = (t) => ctx.measureText(t).width <= ancho;
    for (const palabra of palabras) {
      if (!cabe(palabra)) {
        lineas.partida = true;
        if (actual) { lineas.push(actual); actual = ''; }
        let trozo = '';
        for (const ch of palabra) {
          if (cabe(trozo + ch) || !trozo) trozo += ch; else { lineas.push(trozo); trozo = ch; }
        }
        actual = trozo;
        continue;
      }
      const prueba = actual ? actual + ' ' + palabra : palabra;
      if (cabe(prueba)) actual = prueba; else { lineas.push(actual); actual = palabra; }
    }
    if (actual) lineas.push(actual);
    return lineas;
  }

  // Igual que partir, pero reparte las palabras para que las líneas queden parecidas de largo.
  function partirEquilibrado(texto, ancho) {
    const base = partir(texto, ancho);
    if (base.length < 2) return base;
    let bajo = Math.max(...base.map((l) => ctx.measureText(l).width)) * 0.5;
    let alto = ancho;
    let mejor = base;
    for (let i = 0; i < 10; i++) {
      const medio = (bajo + alto) / 2;
      const prueba = partir(texto, medio);
      if (prueba.length <= base.length) { mejor = prueba; alto = medio; } else bajo = medio;
    }
    return mejor.length === base.length ? mejor : base;
  }

  // Busca el mayor tamaño (entre max y min) con el que el texto cabe en `lineas` líneas y, si se da, en `altoMax` de alto.
  // Primero sin cortar ninguna palabra; solo si no hay manera, cortando por letras. Nunca se sale: al mínimo recorta con «…».
  function ajustar(texto, o) {
    const interlineado = o.interlineado || 1.1;
    for (const permitirCorte of [false, true]) {
      for (let px = o.max; px >= o.min - 0.01; px -= o.paso || 2) {
        ctx.font = o.fuente(px);
        const ls = partir(texto, o.ancho);
        if (ls.partida && !permitirCorte) continue;
        if (ls.length > o.lineas) continue;
        if (o.altoMax && ls.length * px * interlineado > o.altoMax + 0.5) continue;
        const eq = partirEquilibrado(texto, o.ancho);
        return { px, lineas: eq.length <= o.lineas ? eq : ls, alto: Math.max(1, ls.length) * px * interlineado, interlineado };
      }
    }
    ctx.font = o.fuente(o.min);
    const ls = partir(texto, o.ancho).slice(0, o.lineas);
    let ultima = ls[ls.length - 1] || '';
    while (ultima && ctx.measureText(ultima + '…').width > o.ancho) ultima = ultima.slice(0, -1);
    ls[ls.length - 1] = ultima.trimEnd() + '…';
    return { px: o.min, lineas: ls, alto: ls.length * o.min * interlineado, interlineado };
  }

  function lineasCentradas(ajuste, y, fuente, color, x) {
    ctx.font = fuente(ajuste.px);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const alto = ajuste.px * ajuste.interlineado;
    ajuste.lineas.forEach((l, i) => ctx.fillText(l, x === undefined ? CX : x, y + i * alto + alto / 2 + ajuste.px * 0.3));
  }

  // Texto con espacio entre letras, centrado en x (el canvas de algunos móviles no admite letterSpacing).
  function espaciado(texto, x, y, px, peso, espacio, color, alinear) {
    ctx.font = fX(px, peso);
    ctx.fillStyle = color;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    const letras = Array.from(texto);
    const anchos = letras.map((c) => ctx.measureText(c).width);
    const total = anchos.reduce((a, b) => a + b, 0) + espacio * (letras.length - 1);
    let cursor = alinear === 'izq' ? x : x - total / 2;
    letras.forEach((c, i) => { ctx.fillText(c, cursor, y + px * 0.34); cursor += anchos[i] + espacio; });
    return total;
  }

  function anchoEspaciado(texto, px, peso, espacio) {
    ctx.font = fX(px, peso);
    const letras = Array.from(texto);
    return letras.reduce((a, c) => a + ctx.measureText(c).width, 0) + espacio * (letras.length - 1);
  }

  /* ---- formas */

  function rectRedondo(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function estrella(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.fill(new Path2D(BONO.formas.estrella(x, y, r)));
  }

  function copo(x, y, tam, color, grosor) {
    ctx.save();
    ctx.translate(x, y);
    const e = tam / 22;
    ctx.scale(e, e);
    ctx.strokeStyle = color;
    ctx.lineWidth = grosor;
    ctx.lineCap = 'round';
    ctx.stroke(new Path2D(BONO.formas.copo(0, 0, 10)));
    ctx.restore();
  }

  function dibujarLazo(p, cx, cy, ancho) {
    const L = BONO.lazo;
    const e = ancho / L.ancho;
    ctx.save();
    ctx.translate(cx - 100 * e, cy - 56 * e);
    ctx.scale(e, e);
    ctx.shadowColor = 'rgba(0,0,0,.32)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 7;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1;
    ctx.strokeStyle = p.cintaBorde;
    for (const [d, color] of [[L.colaIzq, p.cinta3], [L.colaDer, p.cinta3], [L.lazadaIzq, p.cinta2], [L.lazadaDer, p.cinta2]]) {
      const ruta = new Path2D(d);
      ctx.fillStyle = color;
      ctx.fill(ruta);
      ctx.stroke(ruta);
    }
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = p.cinta3;
    ctx.fill(new Path2D(L.huecoIzq));
    ctx.fill(new Path2D(L.huecoDer));
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = p.cinta3;
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.stroke(new Path2D(L.pliegueIzq));
    ctx.stroke(new Path2D(L.pliegueDer));
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = p.cinta1;
    ctx.lineWidth = 1.7;
    ctx.stroke(new Path2D(L.brilloIzq));
    ctx.stroke(new Path2D(L.brilloDer));
    ctx.globalAlpha = 1;
    ctx.shadowColor = 'rgba(0,0,0,.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    const nudo = new Path2D(L.nudo);
    ctx.fillStyle = p.cinta2;
    ctx.fill(nudo);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = p.cintaBorde;
    ctx.lineWidth = 1;
    ctx.stroke(nudo);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = p.cinta1;
    ctx.lineWidth = 1.7;
    ctx.stroke(new Path2D(L.brilloNudo));
    ctx.restore();
  }

  /* ---- fondo, marcos y cinta */

  let patron = null;
  let patronColor = '';

  function fondo(p) {
    // diagonal de 158º, como el degradado de la tarjeta HTML
    const ang = 158 * Math.PI / 180;
    const dx = Math.sin(ang);
    const dy = -Math.cos(ang);
    const largo = Math.abs(W * dx) + Math.abs(H * dy);
    const g = ctx.createLinearGradient(CX - dx * largo / 2, H / 2 - dy * largo / 2, CX + dx * largo / 2, H / 2 + dy * largo / 2);
    g.addColorStop(0, p.a);
    g.addColorStop(1, p.b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const r = ctx.createRadialGradient(W * 0.18, H * 0.05, 0, W * 0.18, H * 0.05, W * 0.62);
    r.addColorStop(0, p.brillo);
    r.addColorStop(1, rgba(p.brillo, 0));
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, W, H);

    // punteado fino
    if (!patron || patronColor !== p.punto) {
      const m = document.createElement('canvas');
      m.width = m.height = 24;
      const c = m.getContext('2d');
      c.fillStyle = p.punto;
      c.beginPath();
      c.arc(12, 12, 2.1, 0, Math.PI * 2);
      c.fill();
      patron = ctx.createPattern(m, 'repeat');
      patronColor = p.punto;
    }
    ctx.fillStyle = patron;
    ctx.fillRect(0, 0, W, H);
  }

  function marcos(p) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, p.oro);
    g.addColorStop(0.35, p.oro1);
    g.addColorStop(0.65, p.oro);
    g.addColorStop(1, p.oro2);
    ctx.strokeStyle = g;
    ctx.lineWidth = 5;
    rectRedondo(46, 46, W - 92, H - 92, 38);
    ctx.stroke();
    ctx.strokeStyle = rgba(p.oro, 0.55);
    ctx.lineWidth = 2.5;
    rectRedondo(72, 72, W - 144, H - 144, 24);
    ctx.stroke();
  }

  function cinta(p, yCentro, alto) {
    const y = yCentro - alto / 2;
    const g = ctx.createLinearGradient(0, y, 0, y + alto);
    g.addColorStop(0, p.cinta1);
    g.addColorStop(0.4, p.cinta2);
    g.addColorStop(1, p.cinta3);
    ctx.fillStyle = g;
    ctx.fillRect(0, y, W, alto);
    ctx.fillStyle = p.cintaBorde;
    ctx.fillRect(0, y, W, 3.5);
    ctx.fillRect(0, y + alto - 3.5, W, 3.5);
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([11, 8]);
    for (const dy of [alto * 0.17, alto * 0.83]) {
      ctx.beginPath();
      ctx.moveTo(0, y + dy);
      ctx.lineTo(W, y + dy);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  /* ---- bloques del cuerpo */

  // Cada bloque mide su alto con la escala s y se dibuja donde le digan.
  function bloqueEtiquetado(etiqueta, p, s, contenido) {
    const pxEtq = 25 * s;
    const hueco = 14 * s;
    return {
      alto: pxEtq * 1.2 + hueco + contenido.alto,
      dibujar(y) {
        espaciado(etiqueta, CX, y + pxEtq * 0.6, pxEtq, 700, pxEtq * 0.34, p.etiqueta);
        contenido.dibujar(y + pxEtq * 1.2 + hueco);
      },
    };
  }

  function bloquePara(p, d, s) {
    const a = ajustar(d.para || 'Nombre', { fuente: (px) => fT(px, 600, true), ancho: 820, max: 100 * s, min: 46 * s, lineas: 2, interlineado: 1.08 });
    return bloqueEtiquetado('PARA', p, s, {
      alto: a.alto,
      dibujar(y) {
        ctx.save();
        if (!d.para) ctx.globalAlpha = 0.4;
        lineasCentradas(a, y, (px) => fT(px, 600, true), p.texto);
        ctx.restore();
      },
    });
  }

  // Dos ramitas de pino a cada lado de una estrella (el mismo dibujo que el de la tarjeta de la página).
  function bloqueSeparador(p, s) {
    const ancho = 300 * s;
    const alto = ancho * 34 / 224;
    return {
      alto,
      dibujar(y) {
        const e = ancho / 224;
        ctx.save();
        ctx.translate(CX, y + alto / 2);
        ctx.scale(e, e);
        for (const [x, giro] of [[-9, -90], [9, 90]]) {
          ctx.save();
          ctx.translate(x, 0);
          ctx.rotate(giro * Math.PI / 180);
          ctx.scale(0.95, 0.95);
          ctx.strokeStyle = p.oro;
          ctx.lineWidth = 1.7;
          ctx.lineCap = 'round';
          ctx.stroke(new Path2D(BONO.formas.rama()));
          ctx.fillStyle = p.cinta2;
          ctx.fill(new Path2D(BONO.formas.bayas()));
          ctx.restore();
        }
        ctx.fillStyle = p.oro;
        ctx.fill(new Path2D(BONO.formas.estrella(0, 0, 8.5)));
        ctx.restore();
      },
    };
  }

  function bloqueRegalo(p, d, s) {
    const t = ajustar(d.regalo.titulo, { fuente: (px) => fT(px, 600), ancho: 840, max: 66 * s, min: 34 * s, lineas: 3, interlineado: 1.1 });
    const pxDet = 30 * s;
    let detalle = null;
    if (d.regalo.detalle) detalle = ajustar(d.regalo.detalle, { fuente: (px) => fX(px, 500), ancho: 820, max: pxDet, min: 20 * s, lineas: 1, interlineado: 1.2 });
    const hueco = detalle ? 10 * s : 0;
    return bloqueEtiquetado('REGALO', p, s, {
      alto: t.alto + hueco + (detalle ? detalle.alto : 0),
      dibujar(y) {
        ctx.save();
        if (d.regalo.vacio) ctx.globalAlpha = 0.4;
        lineasCentradas(t, y, (px) => fT(px, 600), p.texto);
        ctx.restore();
        if (detalle) lineasCentradas(detalle, y + t.alto + hueco, (px) => fX(px, 500), p.suave);
      },
    });
  }

  function bloqueMensaje(p, d, s) {
    if (!d.mensaje) return null;
    const a = ajustar('«' + d.mensaje + '»', { fuente: (px) => fT(px, 400, true), ancho: 800, max: 40 * s, min: 26 * s, lineas: 3, interlineado: 1.22 });
    return { alto: a.alto, dibujar(y) { lineasCentradas(a, y, (px) => fT(px, 400, true), rgba(p.texto, 0.92)); } };
  }

  function bloqueDe(p, d, s) {
    if (!d.de) return null;
    const px = 31 * s;
    const lbl = 'De parte de ';
    let tam = px;
    let anchoLbl; let anchoNom;
    for (; tam >= 20 * s; tam -= 1) {
      ctx.font = fX(tam, 500); anchoLbl = ctx.measureText(lbl).width;
      ctx.font = fX(tam, 800); anchoNom = ctx.measureText(d.de).width;
      if (anchoLbl + anchoNom <= 800) break;
    }
    if (anchoLbl + anchoNom > 800) {
      // aún no cabe: se recorta el nombre
      let nombre = d.de;
      while (nombre.length > 1 && anchoLbl + ctx.measureText(nombre + '…').width > 800) nombre = nombre.slice(0, -1);
      d = Object.assign({}, d, { de: nombre.trimEnd() + '…' });
      ctx.font = fX(tam, 800); anchoNom = ctx.measureText(d.de).width;
    }
    return {
      alto: tam * 1.3,
      dibujar(y) {
        const x0 = CX - (anchoLbl + anchoNom) / 2;
        const base = y + tam * 0.95;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.font = fX(tam, 500); ctx.fillStyle = p.suave; ctx.fillText(lbl, x0, base);
        ctx.font = fX(tam, 800); ctx.fillStyle = p.texto; ctx.fillText(d.de, x0 + anchoLbl, base);
      },
    };
  }

  // Coloca los bloques en la zona [y0, y1]: si no caben se encogen; si sobra sitio, se reparte.
  function colocarCuerpo(p, d, y0, y1) {
    const hacer = (s) => [bloquePara(p, d, s), bloqueSeparador(p, s), bloqueRegalo(p, d, s), bloqueMensaje(p, d, s), bloqueDe(p, d, s)].filter(Boolean);
    let s = 1;
    let bloques = hacer(s);
    let suma = bloques.reduce((a, b) => a + b.alto, 0);
    while (s > 0.6 && (y1 - y0) - suma < 22 * (bloques.length + 1)) {
      s = Math.round((s - 0.04) * 100) / 100;
      bloques = hacer(s);
      suma = bloques.reduce((a, b) => a + b.alto, 0);
    }
    const hueco = Math.min(64, Math.max(10, ((y1 - y0) - suma) / (bloques.length + 1)));
    const total = suma + hueco * (bloques.length - 1);
    let y = y0 + ((y1 - y0) - total) / 2;
    for (const b of bloques) {
      b.dibujar(y);
      y += b.alto + hueco;
    }
  }

  /* ---- entrada con código y validez, y pie */

  function entradaCodigo(p, d, y, alto) {
    const x = 140;
    const ancho = W - 280;
    const clara = luminancia(p.a) > 0.4;
    ctx.fillStyle = clara ? 'rgba(0,0,0,.045)' : 'rgba(255,255,255,.07)';
    rectRedondo(x, y, ancho, alto, 24);
    ctx.fill();
    ctx.strokeStyle = rgba(p.oro, 0.9);
    ctx.lineWidth = 3;
    ctx.stroke();

    const hayValidez = !!d.validez;
    const corte = hayValidez ? x + ancho * 0.44 : x + ancho;
    const cxCodigo = hayValidez ? (x + corte) / 2 : CX;
    const yEtiqueta = y + 31;
    const yCuerpo = y + alto - 41;
    const pxEtq = 23;
    espaciado('CÓDIGO', cxCodigo, yEtiqueta, pxEtq, 700, pxEtq * 0.3, p.etiqueta);
    let pxCod = 48;
    while (pxCod > 30 && anchoEspaciado(d.codigo, pxCod, 800, pxCod * 0.1) > (hayValidez ? corte - x - 40 : ancho - 80)) pxCod -= 1;
    espaciado(d.codigo, cxCodigo, yCuerpo, pxCod, 800, pxCod * 0.1, p.texto);

    if (hayValidez) {
      ctx.save();
      ctx.strokeStyle = rgba(p.oro, 0.7);
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 9]);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(corte, y + 20);
      ctx.lineTo(corte, y + alto - 20);
      ctx.stroke();
      ctx.restore();
      const cxVal = (corte + x + ancho) / 2;
      espaciado('VÁLIDO HASTA', cxVal, yEtiqueta, pxEtq, 700, pxEtq * 0.3, p.etiqueta);
      const a = ajustar(d.validez, { fuente: (px) => fX(px, 700), ancho: x + ancho - corte - 44, max: 33, min: 17, lineas: 2, interlineado: 1.1, altoMax: 50, paso: 1 });
      lineasCentradas(a, yCuerpo - a.alto / 2, (px) => fX(px, 700), p.texto, cxVal);
    }
  }

  function pieLugar(p, y) {
    const partes = [n.localidad, n.telefono].filter(Boolean);
    if (!partes.length) return;
    const texto = partes.join('   ·   ').toUpperCase();
    let px = 25;
    while (px > 16 && anchoEspaciado(texto, px, 700, px * 0.16) > 760) px -= 1;
    espaciado(texto, CX, y, px, 700, px * 0.16, p.suave);
  }

  /* ---- la tarjeta entera */

  function dibujar() {
    const p = BONO.paleta();
    const d = {
      para: estado.para.trim(),
      de: estado.de.trim(),
      regalo: regaloActual(),
      mensaje: estado.mensaje.replace(/\s+/g, ' ').trim(),
      validez: estado.validez.trim(),
      codigo: estado.codigo,
    };
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round';

    fondo(p);
    marcos(p);

    // adornos de arriba
    copo(2.85 * U, 2.8 * U, 1.7 * U, rgba(p.oro, 0.85), 0.75);
    copo(W - 2.85 * U, 2.8 * U, 1.7 * U, rgba(p.oro, 0.85), 0.75);
    estrella(CX, 135, 27, p.oro);
    espaciado('TARJETA REGALO', CX, 212, 29, 700, 29 * 0.3, p.etiqueta);

    // nombre del negocio
    const altoCaja = 124;
    const nombre = ajustar(n.nombre, { fuente: (px) => fT(px, 600), ancho: 800, max: 88, min: 34, lineas: 3, interlineado: 1.07, altoMax: altoCaja });
    lineasCentradas(nombre, 246 + (altoCaja - nombre.alto) / 2, (px) => fT(px, 600), p.texto);

    // cinta y lazo
    const yCinta = 446;
    cinta(p, yCinta, 76);
    dibujarLazo(p, CX, yCinta + 2, 308);

    // cuerpo
    colocarCuerpo(p, d, 560, 1066);

    // código, validez y lugar
    entradaCodigo(p, d, 1082, 116);
    pieLugar(p, 1240);

    ctx.restore();
    lienzo.setAttribute('aria-label', 'Vista previa de la tarjeta regalo para ' + (d.para || 'quien la reciba') + ': ' + d.regalo.titulo + '. Código ' + d.codigo + '.');
  }

  /* ===================================================================== Ciclo de dibujo */

  let pendiente = 0;
  let generacion = 0;
  let listo = { clave: '', blob: null };

  function clave() {
    return JSON.stringify([estado.para, estado.de, estado.regalo, estado.otro, estado.mensaje, estado.validez, estado.codigo]);
  }

  // ¿Hay letras fuera del latino básico? Entonces hay que pedir esa parte de la fuente antes de dibujar.
  function textoDelFormulario() {
    return [estado.para, estado.de, estado.otro, estado.mensaje, estado.validez, n.nombre, n.localidad].join(' ');
  }

  async function asegurarFuentes() {
    const t = textoDelFormulario();
    if (!/[^\u0000-\u00FF\u2000-\u206F\u20AC]/.test(t) || !document.fonts || !document.fonts.load) return;
    await Promise.race([
      Promise.all(['600 40px Fraunces', 'italic 400 40px Fraunces', 'italic 600 40px Fraunces', '500 20px Manrope', '800 20px Manrope'].map((f) => document.fonts.load(f, t).catch(() => null))),
      new Promise((ok) => setTimeout(ok, 2500)),
    ]);
  }

  function pedirDibujo() {
    cancelAnimationFrame(pendiente);
    pendiente = requestAnimationFrame(async () => {
      const mia = ++generacion;
      await asegurarFuentes();
      if (mia !== generacion) return;
      dibujar();
      listo = { clave: '', blob: null };
      prepararImagen(mia);
    });
  }

  function aBlob() {
    return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('No se ha podido crear la imagen'))), 'image/png'));
  }

  // La imagen se prepara en cuanto se deja de escribir, para que «Compartir» no tenga que esperar.
  function prepararImagen(mia) {
    const k = clave();
    aBlob().then((b) => { if (mia === generacion) listo = { clave: k, blob: b }; }).catch(() => {});
  }

  async function imagen() {
    if (listo.blob && listo.clave === clave()) return listo.blob;
    await asegurarFuentes();
    dibujar();
    return aBlob();
  }

  /* ===================================================================== Acciones */

  function validar() {
    if (!estado.para.trim()) {
      campos.para.setAttribute('aria-invalid', 'true');
      campos.para.focus();
      avisar('Escribe para quién es el regalo.', true);
      return false;
    }
    campos.para.removeAttribute('aria-invalid');
    if (estado.regalo === OTRO && !estado.otro.trim()) {
      campos['regalo-otro'].setAttribute('aria-invalid', 'true');
      campos['regalo-otro'].focus();
      avisar('Escribe cuál es el regalo.', true);
      return false;
    }
    campos['regalo-otro'].removeAttribute('aria-invalid');
    return true;
  }

  function registrar() {
    const lista = leerRegistro();
    const entrada = { f: new Date().toISOString(), para: estado.para.trim(), regalo: regaloActual().titulo, codigo: estado.codigo };
    const i = lista.findIndex((e) => e.codigo === entrada.codigo);
    if (i >= 0) lista.splice(i, 1);
    lista.unshift(entrada);
    guardarRegistro(lista.slice(0, 500));
    estado.codigoUsado = true;
    pintarRegistro();
  }

  async function copiarAlPortapapeles(texto) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(texto);
        return true;
      } catch (e) { /* se prueba el otro camino */ }
    }
    const t = el('textarea', { class: 'sr', 'aria-hidden': 'true', tabindex: '-1' });
    t.value = texto;
    document.body.append(t);
    t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    t.remove();
    return ok;
  }

  async function descargar(silencioso) {
    if (!validar()) return false;
    let blob;
    try { blob = await imagen(); } catch (e) { avisar('No he podido crear la imagen. Prueba otra vez.', true); return false; }
    const url = URL.createObjectURL(blob);
    const enlace = el('a', { href: url, download: nombreArchivo(), class: 'sr' });
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    registrar();
    if (!silencioso) avisar('Imagen descargada: ' + nombreArchivo(), false);
    return true;
  }

  async function compartir() {
    if (!validar()) return;
    let blob;
    try { blob = await imagen(); } catch (e) { avisar('No he podido crear la imagen. Prueba otra vez.', true); return; }
    const archivo = new File([blob], nombreArchivo(), { type: 'image/png' });
    const datos = { files: [archivo], title: 'Tarjeta regalo · ' + n.nombre, text: textoParaEnviar() };
    if (!(navigator.canShare && navigator.canShare(datos))) {
      await descargar();
      return;
    }
    try {
      await navigator.share(datos);
      registrar();
      avisar('Tarjeta compartida y guardada en el registro.', false);
    } catch (e) {
      if (e && e.name === 'AbortError') avisar('No se ha enviado. Puedes volver a intentarlo.', false);
      else await descargar();
    }
  }

  async function copiarTexto() {
    if (!validar()) return;
    const ok = await copiarAlPortapapeles(textoParaEnviar());
    if (ok) {
      registrar();
      avisar('Texto copiado. Pégalo en el WhatsApp junto a la imagen.', false);
    } else {
      avisar('No he podido copiar el texto.', true);
    }
  }

  botonDescargar.addEventListener('click', () => descargar());
  botonCompartir.addEventListener('click', compartir);
  botonCopiar.addEventListener('click', copiarTexto);

  // «Compartir» solo aparece si este navegador sabe compartir imágenes.
  try {
    if (navigator.canShare && navigator.canShare({ files: [new File([''], 'prueba.png', { type: 'image/png' })] })) {
      botonCompartir.hidden = false;
      botonCompartir.classList.add('boton--principal');
    }
  } catch (e) { /* sin compartir */ }

  /* ===================================================================== Registro en pantalla */

  const confirmando = new Map();

  function pintarRegistro() {
    const lista = leerRegistro();
    avisoAlmacen.hidden = almacenOk;
    vacioRegistro.hidden = lista.length > 0;
    botonCopiarLista.hidden = lista.length === 0;
    listaRegistro.replaceChildren(...lista.map((e) => {
      const etiquetaBorrar = el('span', {}, 'Borrar');
      const borrar = el('button', { class: 'boton boton--contorno boton--chico registro__borrar', type: 'button', 'data-codigo': e.codigo },
        icono('papelera'), etiquetaBorrar, el('span', { class: 'sr' }, ' ' + e.codigo));
      borrar.addEventListener('click', () => {
        // dos toques: el primero pide confirmación y el segundo borra
        if (!confirmando.has(e.codigo)) {
          etiquetaBorrar.textContent = '¿Seguro?';
          borrar.classList.add('registro__borrar--seguro');
          confirmando.set(e.codigo, setTimeout(() => { confirmando.delete(e.codigo); pintarRegistro(); }, 3500));
          return;
        }
        clearTimeout(confirmando.get(e.codigo));
        confirmando.delete(e.codigo);
        guardarRegistro(leerRegistro().filter((x) => x.codigo !== e.codigo));
        pintarRegistro();
        avisar('Tarjeta borrada del registro.', false);
      });
      return el('li', { class: 'registro__fila' },
        el('div', { class: 'registro__datos' },
          el('p', { class: 'registro__fecha' }, fechaCorta(e.f)),
          el('p', { class: 'registro__quien' }, el('strong', {}, e.para || 'Sin nombre'), ' · ', e.regalo),
          el('p', { class: 'registro__codigo' }, e.codigo)),
        borrar);
    }));
  }

  botonCopiarLista.addEventListener('click', async () => {
    const lista = leerRegistro();
    if (!lista.length) return;
    const texto = lista.map((e) => [fechaCorta(e.f), e.para, e.regalo, e.codigo].join(' · ')).join('\n');
    avisar((await copiarAlPortapapeles(texto)) ? 'Lista copiada (' + lista.length + ').' : 'No he podido copiar la lista.', false);
  });

  /* ===================================================================== Eventos de los campos */

  function cambio() {
    if (estado.codigoUsado) {
      estado.codigo = nuevoCodigo();
      estado.codigoUsado = false;
      campoCodigo.value = estado.codigo;
    }
    pedirDibujo();
  }

  function enlazar(id, clave, extra) {
    const c = campos[id];
    const alCambiar = () => {
      estado[clave] = c.value;
      if (extra) extra();
      if (c.getAttribute('aria-invalid') && c.value.trim()) c.removeAttribute('aria-invalid');
      cambio();
    };
    c.addEventListener('input', alCambiar);
    c.addEventListener('change', alCambiar);
  }

  enlazar('para', 'para');
  enlazar('de', 'de');
  enlazar('regalo', 'regalo', () => { campoOtro.hidden = estado.regalo !== OTRO; });
  enlazar('regalo-otro', 'otro');
  enlazar('mensaje', 'mensaje', () => { cuentaMensaje.textContent = estado.mensaje.length + '/' + MAX_MENSAJE; });
  enlazar('validez', 'validez');

  botonOtroCodigo.addEventListener('click', () => {
    estado.codigo = nuevoCodigo();
    estado.codigoUsado = false;
    campoCodigo.value = estado.codigo;
    pedirDibujo();
    avisar('Código nuevo: ' + estado.codigo, false);
  });

  campos.validez.value = estado.validez;
  campoCodigo.value = estado.codigo;
  campoOtro.hidden = estado.regalo !== OTRO;
  pintarRegistro();

  // Primer dibujo: cuando están las fuentes. Si no llegan en 3,5 s se dibuja con las del sistema.
  BONO.fuentesListas().then(() => {
    pedirDibujo();
    // la tarjeta puede repintarse al llegar fuentes tardías
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', pedirDibujo);
  });

  // Ganchos para comprobarlo desde fuera (no los usa la página).
  window.__tarjeta = {
    estado, dibujar, imagen, registrar,
    registro: leerRegistro,
    dibujada: () => lienzo.toDataURL('image/png'),
  };
})();
