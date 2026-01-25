import { Router } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Middleware to ensure Admin
const ensureAdmin = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ message: "Admin access required" });
};

// Get All Users
router.get('/', ensureAdmin, async (req, res) => {
    try {
        const allUsers = await db.select({
            id: users.id,
            email: users.email,
            role: users.role,
            createdAt: users.createdAt
        }).from(users);
        res.json(allUsers);
    } catch (error) {
        res.status(500).json({ message: "Error fetching users" });
    }
});

// Update User (e.g. Promote)
router.put('/:id', ensureAdmin, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body; // 'admin' or 'customer'

    try {
        const updatedUser = await db.update(users)
            .set({ role })
            .where(eq(users.id, parseInt(id)))
            .returning({ id: users.id, email: users.email, role: users.role });
        res.json(updatedUser[0]);
    } catch (error) {
        res.status(500).json({ message: "Error updating user" });
    }
});

// Delete User
router.delete('/:id', ensureAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        await db.delete(users).where(eq(users.id, parseInt(id)));
        res.json({ message: "User deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting user" });
    }
});

export default router;
