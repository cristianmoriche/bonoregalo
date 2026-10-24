/* bonoregalo.es · imagen de vista previa (1200 × 630) de la página de un negocio.
   Se abre con un navegador sin ventana y se captura a og.png. Depende de comun.js. */
(function () {
  'use strict';

  const { el } = BONO;
  const n = BONO.leerNegocio();
  if (!n) return;
  BONO.aplicarTema(n);

  // Estrellitas solo por los bordes y por detrás de la tarjeta: nunca encima del texto.
  const CHISPAS_OG = [
    [5, 9, 13, 'e'], [41, 6, 10, 'e'], [28, 93, 12, 'e'], [4, 90, 17, 'e'], [53, 88, 9, 'e'],
    [96, 9, 14, 'e'], [56, 17, 8, 'e'], [97, 62, 10, 'e'], [47, 93, 9, 'e'], [94, 91, 13, 'e'],
  ];

  const nombre = el('span', { class: 'og__nombre' }, n.nombre);
  const lienzo = el('div', { class: 'og__lienzo oscuro' },
    BONO.crearChispas(CHISPAS_OG),
    el('div', { class: 'og__texto' },
      el('p', { class: 'og__sobre' }, 'Bonos regalo de Navidad'),
      el('h1', { class: 'og__titulo' }, el('span', { class: 'og__verbo' }, 'Regala'), ' ', nombre),
      n.localidad && el('p', { class: 'og__lugar' }, n.localidad)),
    el('div', { class: 'og__tarjeta' }, BONO.crearTarjeta(n)));
  document.getElementById('app').replaceChildren(lienzo);

  function ajustar() {
    BONO.ajustarTexto(nombre, { min: 38, max: 104, lineas: 3 });
    BONO.ajustarTarjetas(lienzo);
  }
  ajustar();
  // Cuando llegan las fuentes se vuelve a ajustar y se marca la página como lista para capturar.
  BONO.fuentesListas().then(() => {
    ajustar();
    document.documentElement.setAttribute('data-listo', '1');
  });
})();
