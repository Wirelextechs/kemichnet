import { Router } from 'express';
import { db } from '../db';
import { settings } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Known settings keys
const SETTINGS_KEYS = ['whatsapp_link', 'support_email', 'site_name'];

/**
 * GET /api/settings - Get all public settings (for customers)
 */
router.get('/', async (req, res) => {
    try {
        const allSettings = await db.select().from(settings);

        // Convert to object format
        const settingsObj: Record<string, string | null> = {};
        for (const setting of allSettings) {
            settingsObj[setting.key] = setting.value;
        }

        res.json(settingsObj);
    } catch (error) {
        console.error('Get Settings Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/settings/:key - Get a specific setting
 */
router.get('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

        if (result.length === 0) {
            return res.json({ key, value: null });
        }

        res.json(result[0]);
    } catch (error) {
        console.error('Get Setting Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * PUT /api/settings/:key - Update a setting (Admin only)
 */
router.put('/:key', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Login required' });
    }

    const user = req.user as any;
    if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    const { key } = req.params;
    const { value } = req.body;

    try {
        // Upsert: Insert or update
        const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

        if (existing.length > 0) {
            await db.update(settings)
                .set({ value, updatedAt: new Date() })
                .where(eq(settings.key, key));
        } else {
            await db.insert(settings).values({ key, value, updatedAt: new Date() });
        }

        console.log(`Admin ${user.email} updated setting: ${key}`);
        res.json({ message: 'Setting updated', key, value });
    } catch (error) {
        console.error('Update Setting Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/settings/bulk - Update multiple settings (Admin only)
 */
router.post('/bulk', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Login required' });
    }

    const user = req.user as any;
    if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    const updates = req.body; // { key1: value1, key2: value2, ... }

    try {
        for (const [key, value] of Object.entries(updates)) {
            const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

            if (existing.length > 0) {
                await db.update(settings)
                    .set({ value: value as string, updatedAt: new Date() })
                    .where(eq(settings.key, key));
            } else {
                await db.insert(settings).values({ key, value: value as string, updatedAt: new Date() });
            }
        }

        console.log(`Admin ${user.email} updated settings:`, Object.keys(updates));
        res.json({ message: 'Settings updated', keys: Object.keys(updates) });
    } catch (error) {
        console.error('Bulk Update Settings Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
