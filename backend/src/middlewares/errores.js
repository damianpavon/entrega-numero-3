'use strict';

function noEncontrado(req, res) {
  res.status(404).json({ error: 'Recurso no encontrado.' });
}

// eslint-disable-next-line no-unused-vars
function manejador(err, req, res, next) {
  // Errores del parser de JSON: cuerpo demasiado grande o JSON mal formado.
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'La solicitud es demasiado grande.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo de la solicitud no es JSON válido.' });
  console.error('[error]', err);
  res.status(500).json({ error: 'Ocurrió un error inesperado. Inténtalo de nuevo.' });
}

module.exports = { noEncontrado, manejador };
