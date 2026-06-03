const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    logger.error('Erro inesperado no pool do banco de dados', { error: err.message });
});

pool.on('connect', () => {
    logger.debug('Nova conexão estabelecida com o PostgreSQL');
});

async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Query executada', { text, duration, rows: result.rowCount });
        return result;
    } catch (err) {
        logger.error('Erro na query', { text, error: err.message });
        throw err;
    }
}

async function getClient() {
    const client = await pool.connect();
    const originalQuery = client.query.bind(client);
    const release = client.release.bind(client);

    client.query = (...args) => {
        client.lastQuery = args;
        return originalQuery(...args);
    };

    client.release = () => {
        client.query = originalQuery;
        return release();
    };

    return client;
}

async function transaction(callback) {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { query, getClient, transaction, pool };
