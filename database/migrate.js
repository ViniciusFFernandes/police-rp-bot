require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

        const dir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

        for (const file of files) {
            const { rows } = await client.query(
                'SELECT id FROM migrations WHERE filename = $1', [file]
            );
            if (rows.length > 0) {
                console.log(`[SKIP] ${file}`);
                continue;
            }

            console.log(`[RUN]  ${file}`);
            const sql = fs.readFileSync(path.join(dir, file), 'utf8');
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
            await client.query('COMMIT');
            console.log(`[OK]   ${file}`);
        }
        console.log('\nMigrações concluídas.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro na migração:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
