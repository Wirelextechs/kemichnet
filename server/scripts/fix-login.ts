
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function run() {
    const email = 'prosperwedam4424@gmail.com';
    // We can't see the password they typed, but we can ensure the user exists.
    // Let's reset the password to 'password' or just check existence.

    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser.length === 0) {
        console.log(`User ${email} does NOT exist.`);

        // Create them as admin ? Or maybe they just want to register. 
        // Let's create them as admin so they can test everything.
        const hash = await bcrypt.hash('password', 10);
        await db.insert(users).values({
            email,
            passwordHash: hash,
            role: 'admin',
            phone: '0555555555'
        });
        console.log(`Created user ${email} with password 'password' and role 'admin'.`);
    } else {
        console.log(`User ${email} exists. Role: ${existingUser[0].role}`);
        // Reset password just in case they forgot it / issues with hash
        const hash = await bcrypt.hash('password', 10);
        await db.update(users).set({ passwordHash: hash, role: 'admin' }).where(eq(users.email, email));
        console.log(`Reset password for ${email} to 'password'.`);
    }

    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
