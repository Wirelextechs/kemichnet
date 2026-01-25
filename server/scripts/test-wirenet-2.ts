
import { placeWireNetOrder, getWireNetPackages } from '../src/services/wirenet.service';
import dotenv from 'dotenv';
dotenv.config();

// MOCKING placeWireNetOrder locally to remove dependency on the service export if I want to tweak payload quickly
import axios from 'axios';
const WIRENET_API_KEY = process.env.WIRENET_API_KEY || 'wirenet_live_036282f2731add57c4789dd99cb3ccbfda0dd5fcfab9c8c5';
const WIRENET_BASE_URL = 'https://wirenet.top/api/v1';

async function run() {
    console.log("Fetching Packages...");
    // We already know IDs are UUIDs.
    // Let's try sending the package_id as a string, but verify if `service_type` needs to be different?
    // "service_id" : "fastnet"

    // Maybe try "MTN_EXPRESS" itself? No, docs say 'datagod', 'fastnet'.

    // What if I try without 'service_id'? 

    const validId = "94697331-1870-4576-924b-a54e3557c4ac"; // 1GB Fastnet from previous run

    console.log(`Test 1: Normal Payload with ${validId}`);
    try {
        const payload = {
            service_id: 'fastnet',
            package_id: validId,
            phone_number: '0555555555',
            request_id: `TRY_${Date.now()}`
        };
        console.log("Payload:", payload);
        const res = await axios.post(`${WIRENET_BASE_URL}/orders`, payload, {
            headers: { Authorization: `Bearer ${WIRENET_API_KEY}` }
        });
        console.log("Success:", res.data);
    } catch (e: any) {
        console.log("Failed Test 1:", e.response?.data || e.message);
    }
}

run();
