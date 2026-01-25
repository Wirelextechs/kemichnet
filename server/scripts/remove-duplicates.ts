
import { db } from '../src/db';
import { products } from '../src/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function run() {
    console.log("Starting De-duplication...");

    const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
    console.log(`Loaded ${allProducts.length} products.`);

    const groups: Record<string, typeof allProducts> = {};

    // Group by Service + Data Amount to find conceptually identical products
    for (const p of allProducts) {
        // Normalize keys slightly to handle varied spacing if needed, but strict for now
        const key = `${p.serviceType}-${p.dataAmount}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
    }

    let groupsProcessed = 0;
    let productsDeleted = 0;

    for (const [key, group] of Object.entries(groups)) {
        if (group.length <= 1) continue;

        console.log(`\nProcessing Duplicate Group: ${key} (${group.length} items)`);
        groupsProcessed++;

        // Strategy:
        // 1. Prefer item with valid UUID
        // 2. If multiple valid UUIDs, prefer most recently created (already sorted by desc createdAt)
        // 3. If no valid UUIDs, prefer most recently created

        let keptProduct = group[0];
        const validUuidItems = group.filter(p => p.wirenetPackageId && UUID_REGEX.test(p.wirenetPackageId));

        if (validUuidItems.length > 0) {
            // Pick the first one (most recent due to sort)
            keptProduct = validUuidItems[0];
        } else {
            // No valid UUIDs, just keep the detailed most recent one
            keptProduct = group[0];
        }

        console.log(`   KEEPING: ID=${keptProduct.id} W_ID=${keptProduct.wirenetPackageId} Created=${keptProduct.createdAt}`);

        const idsToDelete = group
            .filter(p => p.id !== keptProduct.id)
            .map(p => p.id);

        if (idsToDelete.length > 0) {
            console.log(`   DELETING IDs: ${idsToDelete.join(', ')}`);
            await db.delete(products).where(inArray(products.id, idsToDelete));
            productsDeleted += idsToDelete.length;
        }
    }

    console.log(`\nDe-duplication Complete.`);
    console.log(`Processed ${groupsProcessed} groups with duplicates.`);
    console.log(`Deleted ${productsDeleted} duplicate products.`);
    process.exit(0);
}

run().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
