import { Router } from 'express';
import { db } from '../db';
import { orders, products, users } from '../db/schema';
import { eq, sql, and, gte, lte } from 'drizzle-orm';

const router = Router();

// Middleware to ensure Admin
const ensureAdmin = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ message: "Admin access required" });
};

// Helper: Build Date Filter
const getDateFilter = (period: string, date?: string) => {
    const now = new Date();
    let startDate = new Date(0); // Epoch
    let endDate = new Date();

    if (period === 'yearly') {
        startDate = new Date(now.getFullYear(), 0, 1);
    } else if (period === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'weekly') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
    } else if (period === 'daily') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (period === 'hourly') {
        startDate = new Date(now.getTime() - 60 * 60 * 1000); // Last hour? Or grouped by hour? 
        // User asked for "hourly" filter, likely means "Today, grouped by hour" OR "Last 24h"
        // Let's assume "Today" but grouped by hour.
        startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (period === 'specific' && date) {
        startDate = new Date(date);
        endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
};

// GET /stats - Overall Stats
router.get('/stats', ensureAdmin, async (req, res) => {
    const { period, date } = req.query as any;
    const { startDate, endDate } = getDateFilter(period || 'all_time', date);

    try {
        const dateCondition = and(
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, endDate)
        );

        // Total Revenue
        const revenueRes = await db.select({
            total: sql<string>`sum(${orders.amount})`
        }).from(orders).where(and(
            dateCondition,
            sql`${orders.status} IN ('PAID', 'FULFILLED')`
        ));

        // Order Counts
        const countRes = await db.select({
            count: sql<number>`count(*)`
        }).from(orders).where(dateCondition);

        // Failed Counts
        const failedRes = await db.select({
            count: sql<number>`count(*)`
        }).from(orders).where(and(dateCondition, eq(orders.status, 'FAILED')));

        res.json({
            revenue: parseFloat(revenueRes[0]?.total || '0'),
            totalOrders: parseInt(countRes[0]?.count as any || '0'),
            failedOrders: parseInt(failedRes[0]?.count as any || '0'),
            period: period || 'all_time'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching stats" });
    }
});

// GET /sales-chart - Sales over time
router.get('/sales-chart', ensureAdmin, async (req, res) => {
    const { period, date } = req.query as any;
    const { startDate, endDate } = getDateFilter(period || 'all_time', date);

    try {
        let interval = 'day'; // Default
        if (period === 'daily' || period === 'hourly' || period === 'specific') interval = 'hour';
        if (period === 'yearly') interval = 'month';

        // PostgreSQL date_trunc
        const salesData = await db.execute(sql`
            SELECT 
                date_trunc(${interval}, created_at) as time_point,
                SUM(amount) as revenue,
                COUNT(*) as count
            FROM orders
            WHERE created_at >= ${startDate.toISOString()} 
              AND created_at <= ${endDate.toISOString()}
              AND status IN ('PAID', 'FULFILLED')
            GROUP BY time_point
            ORDER BY time_point ASC
        `);

        res.json(salesData.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching chart data" });
    }
});

// GET /top-products
router.get('/top-products', ensureAdmin, async (req, res) => {
    const { period, date } = req.query as any;
    const { startDate, endDate } = getDateFilter(period || 'all_time', date);

    try {
        // This requires joining orders -> product (by inferred name/service type)
        // Our schema stores 'serviceType' and 'amount' in orders, but not productId directly.
        // We can group by serviceType and amount (proxy for package).

        const topProducts = await db.execute(sql`
             SELECT 
                 service_type, 
                 amount,
                 COUNT(*) as sales_count,
                 SUM(amount) as total_revenue
             FROM orders
             WHERE created_at >= ${startDate.toISOString()} 
               AND created_at <= ${endDate.toISOString()}
               AND status IN ('PAID', 'FULFILLED')
             GROUP BY service_type, amount
             ORDER BY sales_count DESC
             LIMIT 5
         `);

        res.json(topProducts.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching top products" });
    }
});

export default router;
