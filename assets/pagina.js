/* bonoregalo.es · página pública de bonos regalo de un negocio.
   Lee el JSON de #negocio y pinta todo. Depende de comun.js. */
(function () {
  'use strict';

  const { el, icono, svgEstrella } = BONO;
  const n = BONO.leerNegocio();
  const app = document.getElementById('app');

  if (!n) {
    BONO.mensajeError('Faltan los datos del negocio. Si eres el dueño, escribe a Cristian por WhatsApp.');
    return;
  }
  BONO.aplicarTema(n);

  /* Textos de WhatsApp (los precios llevan espacio normal: es texto, no maquetación). */
  const textoBono = (b) => 'Hola, quiero regalar «' + b.titulo + '» (' + BONO.eurosPlano(b.precio) + ') de ' + n.nombre + '. ¿Cómo hago el pago?';
  const textoImporte = (x) => 'Hola, quiero regalar un bono de ' + BONO.eurosPlano(x) + ' de ' + n.nombre + '. ¿Cómo hago el pago?';
  const textoGeneral = 'Hola, quiero regalar un bono de ' + n.nombre + '. ¿Qué opciones hay?';
  const enlaceWa = (texto, clase, ...hijos) => el('a', {
    class: clase, href: BONO.urlWhatsApp(n, texto), target: '_blank', rel: 'noopener',
  }, ...hijos);

  function cabecera(sobre, titulo, sub) {
    return el('div', { class: 'seccion__cabecera' },
      el('p', { class: 'sobretitulo' }, sobre),
      el('h2', { id: 'titulo-' + sobre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-') }, titulo),
      sub && el('p', { class: 'seccion__sub' }, sub),
      el('div', { class: 'filete', 'aria-hidden': 'true' }, svgEstrella('', 14)));
  }

  function seccion(id, contenido, ...hijos) {
    const raiz = el('section', { class: 'seccion', id }, el('div', { class: 'seccion__interior' }, contenido, ...hijos));
    const titulo = raiz.querySelector('h2');
    if (titulo) raiz.setAttribute('aria-labelledby', titulo.id);
    return raiz;
  }

  /* ---------------------------------------------------------------- Portada */

  function portada() {
    return el('header', { class: 'portada oscuro' },
      BONO.crearChispas(),
      el('div', { class: 'portada__interior' },
        el('div', { class: 'portada__texto' },
          n.localidad && el('p', { class: 'portada__lugar' }, n.localidad),
          el('h1', { class: 'portada__titulo' },
            el('span', { class: 'portada__verbo' }, 'Regala'), ' ',
            el('span', { class: 'portada__nombre' }, n.nombre)),
          el('p', { class: 'portada__sub' }, 'Bonos regalo para estas Navidades'),
          el('a', { class: 'boton boton--grande', href: '#bonos' }, 'Elegir un regalo', icono('abajo'))),
        el('div', { class: 'portada__tarjeta' }, BONO.crearTarjeta(n))));
  }

  /* ------------------------------------------------------------------ Bonos */

  function seccionBonos() {
    if (!n.bonos.length) return null;
    const lista = el('ul', { class: 'bonos', 'data-n': n.bonos.length },
      n.bonos.map((b) => el('li', {},
        el('article', { class: 'bono' },
          el('h3', { class: 'bono__titulo' }, b.titulo),
          b.detalle && el('p', { class: 'bono__detalle' }, b.detalle),
          el('div', { class: 'bono__pie' },
            el('p', { class: 'bono__precio' },
              el('span', { class: 'bono__importe' }, BONO.euros(b.precio)),
              n.demo && el('span', { class: 'bono__nota' }, 'precio de ejemplo')),
            enlaceWa(textoBono(b), 'boton', 'Regalar', el('span', { class: 'sr' }, ' ' + b.titulo), icono('chat')))))));
    return seccion('bonos',
      cabecera('Bonos regalo', 'Elige tu regalo', 'Pulsa «Regalar» y se abre WhatsApp con el mensaje ya escrito.'),
      lista);
  }

  function seccionLibre() {
    if (!n.importes.length) return null;
    return seccion('importe-libre',
      cabecera('Importe libre', '¿Prefieres regalar un importe?', 'Así quien lo recibe elige en qué gastarlo.'),
      el('div', { class: 'importes' },
        n.importes.map((x) => enlaceWa(textoImporte(x), 'boton boton--contorno', 'Bono de ' + BONO.euros(x)))));
  }

  /* --------------------------------------------------------- Cómo funciona */

  function seccionComo() {
    const pasos = [
      ['Elige el regalo', 'Escoge un bono y escribe por WhatsApp.'],
      ['Págalo como prefieras', 'Con Bizum o en el local.'],
      ['Recibe la tarjeta regalo', 'Con el nombre de quien lo recibe, lista para regalar.'],
    ];
    return seccion('como-funciona',
      cabecera('Así de fácil', 'Cómo funciona'),
      el('ol', { class: 'pasos' },
        pasos.map(([titulo, texto], i) => el('li', { class: 'paso' },
          el('h3', { class: 'paso__titulo' }, titulo),
          el('p', { class: 'paso__texto' }, texto),
          n.demo && i === 2 && el('a', { class: 'paso__enlace', href: 'tarjeta/' }, 'Probar la herramienta de tarjetas', icono('derecha'))))));
  }

  /* ------------------------------------------------------------------ Datos */

  function dato(nombreIcono, etiqueta, valor, extra) {
    return el('li', { class: 'dato' },
      icono(nombreIcono),
      el('div', { class: 'dato__cuerpo' },
        el('p', { class: 'dato__etiqueta' }, etiqueta),
        el('p', { class: 'dato__valor' }, valor),
        extra));
  }

  function seccionDatos() {
    const items = [];
    if (n.validez) items.push(dato('calendario', 'Validez', 'Válido hasta el ' + n.validez));
    if (n.direccion || n.mapa) {
      const lugar = [n.direccion, n.direccion && n.localidad].filter(Boolean).join(', ') || n.localidad;
      items.push(dato('pin', 'Dirección', lugar || n.nombre,
        n.mapa && el('a', { class: 'boton boton--contorno boton--chico', href: n.mapa, target: '_blank', rel: 'noopener' }, 'Cómo llegar', icono('derecha'))));
    }
    if (n.telefono) {
      items.push(dato('tel', 'Teléfono', el('a', { href: BONO.telHref(n.telefono) }, n.telefono)));
    }
    if (!items.length) return null;
    return seccion('datos', cabecera('Lo que necesitas saber', 'Validez y contacto'), el('ul', { class: 'datos' }, items));
  }

  /* -------------------------------------------------------------------- Pie */

  function pie() {
    return el('footer', { class: 'pie oscuro' },
      el('p', { class: 'pie__nombre' }, n.localidad ? n.nombre + ' · ' + n.localidad : n.nombre),
      el('p', { class: 'pie__marca' }, el('a', { href: '../' }, 'Página hecha con bonoregalo.es')));
  }

  /* ----------------------------------------------------------------- Montaje */

  const secciones = [seccionBonos(), seccionLibre(), seccionComo(), seccionDatos()].filter(Boolean);
  // El último bloque es el claro y se va alternando hacia arriba, así el pie queda sobre el mismo fondo que el botón flotante.
  secciones.slice().reverse().forEach((s, i) => { if (i % 2 === 1) s.classList.add('seccion--alt'); });

  const cabeza = portada();
  const flotante = enlaceWa(textoGeneral, 'fab', icono('chat'), 'Pedir por WhatsApp');
  app.replaceChildren(...[
    n.demo ? BONO.crearAvisoDemo(n, { href: 'tarjeta/', texto: 'Probar la herramienta de tarjetas' }) : null,
    cabeza,
    el('main', { id: 'contenido' }, secciones),
    el('div', { class: 'fab-hueco' }, flotante),
    pie(),
  ].filter(Boolean));

  // El botón de WhatsApp aparece cuando la portada ya se ha ido.
  if ('IntersectionObserver' in window) {
    flotante.classList.add('fab--oculto');
    new IntersectionObserver((entradas) => {
      const e = entradas[entradas.length - 1];
      flotante.classList.toggle('fab--oculto', e.intersectionRatio > 0.45);
    }, { threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1] }).observe(cabeza);
  }

  /* Titular y nombre de la tarjeta: se ajustan al ancho real y se repiten cuando llegan las fuentes. */
  const nombreTitular = cabeza.querySelector('.portada__nombre');
  function ajustar() {
    const ancho = window.matchMedia('(min-width: 56rem)').matches;
    BONO.ajustarTexto(nombreTitular, { min: 26, max: ancho ? 64 : 52, lineas: 3 });
    BONO.ajustarTarjetas(cabeza);
  }
  ajustar();
  BONO.fuentesListas().then(ajustar);
  BONO.alResize(ajustar);
})();
