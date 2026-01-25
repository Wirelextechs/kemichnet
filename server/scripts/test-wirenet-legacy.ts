
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const WIRENET_API_KEY = process.env.WIRENET_API_KEY || 'wirenet_live_036282f2731add57c4789dd99cb3ccbfda0dd5fcfab9c8c5';
const WIRENET_BASE_URL = 'https://wirenet.top/api/v1';

async function run() {
    console.log(`\nTest Legacy IDs`);

    // 2GB Fastnet
    // UUID: 36f7a72d-4c0f-4188-9b28-0b65016a4f40
    // Possible Legacy ID: 36

    try {
        console.log("Trying ID 36 (Integer)...");
        const res = await axios.post(`${WIRENET_BASE_URL}/orders`, {
            service_id: 'fastnet',
            package_id: 36,
            phone_number: '0555555555',
            request_id: `TRY_LEGACY_36_${Date.now()}`
        }, { headers: { Authorization: `Bearer ${WIRENET_API_KEY}` } });
        console.log("Success with 36:", res.data);
    } catch (e: any) {
        console.log("Failed 36:", e.response?.data?.message);
    }
}

run();
