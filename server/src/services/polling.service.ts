import { db } from '../db';
import { orders } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { checkWireNetOrderStatus } from './wirenet.service';

export const pollOrders = async () => {
    // Find all orders that are PROCESSING
    const processingOrders = await db.select().from(orders).where(eq(orders.status, 'PROCESSING'));

    console.log(`Polling: Checking ${processingOrders.length} orders...`);

    for (const order of processingOrders) {
        if (!order.supplierReference) continue;

        const supplierStatus = await checkWireNetOrderStatus(order.supplierReference);

        if (supplierStatus === 'success' || supplierStatus === 'successful') { // Adjust based on WireNet API
            await db.update(orders).set({ status: 'FULFILLED', updatedAt: new Date() }).where(eq(orders.id, order.id));
            console.log(`Order ${order.id} FULFILLED`);
        } else if (supplierStatus === 'failed' || supplierStatus === 'cancelled') {
            await db.update(orders).set({ status: 'FAILED', updatedAt: new Date() }).where(eq(orders.id, order.id));
            console.log(`Order ${order.id} FAILED`);
            // TODO: Trigger Refund Logic
        }
    }
};

export const startPolling = (intervalMs: number = 20000) => {
    setInterval(pollOrders, intervalMs);
    console.log(`Polling started with interval ${intervalMs}ms`);
};
