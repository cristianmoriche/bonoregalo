/* bonoregalo.es · portada del sitio.
   El texto está en el HTML; esto solo añade las tarjetas de muestra, las estrellitas y los iconos. Depende de comun.js. */
(function () {
  'use strict';

  const { el } = BONO;

  // Iconos y estrellas: cada marcador se cambia por su dibujo.
  for (const marca of document.querySelectorAll('[data-icono]')) {
    const nombre = marca.getAttribute('data-icono');
    marca.replaceWith(nombre === 'estrella' ? BONO.svgEstrella('estrella-chica', 14) : BONO.icono(nombre));
  }

  // En la portada: tres temas a la vez, para que se vea que cada negocio lleva sus colores.
  const portada = document.querySelector('.portada');
  portada.prepend(BONO.crearChispas());
  const muestras = [
    { nombre: 'Titán Fitness Club', tema: 'bosque', localidad: 'Jerez de la Frontera', validez: '31 de marzo de 2027' },
    { nombre: 'Estética Aurora', tema: 'rosa', localidad: 'Almería', validez: '31 de marzo de 2027' },
    { nombre: 'Barber Club', tema: 'noche', localidad: 'Cádiz', validez: '31 de marzo de 2027' },
  ];
  document.getElementById('tarjetas-portada').replaceChildren(
    ...muestras.map((m) => BONO.crearTarjeta(m, { clase: 'regalo--recta' })));

  // En cada ejemplo, su tarjeta.
  document.getElementById('tarjeta-ejemplo-1').replaceChildren(
    BONO.crearTarjeta({ nombre: 'Estética Aurora', tema: 'rosa', localidad: 'Almería', validez: '31 de marzo de 2027' }, { clase: 'regalo--recta' }));
  document.getElementById('tarjeta-ejemplo-2').replaceChildren(
    BONO.crearTarjeta({ nombre: 'Gimnasio Titán Fitness Club', tema: 'bosque', localidad: 'Jerez de la Frontera', validez: '31 de marzo de 2027' }, { clase: 'regalo--recta' }));

  // El cierre lleva sus estrellitas.
  document.querySelector('.cierre').prepend(BONO.crearChispas());

  function ajustar() { BONO.ajustarTarjetas(document); }
  ajustar();
  BONO.fuentesListas().then(ajustar);
  BONO.alResize(ajustar);
})();
