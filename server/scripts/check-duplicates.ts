
import { db } from '../src/db';
import { products } from '../src/db/schema';
import { eq, desc } from 'drizzle-orm';

async function check() {
    const all = await db.select().from(products).orderBy(desc(products.createdAt));
    console.log(`Total Products: ${all.length}`);

    // Group by Service + Data Amount
    const groups: Record<string, typeof all> = {};

    for (const p of all) {
        const key = `${p.serviceType}-${p.dataAmount}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
    }

    let duplicates = 0;
    for (const [key, group] of Object.entries(groups)) {
        if (group.length > 1) {
            console.log(`\nDuplicate Group: ${key}`);
            group.forEach(p => {
                console.log(` - ID: ${p.id} | Name: "${p.name}" | Price: ${p.price} | WireNetID: ${p.wirenetPackageId}`);
            });
            duplicates++;
        }
    }

    console.log(`\nFound ${duplicates} duplicate groups.`);
    process.exit(0);
}

check();
