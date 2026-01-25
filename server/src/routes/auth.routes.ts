import { Router } from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import '../auth/passport'; // Initialize passport strategy

const router = Router();

router.post('/register', async (req, res) => {
    const { email, password, phone } = req.body;
    try {
        const existing = await db.select().from(users).where(eq(users.email, email));
        if (existing.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await db.insert(users).values({
            email,
            passwordHash,
            phone,
            role: 'customer' // Default role
        }).returning();

        req.login(newUser[0], (err) => {
            if (err) return res.status(500).json({ message: 'Login failed after registration' });
            return res.json({ user: newUser[0] });
        });
    } catch (error) {
        console.error("Register Error", error);
        res.status(500).json({ message: "Server error" });
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) {
            console.error("Passport Auth Error:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
        if (!user) {
            console.log("Login Failed:", info?.message);
            return res.status(401).json({ message: info?.message || 'Login failed' });
        }
        req.logIn(user, (err) => {
            if (err) {
                console.error("Session Login Error:", err);
                return res.status(500).json({ message: "Session Error" });
            }
            console.log("Login Successful, Session Created for:", user.email);
            return res.json({ user });
        });
    })(req, res, next);
});

router.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ message: "Logout error" });
        res.json({ message: "Logged out" });
    });
});

router.get('/me', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ user: req.user });
    } else {
        res.status(401).json({ message: "Not authenticated" });
    }
});

export default router;
