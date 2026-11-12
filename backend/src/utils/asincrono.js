'use strict';
// Express 4 no captura los errores de handlers async: este envoltorio los pasa a next().
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
