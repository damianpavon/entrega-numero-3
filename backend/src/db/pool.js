'use strict';
const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool(config.db);
pool.on('error', (err) => console.error('[db] error inesperado en el pool:', err.message));

module.exports = pool;
