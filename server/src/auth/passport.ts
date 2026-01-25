import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        console.log(`[Auth] Attempting login for: ${email}`);
        const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const user = result[0];

        if (!user) {
            console.log(`[Auth] User not found: ${email}`);
            return done(null, false, { message: 'Incorrect email.' });
        }

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            console.log(`[Auth] Password mismatch for: ${email}`);
            return done(null, false, { message: 'Incorrect password.' });
        }

        console.log(`[Auth] Login successful for: ${email}`);
        return done(null, user);
    } catch (err) {
        console.error(`[Auth] Error:`, err);
        return done(err);
    }
}));

passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
    try {
        const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
        const user = result[0];
        done(null, user);
    } catch (err) {
        done(err);
    }
});
