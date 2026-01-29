import { Router } from 'express';
import { db } from '../db';
import { orders, products, users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { verifyPayment, initializePayment } from '../services/paystack.service';
import { placeWireNetOrder, getWireNetBalance, isInsufficientBalanceError } from '../services/wirenet.service';

const router = Router();

// Init Order
router.post('/init', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });

    const { productId, beneficiaryPhone } = req.body;
    const user = req.user as any;

    try {
        // 1. Get Product
        const productRes = await db.select().from(products).where(eq(products.id, productId)).limit(1);
        const product = productRes[0];
        if (!product) return res.status(404).json({ message: "Product not found" });

        // import { initializePayment } from '../services/paystack.service'; // Removed bad import

        // ... (inside /init route)
        // 2. Create Pending Order
        const paymentReference = `PAY_${Date.now()}_${user.id}`;

        const newOrder = await db.insert(orders).values({
            userId: user.id,
            serviceType: product.serviceType,
            status: 'PENDING_PAYMENT',
            paymentStatus: 'PENDING', // Separate payment status
            paymentReference,
            wirenetPackageId: product.wirenetPackageId,
            beneficiaryPhone,
            amount: product.price
        }).returning();

        // 3. Initialize Paystack
        const paystackRes = await initializePayment(
            user.email,
            parseFloat(product.price),
            paymentReference,
            `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify` // Client verification page
        );

        res.json({
            order: newOrder[0],
            paymentReference,
            authorizationUrl: paystackRes.data.authorization_url,
            accessCode: paystackRes.data.access_code,
            amount: product.price
        });

    } catch (error) {
        console.error("Order Init Error", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Init Bulk Order
router.post('/bulk-init', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });

    const { orders: bulkOrders } = req.body; // Array of { productId, beneficiaryPhone, amount }
    const user = req.user as any;

    if (!Array.isArray(bulkOrders) || bulkOrders.length === 0) {
        return res.status(400).json({ message: "No orders provided" });
    }

    try {
        const paymentReference = `PAY_BULK_${Date.now()}_${user.id}`;
        let totalAmount = 0;
        const ordersToInsert = [];

        // Verify all products exist and calculate total
        for (const item of bulkOrders) {
            const productRes = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
            const product = productRes[0];
            if (!product) continue; // Skip invalid products

            totalAmount += parseFloat(product.price);
            ordersToInsert.push({
                userId: user.id,
                serviceType: product.serviceType,
                status: 'PENDING_PAYMENT',
                paymentStatus: 'PENDING',
                paymentReference,
                wirenetPackageId: product.wirenetPackageId,
                beneficiaryPhone: item.beneficiaryPhone,
                amount: product.price // Use product price from DB for security
            });
        }

        if (ordersToInsert.length === 0) {
            return res.status(400).json({ message: "No valid orders to place" });
        }

        const createdOrders = await db.insert(orders).values(ordersToInsert as any).returning();

        const paystackRes = await initializePayment(
            user.email,
            totalAmount,
            paymentReference,
            `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify`
        );

        res.json({
            orders: createdOrders,
            paymentReference,
            authorizationUrl: paystackRes.data.authorization_url,
            accessCode: paystackRes.data.access_code,
            totalAmount: totalAmount.toFixed(2),
            count: createdOrders.length
        });

    } catch (error) {
        console.error("Bulk Init Error", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Verify Order (Single or Bulk)
router.post('/verify', async (req, res) => {
    const { reference } = req.body;

    try {
        // 1. Verify Payment
        const paymentData = await verifyPayment(reference);
        if (paymentData.status !== true && paymentData.data.status !== 'success') {
            return res.status(400).json({ message: "Payment verification failed" });
        }

        // 2. Update All Orders with this Reference to PAID
        const matchingOrders = await db.select().from(orders).where(eq(orders.paymentReference, reference));

        if (matchingOrders.length === 0) return res.status(404).json({ message: "Order not found" });

        // Check if already processed (check first one)
        if (matchingOrders[0].paymentStatus === 'PAID') {
            return res.json({ message: "Orders already processed", count: matchingOrders.length });
        }

        // Update status to QUEUED (waiting for wirenet push) and payment to PAID
        await db.update(orders)
            .set({
                status: 'QUEUED',
                paymentStatus: 'PAID',
                updatedAt: new Date()
            })
            .where(eq(orders.paymentReference, reference));

        // 3. Trigger Fulfillment for EACH order (Async)
        // In a real system, you might queue this. Here we loop.
        let fulfilledCount = 0;

        // We do this asynchronously so we don't timeout the response
        (async () => {
            for (const order of matchingOrders) {
                try {
                    await placeWireNetOrder({
                        serviceType: order.serviceType,
                        packageId: order.wirenetPackageId || 'GENERIC_PKG_1', // Use stored ID, fallback if missing
                        beneficiaryPhone: order.beneficiaryPhone,
                        amount: parseFloat(order.amount as string),
                        paymentReference: order.paymentReference || 'MOCK_REF'
                    });

                    await db.update(orders).set({
                        status: 'PROCESSING',
                        supplierReference: 'MOCK_BULK_REF'
                    }).where(eq(orders.id, order.id));
                    fulfilledCount++;
                } catch (err) {
                    console.error(`Fulfillment Failed for Order ${order.id}`, err);
                    await db.update(orders).set({ status: 'FAILED' }).where(eq(orders.id, order.id));
                }
            }
        })();

        res.json({ message: "Payment successful. Orders are processing.", count: matchingOrders.length });

    } catch (error) {
        console.error("Order Verify Error", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Get User Orders
router.get('/my-orders', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
    const user = req.user as any;

    try {
        const userOrders = await db.select()
            .from(orders)
            .where(eq(orders.userId, user.id))
            .orderBy(desc(orders.createdAt));
        res.json(userOrders);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Admin: Get All Orders (with user email)
router.get('/all-orders', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
    const user = req.user as any;

    if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
    }

    try {
        // Join with users table to get email
        const allOrders = await db.select({
            id: orders.id,
            userId: orders.userId,
            userEmail: users.email,
            serviceType: orders.serviceType,
            status: orders.status,
            paymentStatus: orders.paymentStatus,
            paymentReference: orders.paymentReference,
            supplierReference: orders.supplierReference,
            wirenetPackageId: orders.wirenetPackageId,
            beneficiaryPhone: orders.beneficiaryPhone,
            amount: orders.amount,
            createdAt: orders.createdAt,
            updatedAt: orders.updatedAt
        })
            .from(orders)
            .leftJoin(users, eq(orders.userId, users.id))
            .orderBy(desc(orders.createdAt));

        res.json(allOrders);
    } catch (error) {
        console.error("Get All Orders Error", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Admin: Update Order Status
router.patch('/update-status/:orderId', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
    const user = req.user as any;

    if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
    }

    const { orderId } = req.params;
    const { status, paymentStatus } = req.body;

    const validStatuses = ['PENDING_PAYMENT', 'PAID', 'QUEUED', 'PROCESSING', 'FULFILLED', 'FAILED'];
    const validPaymentStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

    if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({ message: `Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}` });
    }

    try {
        const orderRes = await db.select().from(orders).where(eq(orders.id, parseInt(orderId))).limit(1);
        const order = orderRes[0];

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const updates: any = { updatedAt: new Date() };
        if (status) updates.status = status;
        if (paymentStatus) updates.paymentStatus = paymentStatus;

        await db.update(orders)
            .set(updates)
            .where(eq(orders.id, parseInt(orderId)));

        console.log(`Admin ${user.email} updated order ${orderId}: Status(${order.status}->${status || order.status}) Payment(${order.paymentStatus}->${paymentStatus || order.paymentStatus})`);

        res.json({ message: "Order updated", orderId, updates });
    } catch (error) {
        console.error("Update Status Error", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Admin: Retry/Repush Order to WireNet
router.post('/retry/:orderId', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
    const user = req.user as any;

    if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
    }

    const { orderId } = req.params;

    try {
        // 1. Get the order
        const orderRes = await db.select().from(orders).where(eq(orders.id, parseInt(orderId))).limit(1);
        const order = orderRes[0];

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // 2. Only allow retry for PAID or QUEUED orders (not already PROCESSING or FULFILLED)
        // Note: 'QUEUED' means paid but waiting for WireNet (or failed push but reverted to queued)
        // 'PAID' is legacy status, also allow it.
        if (order.status !== 'PAID' && order.status !== 'QUEUED') {
            return res.status(400).json({
                message: `Cannot retry order with status '${order.status}'. Only PAID or QUEUED orders can be retried.`
            });
        }

        // 3. Check WireNet balance first
        let balanceInfo: { balance: number; currency: string } | null = null;
        try {
            balanceInfo = await getWireNetBalance();
            console.log(`[Retry] WireNet Balance: ${balanceInfo.balance} ${balanceInfo.currency}`);
        } catch (balanceError) {
            console.error("[Retry] Failed to check WireNet balance:", balanceError);
            // Continue anyway - let WireNet reject it if balance is low
        }

        // 4. Get the product to check cost (by matching wirenetPackageId)
        let estimatedCost = parseFloat(order.amount);
        if (order.wirenetPackageId) {
            const productRes = await db.select().from(products)
                .where(eq(products.wirenetPackageId, order.wirenetPackageId))
                .limit(1);
            const product = productRes[0];

            if (product?.costPrice) {
                estimatedCost = parseFloat(product.costPrice);
                console.log(`[Retry] Found product cost: ${estimatedCost}`);
            } else {
                console.log(`[Retry] No product found for wirenetPackageId ${order.wirenetPackageId}, using order amount: ${estimatedCost}`);
            }
        }

        // 5. Pre-check balance if we got it (but don't block if balance check failed)
        if (balanceInfo && balanceInfo.balance < estimatedCost) {
            console.log(`[Retry] Insufficient balance: ${balanceInfo.balance} < ${estimatedCost}`);
            return res.status(400).json({
                message: "Insufficient WireNet balance",
                code: "INSUFFICIENT_BALANCE",
                details: {
                    currentBalance: balanceInfo.balance,
                    currency: balanceInfo.currency,
                    requiredAmount: estimatedCost
                }
            });
        }

        console.log(`[Retry] Balance check passed. Proceeding to push order ${orderId} to WireNet...`);

        // 6. Update to PROCESSING before attempting
        await db.update(orders)
            .set({ status: 'PROCESSING', updatedAt: new Date() })
            .where(eq(orders.id, parseInt(orderId)));

        // 7. Attempt to place WireNet order
        try {
            console.log(`[Retry] Placing WireNet order: serviceType=${order.serviceType}, packageId=${order.wirenetPackageId}, phone=${order.beneficiaryPhone}`);

            const wireNetResponse = await placeWireNetOrder({
                serviceType: order.serviceType,
                packageId: order.wirenetPackageId || '',
                beneficiaryPhone: order.beneficiaryPhone,
                amount: parseFloat(order.amount),
                paymentReference: `RETRY_${order.paymentReference || Date.now()}`
            });

            console.log(`[Retry] WireNet response:`, wireNetResponse);

            // Success - update to FULFILLED
            const supplierRef = wireNetResponse?.data?.order_id || wireNetResponse?.order_id || wireNetResponse?.reference || wireNetResponse?.id || null;

            await db.update(orders)
                .set({
                    status: 'FULFILLED',
                    supplierReference: supplierRef,
                    updatedAt: new Date()
                })
                .where(eq(orders.id, parseInt(orderId)));

            console.log(`[Retry] Admin ${user.email} successfully retried order ${orderId}, supplierRef: ${supplierRef}`);

            res.json({
                message: "Order successfully pushed to WireNet",
                orderId,
                status: 'FULFILLED',
                wireNetReference: supplierRef
            });

        } catch (wireNetError: any) {
            // Revert to PAID if WireNet fails
            await db.update(orders)
                .set({ status: 'PAID', updatedAt: new Date() })
                .where(eq(orders.id, parseInt(orderId)));

            // Check if it's a balance issue
            if (isInsufficientBalanceError(wireNetError)) {
                // Try to get current balance for the error message
                let currentBalance = null;
                try {
                    const freshBalance = await getWireNetBalance();
                    currentBalance = freshBalance.balance;
                } catch (e) { /* ignore */ }

                return res.status(400).json({
                    message: "Insufficient WireNet balance. Please top up your WireNet account.",
                    code: "INSUFFICIENT_BALANCE",
                    details: {
                        currentBalance,
                        requiredAmount: estimatedCost,
                        wireNetError: wireNetError.response?.data?.message || wireNetError.message
                    }
                });
            }

            // Other WireNet error
            console.error(`WireNet retry failed for order ${orderId}:`, wireNetError.response?.data || wireNetError.message);
            return res.status(500).json({
                message: "WireNet order failed",
                code: "WIRENET_ERROR",
                details: wireNetError.response?.data?.message || wireNetError.message
            });
        }

    } catch (error) {
        console.error("Retry Order Error", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Admin: Get WireNet Balance
router.get('/wirenet-balance', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Login required" });
    const user = req.user as any;

    if (user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
    }

    try {
        const balance = await getWireNetBalance();
        res.json(balance);
    } catch (error: any) {
        console.error("Get WireNet Balance Error:", error);
        res.status(500).json({ message: "Failed to fetch WireNet balance", error: error.message });
    }
});

export default router;
