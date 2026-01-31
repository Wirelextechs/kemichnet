
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function disable() {
    await client.connect();
    try {
        console.log('Disabling service_MTN_EXPRESS_enabled (fastnet)...');
        await client.query("UPDATE settings SET value = 'false', updated_at = NOW() WHERE key = 'service_MTN_EXPRESS_enabled'");

        const res = await client.query("SELECT * FROM settings WHERE key = 'service_MTN_EXPRESS_enabled'");
        console.log('New Value:', res.rows[0]);
    } catch (e) { console.error(e); }
    await client.end();
}
disable();
