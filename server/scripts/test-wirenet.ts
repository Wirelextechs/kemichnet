
import { placeWireNetOrder, getWireNetPackages } from '../src/services/wirenet.service';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    console.log("1. Fetching Packages...");
    const packages = await getWireNetPackages();
    if (packages.length === 0) {
        console.error("No packages found. Check auth/connection.");
        return;
    }

    const firstPkg = packages[0];
    console.log(`Using Package: ${firstPkg.name} (ID: ${firstPkg.id}) Provider: ${firstPkg.provider}`);

    // Map provider to service Type logic from AdminDashboard
    let svc = 'MTN_UP2U';
    const p = firstPkg.provider.toLowerCase();
    if (p === 'fastnet') svc = 'MTN_EXPRESS';
    else if (p === 'at') svc = 'AT';
    else if (p === 'telecel') svc = 'TELECEL';

    console.log(`Mapped Service Type: ${svc}`);

    console.log("2. Placing Order...");
    try {
        const res = await placeWireNetOrder({
            serviceType: svc,
            packageId: firstPkg.id,
            beneficiaryPhone: '0555555555',
            amount: parseFloat(firstPkg.price), // Not strictly used by payload but required by interface
            paymentReference: `TEST_${Date.now()}`
        });
        console.log("Order Success:", res);
    } catch (e: any) {
        console.error("Order Failed:", e.message);
        if (e.response) {
            console.error("Response Data:", e.response.data);
            console.error("Response Status:", e.response.status);
        }
    }
}

run();
