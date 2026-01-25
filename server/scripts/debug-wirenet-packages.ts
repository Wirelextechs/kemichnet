
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const WIRENET_API_KEY = process.env.WIRENET_API_KEY || 'wirenet_live_036282f2731add57c4789dd99cb3ccbfda0dd5fcfab9c8c5';
const WIRENET_BASE_URL = 'https://wirenet.top/api/v1';

async function run() {
    console.log("Fetching FULL Package Data to inspect...");
    try {
        const response = await axios.get(`${WIRENET_BASE_URL}/packages`, {
            headers: { 'Authorization': `Bearer ${WIRENET_API_KEY}` }
        });

        console.log("Raw Response StructureKeys:", Object.keys(response.data.data));

        const fastnet = response.data.data['fastnet'];
        if (fastnet && fastnet.length > 0) {
            console.log("Sample Fastnet Package:", JSON.stringify(fastnet[0], null, 2));
        } else {
            console.log("No fastnet packages found");
        }

    } catch (e: any) {
        console.log("Fetch Failed:", e.message);
    }
}

run();
