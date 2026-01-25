
import axios from 'axios';
import dotenv from 'dotenv';
import qs from 'qs';
dotenv.config();

const WIRENET_API_KEY = process.env.WIRENET_API_KEY || 'wirenet_live_036282f2731add57c4789dd99cb3ccbfda0dd5fcfab9c8c5';
const WIRENET_BASE_URL = 'https://wirenet.top/api/v1';

async function run() {
    const validId = "94697331-1870-4576-924b-a54e3557c4ac";

    console.log(`\nTest 5: Adding amount to JSON payload`);
    try {
        const payload = {
            service_id: 'fastnet',
            package_id: validId,
            phone_number: '0555555555',
            amount: 5.10, // Matching the price string "5.10"
            request_id: `TRY_AMT_${Date.now()}`
        };
        const res = await axios.post(`${WIRENET_BASE_URL}/orders`, payload, {
            headers: { Authorization: `Bearer ${WIRENET_API_KEY}` }
        });
        console.log("Success:", res.data);
    } catch (e: any) {
        console.log("Failed Test 5:", e.response?.data?.message || e.message);
    }

    console.log(`\nTest 6: Using x-www-form-urlencoded`);
    try {
        const payload = {
            service_id: 'fastnet',
            package_id: validId,
            phone_number: '0555555555',
            request_id: `TRY_FORM_${Date.now()}`
        };
        const res = await axios.post(`${WIRENET_BASE_URL}/orders`, qs.stringify(payload), {
            headers: {
                Authorization: `Bearer ${WIRENET_API_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        console.log("Success:", res.data);
    } catch (e: any) {
        console.log("Failed Test 6:", e.response?.data?.message || e.message);
    }
}

run();
