import { Router } from 'express';
import { db } from '../db';
import { orders } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * WireNet Webhook Handler
 * 
 * WireNet will POST to this endpoint when order status changes.
 * Expected payload (based on typical webhook patterns):
 * {
 *   "request_id": "PAY_1234567890_1",  // Our paymentReference
 *   "status": "successful" | "failed" | "pending" | "refunded",
 *   "transaction_id": "wirenet_txn_123",
 *   "message": "Transaction completed successfully"
 * }
 */
router.post('/wirenet', async (req, res) => {
    console.log('WireNet Webhook Received:', JSON.stringify(req.body, null, 2));

    try {
        const { request_id, status, transaction_id, message } = req.body;

        if (!request_id) {
            console.error('WireNet webhook missing request_id');
            return res.status(400).json({ message: 'Missing request_id' });
        }

        // Find order by paymentReference (we use this as request_id when placing orders)
        const orderRes = await db.select()
            .from(orders)
            .where(eq(orders.paymentReference, request_id))
            .limit(1);

        const order = orderRes[0];

        if (!order) {
            console.error(`WireNet webhook: Order not found for request_id ${request_id}`);
            return res.status(404).json({ message: 'Order not found' });
        }

        // Map WireNet status to our status
        let newStatus = order.status;
        const lowerStatus = status?.toLowerCase();

        if (lowerStatus === 'successful' || lowerStatus === 'success' || lowerStatus === 'completed') {
            newStatus = 'FULFILLED';
        } else if (lowerStatus === 'failed' || lowerStatus === 'cancelled' || lowerStatus === 'refunded') {
            newStatus = 'FAILED';
        } else if (lowerStatus === 'pending' || lowerStatus === 'processing') {
            newStatus = 'PROCESSING';
        }

        // Update order if status changed
        if (newStatus !== order.status) {
            await db.update(orders)
                .set({
                    status: newStatus,
                    supplierReference: transaction_id || order.supplierReference,
                    updatedAt: new Date()
                })
                .where(eq(orders.id, order.id));

            console.log(`Order ${order.id} updated: ${order.status} -> ${newStatus}`);
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

// Health check for webhook endpoint
router.get('/wirenet', (req, res) => {
    res.json({ status: 'WireNet webhook endpoint active', timestamp: new Date() });
});

export default router;
