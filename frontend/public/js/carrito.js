/* Carrito de la carta digital. Reemplaza a controladorajax.js (PHP).
   Cada petición lleva el token CSRF en la cabecera X-CSRF-Token. */
$(function () {
  'use strict';
  var csrf = $('meta[name="csrf-token"]').attr('content');
  var base = $('body').data('carta-url'); // ej: /carta/1

  function enviar(ruta, datos) {
    return $.ajax({
      type: 'POST',
      url: base + ruta,
      data: JSON.stringify(datos || {}),
      contentType: 'application/json',
      dataType: 'json',
      headers: { 'X-CSRF-Token': csrf }
    });
  }

  $(document).on('click', '.js-agregar', function (e) {
    e.preventDefault();
    enviar('/carrito/agregar', { itemId: String($(this).data('id')) })
      .done(function (r) {
        $('#contador-carrito').text(r.cantidad);
        $('#modal-mensaje').text('El producto seleccionado ha sido agregado.');
        $('#myModal').modal('show');
      })
      .fail(function (x) {
        var m = (x.responseJSON && x.responseJSON.error) || 'No se pudo agregar el producto.';
        $('#modal-mensaje').text(m);
        $('#myModal').modal('show');
      });
  });

  $(document).on('click', '.elim', function (e) {
    e.preventDefault();
    enviar('/carrito/eliminar', { uid: String($(this).data('uid')) }).always(function () { location.reload(); });
  });

  $(document).on('click', '.limpiar', function (e) {
    e.preventDefault();
    enviar('/carrito/vaciar').always(function () { location.reload(); });
  });
});
