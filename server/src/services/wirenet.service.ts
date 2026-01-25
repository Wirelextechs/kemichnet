import axios from 'axios';

const WIRENET_API_KEY = process.env.WIRENET_API_KEY || 'wirenet_live_036282f2731add57c4789dd99cb3ccbfda0dd5fcfab9c8c5';
const WIRENET_BASE_URL = 'https://wirenet.top/api/v1';

export interface WireNetOrderRequest {
    serviceType: string; // 'MTN_UP2U', etc.
    packageId: string; // The ID of the package on WireNet (string/UUID)
    beneficiaryPhone: string;
    amount: number;
    paymentReference: string; // Used for idempotency
}

const SERVICE_MAPPING: Record<string, string> = {
    'MTN_UP2U': 'datagod',
    'MTN_EXPRESS': 'fastnet',
    'AT': 'at',
    'TELECEL': 'telecel'
};

export const placeWireNetOrder = async (order: WireNetOrderRequest) => {
    const serviceId = SERVICE_MAPPING[order.serviceType];
    if (!serviceId) throw new Error(`Unknown service type: ${order.serviceType}`);

    // If packageId is missing, fail (or handle gracefully in dev)
    if (!order.packageId && process.env.NODE_ENV === 'production') {
        throw new Error("Missing WireNet Package ID");
    }

    try {
        console.log(`Placing WireNet Order: Ref=${order.paymentReference}, Service=${serviceId}, Pkg=${order.packageId}`);

        const payload = {
            service_id: serviceId,
            package_id: order.packageId || 1, // Default to 1 if missing in dev
            phone_number: order.beneficiaryPhone,
            request_id: order.paymentReference
        };

        const response = await axios.post(`${WIRENET_BASE_URL}/orders`, payload, {
            headers: {
                'Authorization': `Bearer ${WIRENET_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("WireNet Response:", response.data);
        return response.data;
    } catch (error: any) {
        console.error("WireNet Order Placement Failed", error.response?.data || error.message);
        throw error;
    }
};

export const getWireNetPackages = async () => {
    try {
        console.log("Fetching WireNet packages...");
        const response = await axios.get(`${WIRENET_BASE_URL}/packages`, {
            headers: { 'Authorization': `Bearer ${WIRENET_API_KEY}` }
        });
        console.log("WireNet Packages Response Status:", response.status);
        console.log("WireNet Packages Response Body:", JSON.stringify(response.data)?.slice(0, 200)); // Log first 200 chars

        const rawData = response.data.data || {};
        // Flatten into array but keep provider info
        const allPackages = Object.entries(rawData as Record<string, any[]>).flatMap(([provider, packages]) =>
            packages.map(p => ({ ...p, provider }))
        );

        console.log(`Found ${allPackages.length} packages.`);
        return allPackages;
    } catch (error: any) {
        console.error("WireNet Fetch Packages Failed", error.response?.data || error.message);
        return [];
    }
};

export const checkWireNetOrderStatus = async (reference: string) => {
    // API Docs says GET /orders/:id not available, only Webhooks.
    // But typically there might be one. If not, we rely on Webhooks (to be implemented).
    // For now, we return 'pending' or try a hypothetical endpoint if user confirmed (user didn't confirm GET endpoint).
    // User metadata says "GET /balance", "POST /orders", "Webhooks". No GET order status.
    // So we can't implement polling for now unless we assume standard REST patterns or use webhooks.
    return 'unknown';
}
