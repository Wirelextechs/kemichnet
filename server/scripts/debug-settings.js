
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    await client.connect();
    try {
        const res = await client.query('SELECT * FROM settings');
        console.log('Settings:', res.rows);
    } catch (e) { console.error(e); }
    await client.end();
}
check();
