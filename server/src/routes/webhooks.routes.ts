import { Router } from 'express';
import { db } from '../db';
import { orders } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * WireNet Webhook Handler
 * 
 * WireNet POSTs to this endpoint when order status changes to FULFILLED or FAILED.
 * Payload format (from WireNet API docs - updated):
 * {
 *   "event": "order.update",
 *   "data": {
 *     "order_id": "API-abc12345",
 *     "service": "fastnet",           // fastnet, datagod, at, telecel
 *     "status": "FULFILLED",          // PROCESSING, FULFILLED, REFUNDED
 *     "customer_phone": "054xxxxxxx",
 *     "package": "1GB MTN Data",
 *     "payment_reference": "your-request-id",  // Our paymentReference
 *     "updated_at": "2026-01-28T12:00:00.000Z"
 *   }
 * }
 */
router.post('/wirenet', async (req, res) => {
    console.log('WireNet Webhook Received:', JSON.stringify(req.body, null, 2));

    try {
        const { event, data } = req.body;

        if (event === 'system.settings_update') {
            console.log('System Settings Update Received:', data);

            // Map WireNet keys to our internal keys
            // data format: { datagodEnabled: bool, fastnetEnabled: bool, atEnabled: bool, telecelEnabled: bool }

            const updates = [];
            if (data.datagodEnabled !== undefined) updates.push({ key: 'service_MTN_UP2U_enabled', value: String(data.datagodEnabled) });
            if (data.fastnetEnabled !== undefined) updates.push({ key: 'service_MTN_EXPRESS_enabled', value: String(data.fastnetEnabled) });
            if (data.atEnabled !== undefined) updates.push({ key: 'service_AT_enabled', value: String(data.atEnabled) });
            if (data.telecelEnabled !== undefined) updates.push({ key: 'service_TELECEL_enabled', value: String(data.telecelEnabled) });

            console.log('Updating settings:', updates);

            // Upsert settings
            import('../db/schema').then(async ({ settings }) => {
                for (const update of updates) {
                    await db.insert(settings)
                        .values({ key: update.key, value: update.value, updatedAt: new Date() })
                        .onConflictDoUpdate({
                            target: settings.key,
                            set: { value: update.value, updatedAt: new Date() }
                        });
                }
            });

            return res.status(200).json({ received: true, action: 'settings_updated' });
        }

        if (!data || !data.payment_reference) {
            console.error('WireNet webhook missing data.payment_reference');
            // Don't error out if it was a system event we missed above, but we caught that.
            // If it's not system event and has no ref, THEN error.
            if (event !== 'order.update') {
                return res.status(200).json({ received: true, message: 'Ignored unknown event' });
            }
            return res.status(400).json({ message: 'Missing data.payment_reference' });
        }

        const { order_id, service, status, customer_phone, payment_reference, updated_at } = data;

        // Find order by paymentReference (we sent this as request_id when placing orders)
        const orderRes = await db.select()
            .from(orders)
            .where(eq(orders.paymentReference, payment_reference))
            .limit(1);

        const order = orderRes[0];

        if (!order) {
            console.error(`WireNet webhook: Order not found for payment_reference ${payment_reference}`);
            return res.status(404).json({ message: 'Order not found' });
        }

        // Map WireNet status to our status
        let newStatus = order.status;
        const upperStatus = status?.toUpperCase();

        if (upperStatus === 'FULFILLED' || upperStatus === 'SUCCESS' || upperStatus === 'SUCCESSFUL' || upperStatus === 'COMPLETED') {
            newStatus = 'FULFILLED';
        } else if (upperStatus === 'REFUNDED' || upperStatus === 'FAILED' || upperStatus === 'CANCELLED' || upperStatus === 'TRANSACTION_FAILED') {
            newStatus = 'FAILED';
        } else if (upperStatus === 'PROCESSING' || upperStatus === 'PENDING') {
            newStatus = 'PROCESSING';
        } else if (upperStatus === 'QUEUED') {
            newStatus = 'QUEUED';
        }

        // Update order if status changed
        if (newStatus !== order.status) {
            await db.update(orders)
                .set({
                    status: newStatus,
                    supplierReference: order_id || order.supplierReference,
                    updatedAt: new Date()
                })
                .where(eq(orders.id, order.id));

            console.log(`Order ${order.id} updated: ${order.status} -> ${newStatus} (WireNet order_id: ${order_id}, phone: ${customer_phone})`);
        } else {
            console.log(`Order ${order.id} status unchanged: ${order.status}`);
        }

        // Always return 200 to acknowledge receipt
        res.status(200).json({ received: true, order_id: order.id, new_status: newStatus });

    } catch (error) {
        console.error('WireNet webhook error:', error);
        // Still return 200 to prevent retries, but log the error
        res.status(200).json({ received: true, error: 'Processing error logged' });
    }
});

// ============ PAYSTACK WEBHOOK HANDLER ============
/**
 * Paystack Webhook
 * 
 * Handles 'charge.success' event to confirm payment and trigger fulfillment.
 * Validates signature using PAYSTACK_SECRET_KEY.
 */
import { createHmac } from 'crypto';

router.post('/paystack', async (req, res) => {
    try {
        // 1. Validate Signature
        const secret = process.env.PAYSTACK_SECRET_KEY;
        if (!secret) {
            console.error('PAYSTACK_SECRET_KEY not configured');
            return res.status(500).send('Server Error');
        }

        const signature = req.headers['x-paystack-signature'];
        const hash = createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

        if (signature !== hash) {
            console.error('Invalid Paystack signature');
            return res.status(401).send('Invalid signature');
        }

        // 2. Process Event
        const { event, data } = req.body;

        if (event === 'charge.success') {
            const { reference, status } = data;

            if (status !== 'success') {
                return res.status(200).send('Ignoring non-success status');
            }

            console.log(`Paystack Webhook: Payment successful for ${reference}`);

            // 3. Find Order
            const matchingOrders = await db.select().from(orders).where(eq(orders.paymentReference, reference));

            if (matchingOrders.length === 0) {
                console.error(`Paystack Webhook: Order not found for ref ${reference}`);
                return res.status(200).send('Order not found');
            }

            // 4. Update Payment Status (Idempotent check)
            if (matchingOrders[0].paymentStatus === 'PAID') {
                console.log(`Paystack Webhook: Order ${reference} already PAID. Skipping.`);
                return res.status(200).send('Already processed');
            }

            // --- TAMPERING CHECK ---
            const expectedTotal = matchingOrders.reduce((sum, o) => sum + parseFloat(o.amount as string), 0);
            const paidAmount = data.amount / 100; // Paystack amount is in kobo

            if (Math.abs(expectedTotal - paidAmount) > 0.05) {
                console.error(`Paystack Webhook Tampering Alert! Ref: ${reference}. Expected: ${expectedTotal}, Paid: ${paidAmount}`);

                await db.update(orders)
                    .set({
                        status: 'FAILED',
                        paymentStatus: 'FAILED',
                        updatedAt: new Date()
                    })
                    .where(eq(orders.paymentReference, reference));

                return res.status(200).send('Tampering detected'); // Return 200 to stop Paystack retries
            }
            // -----------------------

            console.log(`Paystack Webhook: Marking ${matchingOrders.length} orders as PAID and QUEUED`);

            // Update status
            await db.update(orders)
                .set({
                    paymentStatus: 'PAID',
                    status: 'QUEUED',
                    updatedAt: new Date()
                })
                .where(eq(orders.paymentReference, reference));

            // 5. Trigger Fulfillment (Async)
            // We duplicate the fulfillment logic from /verify here to be safe
            import('../services/wirenet.service').then(async ({ placeWireNetOrder }) => {
                for (const order of matchingOrders) {
                    try {
                        console.log(`Paystack Webhook: Triggering fulfillment for order ${order.id}`);
                        await placeWireNetOrder({
                            serviceType: order.serviceType,
                            packageId: order.wirenetPackageId || 'GENERIC_PKG_1',
                            beneficiaryPhone: order.beneficiaryPhone,
                            amount: parseFloat(order.amount as string),
                            paymentReference: order.paymentReference || 'WEBHOOK_REF'
                        });

                        // Update to PROCESSING
                        await db.update(orders).set({
                            status: 'PROCESSING',
                            supplierReference: 'WEBHOOK_INIT',
                            updatedAt: new Date()
                        }).where(eq(orders.id, order.id));

                    } catch (err: any) {
                        console.error(`Paystack Webhook Fulfillment Failed for Order ${order.id}`, err);
                        // Don't mark as FAILED yet, leave as QUEUED/PROCESSING for retry or reconciliation
                    }
                }
            });
        }

        res.status(200).send('Webhook received');
    } catch (error) {
        console.error('Paystack webhook error:', error);
        res.status(500).send('Server Error');
    }
});

// Health check for webhook endpoint
router.get('/paystack', (req, res) => {
    res.json({ status: 'Paystack webhook endpoint active', timestamp: new Date() });
});


// ============ WIRENET WEBHOOK HANDLER ============

// ============ RECONCILIATION ENDPOINTS ============
import { reconcileStuckOrders, getStuckOrdersCount } from '../services/reconciliation.service';

/**
 * Cron job endpoint for reconciliation
 * 
 * Vercel Cron will call this endpoint on a schedule.
 * Secured by CRON_SECRET environment variable.
 */
router.get('/cron/reconcile', async (req, res) => {
    // Verify cron secret (Vercel sends this header)
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.authorization;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.log('Cron reconciliation: unauthorized attempt');
        return res.status(401).json({ message: 'Unauthorized' });
    }

    console.log('Cron reconciliation started...');

    try {
        // Find stuck orders (>30 min), auto-fulfill after 60 min
        const result = await reconcileStuckOrders(30, 60);

        console.log('Cron reconciliation completed:', result);
        res.json({ success: true, ...result });
    } catch (error: any) {
        console.error('Cron reconciliation error:', error);
        res.status(500).json({ message: 'Reconciliation failed', error: error.message });
    }
});

/**
 * Admin endpoint to manually trigger reconciliation
 */
router.post('/admin/reconcile', async (req, res) => {
    if (!(req as any).isAuthenticated?.()) {
        return res.status(401).json({ message: 'Login required' });
    }

    const user = (req as any).user;
    if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    const { stuckMinutes = 30, autoFulfillMinutes } = req.body;

    console.log(`Admin ${user.email} triggered reconciliation`);

    try {
        const result = await reconcileStuckOrders(stuckMinutes, autoFulfillMinutes);
        res.json({ success: true, ...result });
    } catch (error: any) {
        console.error('Admin reconciliation error:', error);
        res.status(500).json({ message: 'Reconciliation failed', error: error.message });
    }
});

/**
 * Get count of stuck orders (for admin dashboard)
 */
router.get('/stuck-orders-count', async (req, res) => {
    if (!(req as any).isAuthenticated?.()) {
        return res.status(401).json({ message: 'Login required' });
    }

    const user = (req as any).user;
    if (user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const count = await getStuckOrdersCount(30);
        res.json({ stuckCount: count });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching stuck orders count' });
    }
});

export default router;
