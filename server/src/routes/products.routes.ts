import { Router } from 'express';
import { db } from '../db';
import { products } from '../db/schema';
import { eq } from 'drizzle-orm';

import { getWireNetPackages } from '../services/wirenet.service';

const router = Router();

// Public: Get all active products
router.get('/', async (req, res) => {
    try {
        const allProducts = await db.select().from(products).where(eq(products.isActive, true));
        res.json(allProducts);
    } catch (error) {
        console.error("Get Products Error", error);
        res.status(500).json({ message: "Error fetching products" });
    }
});

// Admin: Get WireNet Packages

router.get('/wirenet-list', async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
        return res.status(403).json({ message: "Admin only" });
    }
    try {
        const pkgs = await getWireNetPackages();
        // console.log(`[API] Serving ${pkgs.length} packages to client`);
        res.json(pkgs);
    } catch (error) {
        res.status(500).json({ message: "Error fetching wirenet packages" });
    }
});

// Admin: Create Product (Protected)
router.post('/', async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
        return res.status(403).json({ message: "Admin only" });
    }

    const { name, serviceType, price, dataAmount, wirenetPackageId, costPrice } = req.body;
    try {
        const payload = {
            name,
            serviceType,
            price,
            dataAmount,
            costPrice: costPrice ? String(costPrice) : null,
            wirenetPackageId: wirenetPackageId ? String(wirenetPackageId) : null
        };

        let newProduct;
        if (payload.wirenetPackageId) {
            // Upsert for synced packages
            newProduct = await db.insert(products)
                .values(payload)
                .onConflictDoUpdate({
                    target: products.wirenetPackageId,
                    set: {
                        price: payload.price,
                        costPrice: payload.costPrice,
                        name: payload.name, // Update name in case it changed
                        isActive: true
                    }
                })
                .returning();
        } else {
            // Normal insert for manual packages
            newProduct = await db.insert(products).values(payload).returning();
        }

        res.json(newProduct[0]);
    } catch (error) {
        console.error("Create Product Error", error);
        res.status(500).json({ message: "Error creating product" });
    }
});

// Admin: Update Product (Protected)
router.put('/:id', async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
        return res.status(403).json({ message: "Admin only" });
    }

    const { id } = req.params;
    const { name, price, dataAmount, isActive, wirenetPackageId, costPrice } = req.body;

    try {
        const updatedProduct = await db.update(products)
            .set({
                name,
                price,
                dataAmount,
                isActive,
                costPrice: costPrice ? String(costPrice) : null,
                wirenetPackageId: wirenetPackageId ? String(wirenetPackageId) : null
            })
            .where(eq(products.id, parseInt(id)))
            .returning();

        res.json(updatedProduct[0]);
    } catch (error) {
        console.error("Update Product Error", error);
        res.status(500).json({ message: "Error updating product" });
    }
});

// Admin: Delete/Deactivate Product (Protected)
router.delete('/:id', async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
        return res.status(403).json({ message: "Admin only" });
    }

    const { id } = req.params;

    try {
        // Soft delete: just set isActive = false
        // Or hard delete if preferred. Let's do hard delete for now to clear clutter, 
        // but typically soft delete is safer.
        await db.delete(products).where(eq(products.id, parseInt(id)));
        res.json({ message: "Product deleted" });
    } catch (error) {
        console.error("Delete Product Error", error);
        res.status(500).json({ message: "Error deleting product" });
    }
});

export default router;
