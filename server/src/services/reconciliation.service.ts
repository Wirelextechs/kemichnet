import { db } from '../db';
import { orders } from '../db/schema';
import { eq, and, sql, lt, inArray } from 'drizzle-orm';

/**
 * Reconciliation Service
 * 
 * Finds orders that have been stuck in PROCESSING for too long
 * and attempts to reconcile them.
 * 
 * Since WireNet doesn't have a status check endpoint, we can:
 * 1. Flag them for admin review
 * 2. Auto-mark as FULFILLED after X time (if WireNet is reliable)
 * 3. Keep trying the webhook
 */

export interface ReconciliationResult {
    processed: number;
    flagged: number;
    autoFulfilled: number;
    errors: string[];
}

/**
 * Find and process stuck orders
 * 
 * @param stuckMinutes - Orders older than this in PROCESSING are considered "stuck"
 * @param autoFulfillMinutes - Auto-fulfill orders older than this (optional, risky)
 */
export const reconcileStuckOrders = async (
    stuckMinutes: number = 30,
    autoFulfillMinutes?: number
): Promise<ReconciliationResult> => {
    const result: ReconciliationResult = {
        processed: 0,
        flagged: 0,
        autoFulfilled: 0,
        errors: []
    };

    try {
        const stuckCutoff = new Date(Date.now() - stuckMinutes * 60 * 1000);

        // Find orders stuck in PROCESSING or QUEUED
        const stuckOrders = await db.select()
            .from(orders)
            .where(and(
                inArray(orders.status, ['PROCESSING', 'QUEUED']),
                lt(orders.updatedAt, stuckCutoff)
            ));

        console.log(`Reconciliation: Found ${stuckOrders.length} stuck orders (>= ${stuckMinutes} min old)`);
        result.processed = stuckOrders.length;

        for (const order of stuckOrders) {
            try {
                const orderAge = Date.now() - new Date(order.updatedAt || order.createdAt).getTime();
                const ageMinutes = Math.round(orderAge / 60000);

                // If autoFulfill is enabled and order is old enough, auto-fulfill
                if (autoFulfillMinutes && ageMinutes >= autoFulfillMinutes) {
                    await db.update(orders)
                        .set({
                            status: 'FULFILLED',
                            updatedAt: new Date(),
                            supplierReference: `AUTO_FULFILLED_${Date.now()}`
                        })
                        .where(eq(orders.id, order.id));

                    console.log(`Order ${order.id} auto-fulfilled after ${ageMinutes} min`);
                    result.autoFulfilled++;
                } else {
                    // Just log/flag for admin review
                    console.log(`Order ${order.id} stuck for ${ageMinutes} min - flagged for review`);
                    result.flagged++;
                }
            } catch (err: any) {
                result.errors.push(`Order ${order.id}: ${err.message}`);
            }
        }

        return result;
    } catch (error: any) {
        console.error('Reconciliation error:', error);
        result.errors.push(error.message);
        return result;
    }
};

/**
 * Get count of stuck orders for dashboard display
 */
export const getStuckOrdersCount = async (stuckMinutes: number = 30): Promise<number> => {
    const stuckCutoff = new Date(Date.now() - stuckMinutes * 60 * 1000);

    const result = await db.select({
        count: sql<number>`count(*)`
    }).from(orders).where(and(
        inArray(orders.status, ['PROCESSING', 'QUEUED']),
        lt(orders.updatedAt, stuckCutoff)
    ));

    return parseInt(result[0]?.count as any || '0');
};
