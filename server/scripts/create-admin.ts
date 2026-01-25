
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function run() {
    const email = 'admin@kemichnet.com';
    const password = 'admin';
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser.length > 0) {
        console.log(`User ${email} exists. Updating to admin role.`);
        await db.update(users).set({ role: 'admin', passwordHash: hashedPassword }).where(eq(users.email, email));
    } else {
        console.log(`Creating new admin user ${email}.`);
        await db.insert(users).values({
            email,
            passwordHash: hashedPassword,
            role: 'admin',
            phone: '0555555555'
        });
    }

    console.log("Admin setup complete. Login: admin@kemichnet.com / admin");
    process.exit(0);
}

run().catch(err => console.error(err));
