
import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';

const WIRENET_API_KEY = process.env.WIRENET_API_KEY;
const WIRENET_BASE_URL = 'https://wirenet.top/api/v1';

async function test() {
    console.log("Checking Available Providers...");
    try {
        const response = await axios.get(`${WIRENET_BASE_URL}/packages`, {
            headers: { 'Authorization': `Bearer ${WIRENET_API_KEY}` }
        });

        const rawData = response.data.data || {};
        const providers = Object.keys(rawData);
        console.log("Providers found in API response:", providers);

        providers.forEach(p => {
            const count = Array.isArray(rawData[p]) ? rawData[p].length : 0;
            console.log(`- ${p}: ${count} packages`);
        });

    } catch (err: any) {
        console.error("Error:", err.message);
    }
}

test();
