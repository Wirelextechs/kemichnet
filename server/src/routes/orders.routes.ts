import { Router } from 'express';
import { db } from '../db';
import { orders, products, users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { verifyPayment, initializePayment } from '../services/paystack.service';
import { placeWireNetOrder } from '../services/wirenet.service';

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
            status: 'PENDING_PAYMENT', // Updated schema
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
        if (matchingOrders[0].status !== 'PENDING_PAYMENT') {
            return res.json({ message: "Orders already processed", count: matchingOrders.length });
        }

        // Update status to PAID
        await db.update(orders)
            .set({ status: 'PAID' })
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
    const { status } = req.body;

    const validStatuses = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'FULFILLED', 'FAILED'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    try {
        const orderRes = await db.select().from(orders).where(eq(orders.id, parseInt(orderId))).limit(1);
        const order = orderRes[0];

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const oldStatus = order.status;

        await db.update(orders)
            .set({ status, updatedAt: new Date() })
            .where(eq(orders.id, parseInt(orderId)));

        console.log(`Admin ${user.email} updated order ${orderId}: ${oldStatus} -> ${status}`);

        res.json({ message: "Order status updated", orderId, oldStatus, newStatus: status });
    } catch (error) {
        console.error("Update Status Error", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
