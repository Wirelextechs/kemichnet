import { pgTable, serial, text, integer, timestamp, boolean, pgEnum, decimal } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['customer', 'admin']);
export const serviceTypeEnum = pgEnum('service_type', ['MTN_UP2U', 'MTN_EXPRESS', 'AT', 'TELECEL']);
export const orderStatusEnum = pgEnum('order_status', ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'FULFILLED', 'FAILED']);

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: roleEnum('role').default('customer').notNull(),
    phone: text('phone'),
    balance: decimal('balance', { precision: 10, scale: 2 }).default('0.00').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    serviceType: serviceTypeEnum('service_type').notNull(),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    costPrice: decimal('cost_price', { precision: 10, scale: 2 }), // Buying price from WireNet
    dataAmount: text('data_amount').notNull(), // e.g. "1GB"
    wirenetPackageId: text('wirenet_package_id').unique(), // ID on WireNet (UUID)
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const orders = pgTable('orders', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    serviceType: serviceTypeEnum('service_type').notNull(),
    status: orderStatusEnum('status').default('PAID').notNull(),
    paymentReference: text('payment_reference'), // Paystack ref
    supplierReference: text('supplier_reference'), // WireNet ref
    wirenetPackageId: text('wirenet_package_id'), // The package to order on WireNet
    beneficiaryPhone: text('beneficiary_phone').notNull(),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const session = pgTable('session', {
    sid: text('sid').primaryKey(),
    sess: text('sess').notNull(), // JSON data
    expire: timestamp('expire').notNull(),
});
