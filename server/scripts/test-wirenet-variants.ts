
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const WIRENET_API_KEY = process.env.WIRENET_API_KEY || 'wirenet_live_036282f2731add57c4789dd99cb3ccbfda0dd5fcfab9c8c5';
const WIRENET_BASE_URL = 'https://wirenet.top/api/v1';

async function run() {
    const validId = "94697331-1870-4576-924b-a54e3557c4ac";

    // Attempt 2: Use Name as ID?
    console.log(`\nTest 2: Using Name '1GB' as package_id`);
    try {
        const payload = {
            service_id: 'fastnet',
            package_id: '1GB',
            phone_number: '0555555555',
            request_id: `TRY_NAME_${Date.now()}`
        };
        const res = await axios.post(`${WIRENET_BASE_URL}/orders`, payload, {
            headers: { Authorization: `Bearer ${WIRENET_API_KEY}` }
        });
        console.log("Success:", res.data);
    } catch (e: any) {
        console.log("Failed Test 2:", e.response?.data?.message || e.message);
    }

    // Attempt 3: Use integer index? (Risky guess)
    console.log(`\nTest 3: Using Integer 1 as package_id`);
    try {
        const payload = {
            service_id: 'fastnet',
            package_id: 1,
            phone_number: '0555555555',
            request_id: `TRY_INT_${Date.now()}`
        };
        const res = await axios.post(`${WIRENET_BASE_URL}/orders`, payload, {
            headers: { Authorization: `Bearer ${WIRENET_API_KEY}` }
        });
        console.log("Success:", res.data);
    } catch (e: any) {
        console.log("Failed Test 3:", e.response?.data?.message || e.message);
    }

    // Attempt 4: Use 'MTN_EXPRESS' as service_id
    console.log(`\nTest 4: Using 'MTN_EXPRESS' as service_id`);
    try {
        const payload = {
            service_id: 'MTN_EXPRESS',
            package_id: validId,
            phone_number: '0555555555',
            request_id: `TRY_SVC_${Date.now()}`
        };
        const res = await axios.post(`${WIRENET_BASE_URL}/orders`, payload, {
            headers: { Authorization: `Bearer ${WIRENET_API_KEY}` }
        });
        console.log("Success:", res.data);
    } catch (e: any) {
        console.log("Failed Test 4:", e.response?.data?.message || e.message);
    }
}

run();
